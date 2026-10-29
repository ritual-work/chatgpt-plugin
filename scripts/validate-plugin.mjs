#!/usr/bin/env node
/**
 * validate-plugin — what CI can verify about this marketplace without the
 * source repository: the manifests parse and agree, the skill carries the
 * stamp recorded beside it, and everything an install copies is present.
 *
 *   node scripts/validate-plugin.mjs        (exits 1 on any failure)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const check = (ok, msg) => {
  if (!ok) errors.push(msg);
};
const json = (rel) => {
  try {
    return JSON.parse(readFileSync(join(REPO, rel), "utf8"));
  } catch (err) {
    errors.push(`${rel}: ${err.message}`);
    return null;
  }
};

const marketplace = json(".agents/plugins/marketplace.json");
const plugin = json("plugins/ritual/.codex-plugin/plugin.json");
const stamp = json("plugins/ritual/.skill-stamp.json");

if (marketplace && plugin) {
  const entry = (marketplace.plugins ?? []).find((p) => p.name === plugin.name);
  check(entry, `marketplace.json lists no plugin named ${plugin.name}`);
  check(
    entry && resolve(REPO, entry.source?.path ?? "") === join(REPO, "plugins", "ritual"),
    "marketplace entry's source.path does not point at plugins/ritual",
  );
  check(/^\d+\.\d+\.\d+$/.test(plugin.version ?? ""), `plugin.json version "${plugin.version}" is not semver`);
  for (const key of ["logo", "composerIcon"]) {
    const p = plugin.interface?.[key];
    check(!p || existsSync(join(REPO, "plugins", "ritual", p)), `plugin.json interface.${key} names missing ${p}`);
  }
}

const skills = join(REPO, "plugins", "ritual", "skills");
const skillMd = join(skills, "ritual", "SKILL.md");
if (!existsSync(skillMd)) {
  errors.push("plugins/ritual/skills/ritual/SKILL.md is missing");
} else {
  const md = readFileSync(skillMd, "utf8");
  check(/^name: ritual-build$/m.test(md), "SKILL.md frontmatter is not `name: ritual-build`");
  check(/^channel: chatgpt-plugin$/m.test(md), "SKILL.md frontmatter is not `channel: chatgpt-plugin`");
  const fmStamp = /^stamp: (\S+)$/m.exec(md)?.[1];
  check(stamp && fmStamp === stamp.stamp, `SKILL.md stamp ${fmStamp} differs from .skill-stamp.json ${stamp?.stamp}`);
  check(stamp?.channel === "chatgpt-plugin", ".skill-stamp.json channel is not chatgpt-plugin");

  // Every reference the dispatcher tells the agent to read must have shipped.
  for (const [, ref] of md.matchAll(/`(references\/[\w./-]+\.md)`/g)) {
    check(existsSync(join(skills, "ritual", ref)), `SKILL.md names ${ref}, which did not ship`);
  }

  const dispatch = readdirSync(skills).filter((d) => d.startsWith("ritual-"));
  for (const sub of ["context-pulse", "lineage", "lite", "resume", "status"]) {
    check(dispatch.includes(`ritual-${sub}`), `dispatch skill ritual-${sub} is missing`);
  }
  for (const d of dispatch) {
    const body = existsSync(join(skills, d, "SKILL.md")) ? readFileSync(join(skills, d, "SKILL.md"), "utf8") : "";
    check(new RegExp(`^name: ${d}$`, "m").test(body), `${d}/SKILL.md is missing or misnamed`);
    check(body.includes("`ritual-build`"), `${d}/SKILL.md does not dispatch into ritual-build`);
  }
  const stray = readdirSync(skills).filter((d) => d !== "ritual" && !d.startsWith("ritual-"));
  check(!stray.length, `unexpected skill folders (Codex loads every one): ${stray.join(", ")}`);
}

for (const f of ["plugins/ritual/SETUP.md", "plugins/ritual/README.md", "README.md", "LICENSE"]) {
  check(existsSync(join(REPO, f)), `${f} is missing`);
}

if (errors.length) {
  console.error(`✗ plugin validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ ritual ${plugin.version}: manifests agree, skill stamp ${stamp.stamp}, shipped surface complete`);
