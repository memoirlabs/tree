import { basename } from "node:path";

type ReleaseSection = "features" | "fixes" | "documentation" | "maintenance" | "other";

interface ReleaseConfig {
  title: string;
  outputPath: string;
  tagPrefix: string;
  includeMergeCommits: boolean;
  topMessage: string;
  sections: Record<ReleaseSection, string>;
}

interface Commit {
  hash: string;
  subject: string;
  author: string;
  date: string;
}

const defaultConfig: ReleaseConfig = {
  title: "Release Announcement",
  outputPath: "RELEASE_ANNOUNCEMENT.md",
  tagPrefix: "v",
  includeMergeCommits: true,
  topMessage: "",
  sections: {
    features: "Features",
    fixes: "Fixes",
    documentation: "Documentation",
    maintenance: "Maintenance",
    other: "Other Changes",
  },
};

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex !== -1) {
    return process.argv[exactIndex + 1];
  }
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function readConfig(): Promise<ReleaseConfig> {
  const configPath = readArg("config") ?? "release.config.json";
  const file = Bun.file(configPath);
  if (!(await file.exists())) {
    return defaultConfig;
  }

  const parsed = (await file.json()) as Partial<ReleaseConfig>;
  return {
    ...defaultConfig,
    ...parsed,
    sections: {
      ...defaultConfig.sections,
      ...parsed.sections,
    },
  };
}

async function git(args: string[], allowFailure = false): Promise<string> {
  const proc = Bun.spawn(["git", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(" ")} failed:\n${stderr.trim()}`);
  }

  return stdout.trim();
}

async function getLatestTag(): Promise<string | undefined> {
  const explicitBase = readArg("base");
  if (explicitBase) {
    return explicitBase;
  }

  const latestTag = await git(["describe", "--tags", "--abbrev=0"], true);
  return latestTag || undefined;
}

async function getCommits(baseTag: string | undefined, includeMergeCommits: boolean): Promise<Commit[]> {
  const range = baseTag ? `${baseTag}..HEAD` : "HEAD";
  const args = ["log", range, "--date=short", "--format=%H%x1f%s%x1f%an%x1f%ad"];
  if (!includeMergeCommits) {
    args.splice(2, 0, "--no-merges");
  }

  const output = await git(args);
  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => {
      const [hash = "", subject = "", author = "", date = ""] = line.split("\u001f");
      return { hash, subject, author, date };
    })
    .filter((commit) => commit.hash && commit.subject);
}

function getRepoSlug(): string | undefined {
  const repository = process.env.GITHUB_REPOSITORY;
  if (repository) {
    return repository;
  }

  return undefined;
}

async function getRepositoryUrl(): Promise<string | undefined> {
  const slug = getRepoSlug();
  if (slug) {
    return `https://github.com/${slug}`;
  }

  const origin = await git(["remote", "get-url", "origin"], true);
  if (!origin) {
    return undefined;
  }

  if (origin.startsWith("git@github.com:")) {
    return `https://github.com/${origin.replace("git@github.com:", "").replace(/\.git$/, "")}`;
  }

  if (origin.startsWith("https://github.com/")) {
    return origin.replace(/\.git$/, "");
  }

  return undefined;
}

async function readPackageVersion(): Promise<string> {
  const versionArg = readArg("version");
  if (versionArg) {
    return versionArg;
  }

  const packageJson = Bun.file("package.json");
  if (!(await packageJson.exists())) {
    return "unreleased";
  }

  const parsed = (await packageJson.json()) as { version?: string };
  return parsed.version ?? "unreleased";
}

function sectionForCommit(subject: string): ReleaseSection {
  const normalized = subject.toLowerCase();
  if (normalized.startsWith("feat") || normalized.includes(" feature")) {
    return "features";
  }
  if (normalized.startsWith("fix") || normalized.includes(" bug")) {
    return "fixes";
  }
  if (normalized.startsWith("docs") || normalized.includes("readme") || normalized.includes("doc")) {
    return "documentation";
  }
  if (
    normalized.startsWith("chore") ||
    normalized.startsWith("ci") ||
    normalized.startsWith("build") ||
    normalized.startsWith("test") ||
    normalized.startsWith("refactor")
  ) {
    return "maintenance";
  }
  return "other";
}

function formatCommit(commit: Commit, repositoryUrl: string | undefined): string {
  const shortHash = commit.hash.slice(0, 7);
  const hash = repositoryUrl ? `[\`${shortHash}\`](${repositoryUrl}/commit/${commit.hash})` : `\`${shortHash}\``;
  return `- ${commit.subject} (${hash}, ${commit.author}, ${commit.date})`;
}

function formatCompare(baseTag: string | undefined, repositoryUrl: string | undefined): string {
  if (!baseTag || !repositoryUrl) {
    return "";
  }

  return `\nCompare changes: [${baseTag}...HEAD](${repositoryUrl}/compare/${baseTag}...HEAD)\n`;
}

async function main() {
  const config = await readConfig();
  const version = await readPackageVersion();
  const baseTag = await getLatestTag();
  const commits = await getCommits(baseTag, config.includeMergeCommits);
  const repositoryUrl = await getRepositoryUrl();
  const message = readArg("message") ?? process.env.RELEASE_TOP_MESSAGE ?? config.topMessage;
  const date = new Date().toISOString().slice(0, 10);

  const grouped = commits.reduce<Record<ReleaseSection, Commit[]>>(
    (accumulator, commit) => {
      accumulator[sectionForCommit(commit.subject)].push(commit);
      return accumulator;
    },
    {
      features: [],
      fixes: [],
      documentation: [],
      maintenance: [],
      other: [],
    },
  );

  const lines = [
    `# ${config.title} ${config.tagPrefix}${version}`,
    "",
    message ? `${message}\n` : "",
    `Generated on ${date}.`,
    baseTag ? `Includes commits after \`${baseTag}\`.` : "Includes all commits because no previous git tag was found.",
    formatCompare(baseTag, repositoryUrl),
    `Total commits: ${commits.length}`,
    "",
  ].filter(Boolean);

  for (const key of ["features", "fixes", "documentation", "maintenance", "other"] as const) {
    const sectionCommits = grouped[key];
    if (sectionCommits.length === 0) {
      continue;
    }

    lines.push(`## ${config.sections[key]}`, "", ...sectionCommits.map((commit) => formatCommit(commit, repositoryUrl)), "");
  }

  if (commits.length === 0) {
    lines.push("No commits found after the latest release tag.", "");
  }

  await Bun.write(config.outputPath, `${lines.join("\n").trim()}\n`);
  console.log(`Wrote ${basename(config.outputPath)} with ${commits.length} commits.`);
}

await main();
