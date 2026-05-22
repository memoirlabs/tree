const relativeSpecifierPattern = /(?<prefix>\bfrom\s+["']|import\s*\(\s*["'])(?<specifier>\.{1,2}\/[^"']+)(?<suffix>["'])/g;

const needsExtension = (specifier: string): boolean => {
  if (specifier.endsWith(".js") || specifier.endsWith(".json") || specifier.endsWith(".css")) {
    return false;
  }
  return !specifier.split("/").at(-1)?.includes(".");
};

const dirname = (path: string) => path.split("/").slice(0, -1).join("/");

const normalizePath = (path: string) => {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join("/");
};

const jsFiles = new Set<string>();
for await (const path of new Bun.Glob("**/*.js").scan("dist")) {
  jsFiles.add(`dist/${path}`);
}

const resolveSpecifier = (filePath: string, specifier: string): string => {
  if (!needsExtension(specifier)) return specifier;

  const resolvedPath = normalizePath(`${dirname(filePath)}/${specifier}`);
  if (jsFiles.has(`${resolvedPath}.js`)) {
    return `${specifier}.js`;
  }
  if (jsFiles.has(`${resolvedPath}/index.js`)) {
    return `${specifier}/index.js`;
  }

  return `${specifier}.js`;
};

for (const filePath of jsFiles) {
  const source = await Bun.file(filePath).text();
  const rewritten = source.replace(
    relativeSpecifierPattern,
    (_match: string, prefix: string, specifier: string, suffix: string) =>
      `${prefix}${resolveSpecifier(filePath, specifier)}${suffix}`,
  );

  if (rewritten !== source) {
    await Bun.write(filePath, rewritten);
  }
}

const styles = Bun.file("src/styles.css");
if (await styles.exists()) {
  await Bun.write("dist/styles.css", styles);
}
