const relativeSpecifierPattern = /(?<prefix>\bfrom\s+["']|import\s*\(\s*["'])(?<specifier>\.{1,2}\/[^"']+)(?<suffix>["'])/g;

const needsExtension = (specifier: string): boolean => {
  if (specifier.endsWith(".js") || specifier.endsWith(".json") || specifier.endsWith(".css")) {
    return false;
  }
  return !specifier.split("/").at(-1)?.includes(".");
};

for await (const path of new Bun.Glob("**/*.js").scan("dist")) {
  const filePath = `dist/${path}`;
  const source = await Bun.file(filePath).text();
  const rewritten = source.replace(
    relativeSpecifierPattern,
    (_match: string, prefix: string, specifier: string, suffix: string) =>
      needsExtension(specifier) ? `${prefix}${specifier}.js${suffix}` : `${prefix}${specifier}${suffix}`,
  );

  if (rewritten !== source) {
    await Bun.write(filePath, rewritten);
  }
}

const styles = Bun.file("src/styles.css");
if (await styles.exists()) {
  await Bun.write("dist/styles.css", styles);
}
