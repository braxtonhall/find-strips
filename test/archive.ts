/**
 * The archives the engine's tests run against, written to the temp folder and reused, since every test
 * file loads one. See `setup.ts` and `setup-bare.ts`, which point `SITE_CONFIG` at them.
 *
 * Both have the shape of a long-running strip, which the date, completion and suggestion tests lean
 * on: a strip on every day from the start to the end of 1995, but for two stretches where the strip took
 * time off and the paper ran old strips again.
 *
 * - `full` is the demo (`demo/`) with filler strips on the days around its own, so every part of the
 *   engine has something to work on.
 * - `bare` is the filler alone, with none of the optional parts, for the tests of a site without them.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { ENGINE_TUNING } from "./helpers/engine-tuning";
import { SAMPLE_THEME } from "./helpers/config";

const START = "1985-11-18";
const END = "1995-12-31";
/** Stretches of days with no new strip, both ends in. */
const BREAKS: [string, string][] = [
	["1991-05-05", "1992-02-01"],
	["1994-04-03", "1994-12-31"],
];
const DEMO = path.join(__dirname, "..", "demo");

const compact = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** The dates a demo file keys its entries by, as `"YYYYMMDD":`. */
function keys(file: string): Set<string> {
	const text = fs.readFileSync(path.join(DEMO, file), "utf8");
	return new Set([...text.matchAll(/^"(\d{8})":/gm)].map((match) => match[1]));
}

/** The filler: a strip on every day the demo has none and the strip did not take off. */
function filler(taken: ReadonlySet<string>): { strips: string; reruns: string } {
	const strips: string[] = [];
	const reruns: string[] = [];
	let index = 0;
	for (let at = day(START); at <= day(END); at = new Date(at.getTime() + 864e5)) {
		const iso = at.toISOString().slice(0, 10);
		const key = compact(at);
		if (taken.has(key)) continue;
		if (BREAKS.some(([from, to]) => iso >= from && iso <= to)) {
			// The paper ran an earlier strip, always from before the first break.
			const original = new Date(day(START).getTime() + (index++ % 1000) * 864e5);
			reruns.push(`"${key}": "${compact(original)}"`);
		} else {
			strips.push(`"${key}": "Strip of ${iso}."`);
		}
	}
	return { strips: strips.join("\n") + "\n", reruns: reruns.join("\n") + "\n" };
}

function tuning(): string {
	return Object.entries(ENGINE_TUNING)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
}

function bare(): Record<string, string> {
	const { strips, reruns } = filler(new Set());
	return {
		"config.yaml": `name: Engine test archive
series: The Test Strip
colourSundays: true
${SAMPLE_THEME}
comics:
  strips: !Import ./strips.yaml
  specials: {}
collections: []
tuning: !Import ./tuning.yaml
credits: !Import ./credits.md
reruns: !Import ./reruns.yaml
arcs: false
compounds: false
misspellings: false
characters: false
creators: false
subjects: false
`,
		"strips.yaml": strips,
		"reruns.yaml": reruns,
		"tuning.yaml": tuning() + "\n",
		"credits.md": "A stub archive for the engine's tests.\n",
	};
}

/**
 * The demo's configuration, read from where the demo is, with the filler added to its strips and its
 * reruns. Its own paths are made absolute, since the archive is written elsewhere.
 */
function full(): Record<string, string> {
	const taken = new Set([...keys("comics/1990.yaml"), ...keys("comics/1991.yaml"), ...keys("reruns.yaml")]);
	const { strips, reruns } = filler(taken);
	let config = fs.readFileSync(path.join(DEMO, "config.yaml"), "utf8");
	// `!Import ./x`, `!Path ./x` and `[Import, ./x]` name files beside the configuration.
	config = config.replace(/(!Import |!Path |\[Import, |comicImages: )\.\//g, `$1${DEMO}/`);
	const replaceBlock = (from: string, to: string) => {
		assertIncludes(config, from);
		config = config.replace(from, to);
	};
	replaceBlock(
		`    - !Import ${DEMO}/comics/1991.yaml\n`,
		`    - !Import ${DEMO}/comics/1991.yaml\n    - !Import ./filler-strips.yaml\n`,
	);
	replaceBlock(
		`reruns: !Import ${DEMO}/reruns.yaml`,
		`reruns: !Merge [!Import ${DEMO}/reruns.yaml, !Import ./filler-reruns.yaml]`,
	);
	// What a test of the engine expects to find on: the corrections link, which the demo leaves off.
	config = config.replace("${CORRECTIONS:-false}", "${CORRECTIONS:-true}");
	return { "config.yaml": config, "filler-strips.yaml": strips, "filler-reruns.yaml": reruns };
}

function assertIncludes(text: string, part: string): void {
	if (!text.includes(part)) throw new Error(`The demo's configuration no longer has ${part}`);
}

/** Where the archive of this kind is, written if it is not there yet. */
export function archiveConfig(kind: "full" | "bare"): string {
	const content = kind === "full" ? full() : bare();
	// The demo's own files are part of what the archive is, so a change to one writes it again.
	const inputs = kind === "full" ? fs.readdirSync(DEMO, { recursive: true, encoding: "utf8" }).sort() : [];
	const stamps = inputs.map((name) => {
		const file = path.join(DEMO, name);
		return fs.statSync(file).isFile() ? `${name}:${fs.statSync(file).mtimeMs}` : name;
	});
	const hash = createHash("sha256")
		.update(JSON.stringify(content))
		.update(stamps.join("\n"))
		.digest("hex")
		.slice(0, 12);
	const directory = path.join(os.tmpdir(), `find-strips-test-${kind}-${hash}`);
	if (!fs.existsSync(path.join(directory, "config.yaml"))) {
		// Written aside and moved into place, so a test file starting at the same moment never sees half of it.
		const aside = `${directory}-${process.pid}`;
		fs.mkdirSync(aside, { recursive: true });
		for (const [name, text] of Object.entries(content)) fs.writeFileSync(path.join(aside, name), text);
		try {
			fs.renameSync(aside, directory);
		} catch {
			fs.rmSync(aside, { recursive: true, force: true });
		}
	}
	return path.join(directory, "config.yaml");
}
