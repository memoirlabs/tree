import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

type CommandName = "whoami" | "pack" | "publish";

const command = process.argv[2] as CommandName | undefined;

if (command !== "whoami" && command !== "pack" && command !== "publish") {
  console.error("Usage: bun scripts/npm-registry.ts <whoami|pack|publish>");
  process.exit(1);
}

const token = process.env.NPM_ACCESS_TOKEN ?? process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN;

if (!token) {
  console.error("Missing npm token. Set NPM_ACCESS_TOKEN in .env or export NPM_TOKEN/NODE_AUTH_TOKEN.");
  process.exit(1);
}

const registry = "https://registry.npmjs.org/";
const tempDir = await mkdtemp(join(tmpdir(), "memoir-tree-npm-"));
const userConfigPath = join(tempDir, ".npmrc");

await Bun.write(
  userConfigPath,
  `registry=${registry}
//registry.npmjs.org/:_authToken=${token}
access=public
`,
);

const env: Record<string, string | undefined> = {
  ...process.env,
  NPM_ACCESS_TOKEN: token,
  NPM_TOKEN: token,
  NODE_AUTH_TOKEN: token,
  NPM_CONFIG_USERCONFIG: userConfigPath,
  NPM_CONFIG_REGISTRY: registry,
};

async function run(args: string[]) {
  console.log(`$ ${args.join(" ")}`);
  const proc = Bun.spawn(args, {
    cwd: process.cwd(),
    env,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

try {
  if (command === "whoami") {
    await run(["bunx", "npm", "whoami", "--registry", registry, "--userconfig", userConfigPath]);
  } else if (command === "pack") {
    await run(["bun", "publish", "--dry-run"]);
  } else {
    await run([
      "bunx",
      "npm",
      "publish",
      "--access",
      "public",
      "--registry",
      registry,
      "--userconfig",
      userConfigPath,
    ]);
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
