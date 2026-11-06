import test from "node:test";
import assert from "node:assert/strict";
import { loadCanonicalForms } from "../build-chain/compoundLexicon";
import { readMisspellingsFile } from "../build-chain/misspellings";
import { CANONICAL_FORMS } from "../src/compounds";
import { withConfig } from "./helpers/config";

/**
 * `misspellings.yaml`: that each misspelling is read as its word, beside the compounds, and that a
 * malformed one stops the build.
 */

// `goodnight` once, `good night` twice: the rule splits it.
const COMICS = `strips:
  "20000101": Say goodnight, Hazel.
  "20000102": Good night, Marlow.
  "20000103": Good night, Mom.
`;

/** A project importing this archive and this `misspellings.yaml` — or, for `null`, with the misspellings off. */
function withProject<T>(misspellings: string | null, run: (config: string) => T, compounds = "false"): T {
	const files: Record<string, string> = { "comics.yaml": COMICS, "compounds.yaml": compounds };
	if (misspellings !== null) files["misspellings.yaml"] = misspellings;
	const part = misspellings === null ? "false" : "!Import ./misspellings.yaml";
	const compoundsPart = compounds === "false" ? "false" : "!Import ./compounds.yaml";
	return withConfig(`comics: !Import ./comics.yaml\ncompounds: ${compoundsPart}\nmisspellings: ${part}\n`, run, files);
}

const forms = (config: string) => new Map(loadCanonicalForms(config));

test("with the misspellings off, the canonical forms are the compounds alone", () => {
	withProject(null, (config) => assert.deepEqual([...forms(config)], [["goodnight", ["good", "night"]]]));
});

test("a misspellings.yaml with nothing in it is the same as the misspellings off", () => {
	withProject("# Nothing yet.\n", (config) => assert.deepEqual([...forms(config)], [["goodnight", ["good", "night"]]]));
});

test("each misspelling is read as its word", () => {
	withProject("hazel: [suzie, suzy]\n", (config) => {
		assert.deepEqual(forms(config).get("suzie"), ["hazel"]);
		assert.deepEqual(forms(config).get("suzy"), ["hazel"]);
		assert.equal(forms(config).has("hazel"), false);
	});
});

test("a misspelled compound is read as the compound's parts", () => {
	withProject("goodnight: [goodnite]\n", (config) =>
		assert.deepEqual(forms(config).get("goodnite"), ["good", "night"]),
	);
});

test("a compound's misspelled part is corrected", () => {
	withProject(
		"night: [nite]\n",
		(config) => assert.deepEqual(forms(config).get("goodnite"), ["good", "night"]),
		"compounds:\n  closed:\n    goodnite: good nite\n",
	);
});

test("a malformed misspellings.yaml stops the build", () => {
	const rejects = (contents: string, message: RegExp) =>
		withProject(contents, (config) => assert.throws(() => readMisspellingsFile(config), message));

	rejects("- suzie\n", /must map each word/);
	rejects("hazel: suzie\n", /must be a list/);
	rejects("Hazel: [suzie]\n", /not one lowercase word/);
	rejects("hazel: [Suzie]\n", /not one lowercase word/);
	rejects("hazel: [suzie perkins]\n", /not one lowercase word/);
	rejects("hazel: [hazel]\n", /the word itself/);
	rejects("hazel: [suzie]\nsuzie: [suzy]\n", /as a word and a misspelling/);
	rejects("hazel: [suzie]\nsuzanne: [suzie]\n", /more than once/);
});

test("this archive reads its misspellings as their words", () => {
	assert.deepEqual(CANONICAL_FORMS.get("marlowe"), ["marlow"]);
	assert.deepEqual(CANONICAL_FORMS.get("colour"), ["color"]);
});
