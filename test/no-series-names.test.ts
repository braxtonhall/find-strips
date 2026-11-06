import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "child_process";
import fs from "fs";

/**
 * The engine knows no particular strip: the names of the one it grew out of are in no file of the tree.
 * (They are in the history, where this project's old commits mention them, which is left as it was.)
 */

// Written in pieces so that this file does not name them either.
const NAMES = new RegExp(["cal" + "vin", "hob" + "bes", "watter" + "son"].join("|"), "i");

test("no file in the tree names the strip it grew out of", () => {
	const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
		encoding: "utf8",
	})
		.split("\0")
		.filter((file) => file && fs.existsSync(file));
	const found = files.filter((file) => {
		if (/\.(png|jpe?g|gif|webp|ico)$/i.test(file) || file === "yarn.lock") return false;
		return NAMES.test(file) || NAMES.test(fs.readFileSync(file, "utf8"));
	});
	assert.deepEqual(found, []);
});
