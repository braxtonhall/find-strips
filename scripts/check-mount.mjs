// Checks a built site against the URL it was built for: no CNAME where the URL has a path, and every
// root-relative link on every page starting with that path.
//
//   node scripts/check-mount.mjs dist https://example.com/find-strips/
import fs from "node:fs";
import path from "node:path";

const [dir, url] = process.argv.slice(2);
if (!dir || !url) {
	console.error("usage: check-mount.mjs <dir> <site url>");
	process.exit(2);
}
const base = new URL(url).pathname.replace(/\/?$/, "/");
const problems = [];

if (base !== "/" && fs.existsSync(path.join(dir, "CNAME")))
	problems.push("CNAME exists for a site mounted below the root");

let links = 0;
for (const name of fs.readdirSync(dir, { recursive: true, encoding: "utf8" })) {
	if (!name.endsWith(".html")) continue;
	const html = fs.readFileSync(path.join(dir, name), "utf8");
	for (const [, link] of html.matchAll(/\s(?:href|src)="(\/[^"/][^"]*|\/)"/g)) {
		links++;
		if (!link.startsWith(base)) problems.push(`${name}: ${link} does not start with ${base}`);
	}
}

if (problems.length) {
	console.error(problems.slice(0, 20).join("\n"));
	process.exit(1);
}
console.log(`ok: ${links} links under ${base}`);
