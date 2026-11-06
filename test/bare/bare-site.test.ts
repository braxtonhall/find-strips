import test from "node:test";
import assert from "node:assert/strict";
import { helpAnchor, helpSections, runs } from "../../src/help";
import { STRIP_QUERY } from "../../src/filter-query";
import { buildViewHtml } from "../../src/pages/shell";

/**
 * A site that has none of the optional parts (arcs, characters, creators, subjects), which the
 * engine's stub archive is: what it does not have, the help page does not explain and the search does
 * not read. The demo has all of them, so its tests are in `test/demo/`.
 */

const ids = () => helpSections().flatMap((section) => section.entries.map((entry) => entry.id));

test("a site with none of the optional parts", async (suite) => {
	await suite.test("leaves out the filters of what it does not have", () => {
		for (const id of ["strips-by", "strips-about", "strips-featuring"]) assert.ok(!ids().includes(id), id);
		assert.ok(!runs("@about:kite", STRIP_QUERY));
		assert.ok(!runs("@about (@id:kite)", STRIP_QUERY));
		assert.ok(!runs("@featuring:wren", STRIP_QUERY));
	});

	await suite.test("sends a filter it does not have to the language's section", () => {
		assert.equal(helpAnchor("strip", "about"), "strips");
	});

	await suite.test("draws a help page without them", () => {
		const view = buildViewHtml({ view: "help" }, false);
		assert.match(view, /id="strips-in"/);
		assert.doesNotMatch(view, /id="strips-by"/);
		assert.doesNotMatch(view, /id="strips-about"/);
		assert.doesNotMatch(view, />@about</);
	});
});
