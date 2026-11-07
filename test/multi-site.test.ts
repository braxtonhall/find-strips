import { test } from "node:test";
import assert from "node:assert/strict";
import path from "path";

// Imported before any site is loaded, and with no `SITE_CONFIG` set: it must not need one.
import { createSearch } from "../api/search";
import { loadSite } from "../api/site";

const DEMO = path.join(__dirname, "..", "demo", "config.yaml");

test("importing the search needs no configuration, and a process holds several sites", () => {
	const saved = process.env.SITE_CONFIG;
	delete process.env.SITE_CONFIG;
	try {
		const first = loadSite(DEMO);
		const second = loadSite(DEMO);
		const a = createSearch(first);
		const b = createSearch({ ...second, comics: second.comics.slice(0, 1) });
		assert.ok(a.search("a").length >= b.search("a").length);
		assert.notEqual(a.parseQuery, b.parseQuery);
		assert.equal(process.env.SITE_CONFIG, undefined);
	} finally {
		if (saved !== undefined) process.env.SITE_CONFIG = saved;
	}
});
