#!/usr/bin/env node
// Lints SKILL.md files for problems `claude plugin validate` doesn't catch.
// Usage: node tools/lint-skills.mjs [SKILL.md ...]   (no arguments = every plugins/*/skills/*/SKILL.md)
// Exit code 1 if any file fails.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

const checks = [
  // Claude Code replaces `$` + digit, `$ARGUMENTS` or a declared name with the invocation's arguments.
  [/(?<!\\)\$(\d|ARGUMENTS)/, "argument placeholder ($N / $ARGUMENTS); write the text without `$` or escape it as \\$"],
  [/Claude 3(\.\d)?\b|Sonnet 3\.[57]|Haiku 3\.5|Opus 3\b/, "retired Claude model name"],
];

function defaultFiles() {
  const files = [];
  if (!existsSync("plugins")) return files;
  for (const plugin of readdirSync("plugins")) {
    const skillsDir = join("plugins", plugin, "skills");
    if (!existsSync(skillsDir)) continue;
    for (const skill of readdirSync(skillsDir)) {
      const file = join(skillsDir, skill, "SKILL.md");
      if (existsSync(file)) files.push(file);
    }
  }
  return files;
}

const files = process.argv.length > 2 ? process.argv.slice(2) : defaultFiles();
if (files.length === 0) {
  console.error("No SKILL.md files found. Run from the repository root or pass the files.");
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const problems = [];
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(file));
  } catch {
    problems.push("not valid UTF-8");
  }
  if (text.charCodeAt(0) === 0xfeff) problems.push("starts with a BOM");

  const lines = text.split(/\r?\n/);
  const end = lines.indexOf("---", 1);
  if (lines[0] !== "---" || end < 0) problems.push("missing or unclosed frontmatter");
  const keys = {};
  for (const line of end > 0 ? lines.slice(1, end) : []) {
    const m = line.match(/^([a-z][a-z-]*): (.*)$/);
    if (!m) { problems.push(`bad frontmatter line: ${line}`); continue; }
    const [, key, value] = m;
    const quoted = /^".*"$|^'.*'$/.test(value);
    // An unquoted YAML value can't contain ": " or " #".
    if (!quoted && (value.includes(": ") || value.includes(" #"))) problems.push(`unquoted "${key}" contains ": " or " #"`);
    keys[key] = value;
  }
  if (!keys.name) problems.push("missing name");
  if (!keys.description) problems.push("missing description");
  const folder = basename(dirname(file));
  if (keys.name && keys.name !== folder) problems.push(`name "${keys.name}" differs from folder "${folder}"`);

  const fences = lines.filter((l) => /^\s*```/.test(l)).length;
  if (fences % 2) problems.push(`odd number of code fences (${fences})`);
  for (const [re, message] of checks) {
    const line = lines.findIndex((l) => re.test(l));
    if (line >= 0) problems.push(`line ${line + 1}: ${message}`);
  }

  console.log(`${problems.length ? "FAIL" : "ok  "} ${file}`);
  for (const p of problems) console.log(`     - ${p}`);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
