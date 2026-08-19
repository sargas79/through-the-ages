// Reconcile CHANGELOG.md with the tag being released.
//
// The version a release reports must come from its tag and nothing else. This
// stamps the pending section with the tag's version, refuses to run when the
// changelog names a different one, and writes that section out as the release
// notes so the published body is the changelog rather than a pointer to it.

import { readFileSync, writeFileSync } from "node:fs";

const [version, notesPath] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  throw new Error(`Expected a semver version derived from the tag, got "${version}".`);
}

const path = "CHANGELOG.md";
const date = new Date().toISOString().slice(0, 10);
const heading = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?\s*$/m;

let text = readFileSync(path, "utf8");
const first = text.match(heading);
if (!first) {
  throw new Error(`${path} has no version section to release.`);
}

if (first[1] === "Unreleased") {
  text = text.replace(first[0], `## [${version}] - ${date}`);
} else if (first[1] !== version) {
  throw new Error(
    `${path} names [${first[1]}] as the newest release, but the tag says ${version}. ` +
      `Rename that section to [${version}], or tag v${first[1]} instead.`,
  );
}

const link = `[${version}]: https://github.com/${process.env.GITHUB_REPOSITORY}/releases/tag/v${version}`;
if (!text.includes(`\n[${version}]: `)) {
  const refs = text.search(/^\[\d+\.\d+\.\d+\]: /m);
  text = refs === -1 ? `${text.trimEnd()}\n\n${link}\n` : text.slice(0, refs) + link + "\n" + text.slice(refs);
}

writeFileSync(path, text);

// Everything under this release's heading, up to the next one.
const body = text.slice(text.indexOf(`## [${version}]`));
const next = body.slice(1).search(/^## \[/m);
const section = (next === -1 ? body : body.slice(0, next + 1))
  .replace(heading, "")
  .split(/^\[\d+\.\d+\.\d+\]: /m)[0]
  .trim();

writeFileSync(notesPath, `${section}\n`);
console.log(`Released ${version}, notes ${section.length} chars.`);
