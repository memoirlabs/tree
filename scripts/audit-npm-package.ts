type PackedFile = {
  path: string;
};

type PackResult = {
  files?: PackedFile[];
};

const registry = "https://registry.npmjs.org/";
const forbiddenPathPatterns = [
  /^\.env(?:\.|$)/,
  /^\.npmrc$/,
  /^\.github\//,
  /^\.cursor\//,
  /^\.agents\//,
  /^public\//,
  /^scripts\//,
  /^site\//,
  /^src\//,
  /^tests\//,
  /^RELEASE_ANNOUNCEMENT\.md$/,
  /^release\.config\.json$/,
  /^.*\.map$/,
];

const secretPatterns = [
  /NPM_ACCESS_TOKEN/,
  /NPM_TOKEN/,
  /NODE_AUTH_TOKEN/,
  /_authToken/,
  /(^|\n)\s*\/\/registry\.npmjs\.org\/:_authToken/,
  /npm_[A-Za-z0-9]{20,}/,
  /BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/,
  /\bapi[_-]?key\b\s*[:=]/i,
  /\bsecret\b\s*[:=]/i,
  /\bpassword\b\s*[:=]/i,
];

const textFilePattern = /\.(?:css|d\.ts|js|json|md|ts|tsx)$/;
const requiredPackagePaths = ["dist/index.js", "dist/index.d.ts", "dist/styles.css", "README.md", "LICENSE"];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function packDryRun() {
  const proc = Bun.spawn(["bunx", "npm", "pack", "--dry-run", "--json", "--registry", registry], {
    env: {
      ...process.env,
      NPM_ACCESS_TOKEN: undefined,
      NPM_TOKEN: undefined,
      NODE_AUTH_TOKEN: undefined,
      NPM_CONFIG_USERCONFIG: undefined,
      NPM_CONFIG_REGISTRY: registry,
    },
    stdout: "pipe",
    stderr: "inherit",
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  const parsed = JSON.parse(output) as PackResult[];
  return parsed[0]?.files ?? [];
}

const files = await packDryRun();
const paths = files.map((file) => file.path);
const pathSet = new Set(paths);
const missingRequiredPaths = requiredPackagePaths.filter((path) => !pathSet.has(path));
if (missingRequiredPaths.length > 0) {
  fail(`npm package is missing required files:\n${missingRequiredPaths.map((path) => `- ${path}`).join("\n")}`);
}

const forbiddenPaths = paths.filter((path) => forbiddenPathPatterns.some((pattern) => pattern.test(path)));

if (forbiddenPaths.length > 0) {
  fail(`npm package contains forbidden files:\n${forbiddenPaths.map((path) => `- ${path}`).join("\n")}`);
}

for (const path of paths) {
  if (!textFilePattern.test(path)) {
    continue;
  }

  const contents = await Bun.file(path).text();
  const matchedPattern = secretPatterns.find((pattern) => pattern.test(contents));
  if (matchedPattern) {
    fail(`npm package file "${path}" matched forbidden secret pattern: ${matchedPattern}`);
  }
}

console.log(`npm package audit passed (${paths.length} files).`);
