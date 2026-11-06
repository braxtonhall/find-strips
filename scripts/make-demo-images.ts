/**
 * Draws the demo's pictures: a flat coloured rectangle, labelled, for every strip, special and
 * book cover, plus the icon and the banner. Nothing here is anyone's artwork, so the images are
 * committed. Run it after changing the demo's strips or books:
 *
 *   node --import tsx scripts/make-demo-images.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import yaml from "js-yaml";

const demo = path.join(__dirname, "..", "demo");

function read(file: string): Record<string, unknown> {
	return (yaml.load(fs.readFileSync(path.join(demo, file), "utf8")) ?? {}) as Record<string, unknown>;
}

/** A colour for a name, the same each run: hue from a hash, soft enough to read dark text on. */
function colour(name: string): string {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 360;
	return `hsl(${hash}, 55%, 78%)`;
}

async function draw(file: string, width: number, height: number, label: string, fill = colour(label)): Promise<void> {
	const size = Math.max(12, Math.min(height / 4, width / (label.length * 0.7)));
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<rect width="100%" height="100%" fill="${fill}"/>
<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="${size}" fill="#2b2b2b">${label}</text></svg>`;
	fs.mkdirSync(path.dirname(file), { recursive: true });
	await sharp(Buffer.from(svg)).png({ palette: true }).toFile(file);
}

async function main(): Promise<void> {
	const images = path.join(demo, "comics", "images");
	const dates = new Set<string>();
	for (const year of fs.readdirSync(path.join(demo, "comics")).filter((name) => /^\d{4}\.yaml$/.test(name)))
		for (const date of Object.keys(read(`comics/${year}`))) dates.add(date);
	for (const date of dates) {
		const sunday = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8))).getUTCDay() === 0;
		await draw(path.join(images, `${date}.png`), sunday ? 900 : 720, sunday ? 600 : 220, date);
	}
	for (const id of Object.keys(read("comics/specials.yaml"))) await draw(path.join(images, `${id}.png`), 720, 220, id);

	// A book's file holds its cover as `!Path ./covers/<id>.png`, beside the book. The tag is the
	// build's own, so the id is read from the text instead of parsing the file.
	for (const file of fs.readdirSync(path.join(demo, "collections")).filter((name) => name.endsWith(".yaml"))) {
		const id = /^id: (\w+)/m.exec(fs.readFileSync(path.join(demo, "collections", file), "utf8"))?.[1];
		if (id) await draw(path.join(demo, "collections", "covers", `${id}.png`), 300, 450, id);
	}
	await draw(path.join(demo, "icon.png"), 512, 512, "DS", "#3b7ddd");
	await draw(path.join(demo, "banner.png"), 722, 103, "The Demo Strip", "#cfe0f7");
}

main();
