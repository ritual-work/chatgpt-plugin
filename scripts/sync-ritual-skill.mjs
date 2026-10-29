#!/usr/bin/env node
/**
 * sync-ritual-skill — pull the ChatGPT / Codex flavor of the Ritual skill from
 * a checkout of Ritual's source repository into plugins/ritual/skills/.
 *
 * Same pipeline as the Claude Code plugin's sync, adapted to this layout:
 *
 * BUILDS FRESH upstream (the agent-skill bundler's `chatgpt` adapter) rather
 * than copying a committed build artifact, which lags its source. The adapter
 * owns every format difference for this channel: the public scrub, the
 * standard Agent Skills frontmatter, bare tool names (Codex and the ChatGPT
 * app present Ritual's tools without the `mcp__ritual__` prefix), the
 * `ritual-build` skill name, and the `channel: chatgpt-plugin` stamp the
 * server's ping handshake uses to pick the right stale-skill remedy.
 *
 * SLASH COMMANDS ARE SKILLS HERE. Codex builds its slash menu from skills and
 * does not present a plugin's commands/ directory, so each subcommand ships as
 * a thin `ritual-<sub>` skill that dispatches into `ritual-build`.
 *
 * ALLOWLIST copy, not whole-dir: only what the agent reads at runtime crosses
 * over. The whole skills/ directory is replaced, so a subcommand dropped
 * upstream disappears here too instead of lingering looking installed.
 *
 * The leak scanner the release pipeline runs is vendored alongside, so this
 * repo's CI checks pull requests with the same rules.
 *
 *   node scripts/sync-ritual-skill.mjs [path-to-source-checkout] [--allow-branch]
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const upstream = resolve(
  process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(REPO, "..", "ritual-enterprise"),
);
const builder = join(upstream, "apps", "mcp", "scripts", "build-agent-skills.mjs");
if (!existsSync(builder)) {
  console.error(`✗ no agent-skill bundler at ${builder}`);
  console.error("  usage: node scripts/sync-ritual-skill.mjs <path-to-source-checkout>");
  process.exit(1);
}

/*
 * WHICH upstream commit, not just which directory. The stamp hashes the skill
 * SOURCE, so it cannot tell you the checkout was parked on an unmerged feature
 * branch. Name the branch, and refuse anything but an integration branch unless
 * the caller insists.
 */
const gitIn = (a) => execFileSync("git", a, { cwd: upstream, encoding: "utf8" }).trim();
const upstreamBranch = gitIn(["rev-parse", "--abbrev-ref", "HEAD"]);
const upstreamSha = gitIn(["rev-parse", "--short", "HEAD"]);
if (!["dev", "main"].includes(upstreamBranch) && !process.argv.includes("--allow-branch")) {
  console.error(`✗ upstream ${upstream} is on '${upstreamBranch}', not dev/main`);
  console.error("  syncing from a feature branch ships unreviewed skill changes.");
  console.error("  pass --allow-branch if that is genuinely what you want.");
  process.exit(1);
}

console.log(`▶ building the chatgpt bundle upstream (${upstreamBranch} @ ${upstreamSha})…`);
execFileSync("node", [builder], { cwd: upstream, stdio: "ignore" });

const agentDir = join(upstream, "dist", "agent-skills", "skills", "chatgpt");
const src = join(agentDir, "ritual");
if (!existsSync(join(src, "SKILL.md"))) {
  console.error(`✗ upstream produced no chatgpt bundle at ${src}`);
  process.exit(1);
}
const dispatch = readdirSync(agentDir).filter((d) => d.startsWith("ritual-"));
if (!dispatch.length) {
  /* Loud, not silent: without these the plugin installs with a single slash
     entry, which looks like a healthy build. */
  console.error(`✗ upstream produced no ritual-* dispatch skills in ${agentDir}`);
  process.exit(1);
}

const fm = readFileSync(join(src, "SKILL.md"), "utf8");
for (const [re, what] of [
  [/^name: ritual-build$/m, "`name: ritual-build`"],
  [/^channel: chatgpt-plugin$/m, "`channel: chatgpt-plugin`"],
  [/^stamp: \S+$/m, "a `stamp:`"],
]) {
  if (!re.test(fm)) {
    console.error(`✗ upstream chatgpt bundle carries no ${what} frontmatter — sync a newer source`);
    process.exit(1);
  }
}

// Only what the agent reads at runtime.
const SHIP = { ritual: ["SKILL.md", "references"], dispatch: ["SKILL.md"] };

const skillsOut = join(REPO, "plugins", "ritual", "skills");
rmSync(skillsOut, { recursive: true, force: true });
const copy = (from, entries, to) => {
  mkdirSync(to, { recursive: true });
  for (const entry of entries) {
    if (!existsSync(join(from, entry))) {
      console.error(`✗ expected bundle entry missing: ${join(from, entry)}`);
      process.exit(1);
    }
    cpSync(join(from, entry), join(to, entry), { recursive: true });
  }
};
copy(src, SHIP.ritual, join(skillsOut, "ritual"));
for (const d of dispatch) copy(join(agentDir, d), SHIP.dispatch, join(skillsOut, d));
// cpSync copies dotfiles inside references/ too — drop Finder junk.
execFileSync("find", [skillsOut, "-name", ".DS_Store", "-delete"]);

// Absent from older source revisions; the vendored copy stays until one has it.
const scanner = join(upstream, "scripts", "check-public-artifact-leaks.mjs");
if (existsSync(scanner)) {
  copyFileSync(scanner, join(REPO, "scripts", "check-public-artifact-leaks.mjs"));
} else {
  console.warn("! upstream has no leak scanner at this revision — keeping the vendored copy");
}

const stamp = /^stamp: (\S+)$/m.exec(fm)[1];
writeFileSync(
  join(REPO, "plugins", "ritual", ".skill-stamp.json"),
  // The stamp hashes the skill source; upstreamBranch/Sha say which commit the
  // adapter and the subcommand list came from, which the stamp cannot.
  JSON.stringify({ stamp, channel: "chatgpt-plugin", upstreamBranch, upstreamSha }, null, 2) + "\n",
);
console.log(`✓ plugins/ritual/skills/ritual (stamp ${stamp}, channel chatgpt-plugin)`);
console.log(`✓ plugins/ritual/skills — ${dispatch.length} dispatch skills: ${dispatch.join(", ")}`);
console.log("  next: npm run check, bump plugins/ritual/.codex-plugin/plugin.json on content change, commit.");
