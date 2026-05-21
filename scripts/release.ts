interface PackageJson {
  name?: string;
  version?: string;
}

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex !== -1) {
    return process.argv[exactIndex + 1];
  }
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function run(command: string[], options: { dryRun?: boolean } = {}) {
  console.log(`$ ${command.join(" ")}`);
  if (options.dryRun) {
    return;
  }

  const proc = Bun.spawn(command, {
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

async function read(command: string[], allowFailure = false): Promise<string> {
  const proc = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0 && !allowFailure) {
    throw new Error(`${command.join(" ")} failed:\n${stderr.trim()}`);
  }

  return stdout.trim();
}

async function assertCleanWorktree() {
  if (hasArg("allow-dirty")) {
    return;
  }

  const status = await read(["git", "status", "--porcelain"]);
  if (status) {
    console.error("Release aborted: the git working tree is not clean.");
    console.error("Commit or stash changes first, or pass --allow-dirty if you intentionally want to release from a dirty tree.");
    process.exit(1);
  }
}

async function assertTagDoesNotExist(tag: string) {
  const localTag = await read(["git", "rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], true);
  if (localTag) {
    console.error(`Release aborted: local tag ${tag} already exists.`);
    process.exit(1);
  }

  const remoteTag = await read(["git", "ls-remote", "--tags", "origin", tag], true);
  if (remoteTag) {
    console.error(`Release aborted: remote tag ${tag} already exists.`);
    process.exit(1);
  }
}

async function assertGhIsAvailable() {
  if (hasArg("skip-github")) {
    return;
  }

  await read(["gh", "--version"]);
  await read(["gh", "auth", "status"]);
}

async function main() {
  const packageJson = (await Bun.file("package.json").json()) as PackageJson;
  const packageName = packageJson.name ?? "package";
  const version = readArg("version") ?? packageJson.version;
  if (!version) {
    console.error("Release aborted: package.json is missing a version.");
    process.exit(1);
  }

  const tag = readArg("tag") ?? `v${version}`;
  const message = readArg("message");
  const base = readArg("base");
  const dryRun = hasArg("dry-run");
  const skipNpm = hasArg("skip-npm");
  const skipGithub = hasArg("skip-github");

  console.log(`Preparing ${packageName} ${tag}${dryRun ? " (dry run)" : ""}`);

  await assertCleanWorktree();
  await assertTagDoesNotExist(tag);
  await assertGhIsAvailable();

  await run(["bun", "run", "check"]);

  const announcementArgs = ["bun", "run", "release:announcement", "--", "--version", version];
  if (message) {
    announcementArgs.push("--message", message);
  }
  if (base) {
    announcementArgs.push("--base", base);
  }
  await run(announcementArgs);

  if (dryRun) {
    await run(["bun", "run", "npm:pack"]);
    console.log("Dry run complete. No npm publish, git tag, tag push, or GitHub Release was created.");
    return;
  }

  if (!skipNpm) {
    await run(["bun", "run", "npm:publish"]);
  }

  await run(["git", "tag", "-a", tag, "-F", "RELEASE_ANNOUNCEMENT.md"]);
  await run(["git", "push", "origin", tag]);

  if (!skipGithub) {
    await run([
      "gh",
      "release",
      "create",
      tag,
      "--title",
      `${packageName} ${tag}`,
      "--notes-file",
      "RELEASE_ANNOUNCEMENT.md",
    ]);
  }

  console.log(`Released ${packageName} ${tag}.`);
}

await main();
