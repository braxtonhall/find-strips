import path from "path";
import { withEnvironment, type Environment } from "./environment";

declare const require: { cache: Record<string, unknown> };

const ROOT = path.resolve(__dirname, "..");
const OWNED = [path.join(ROOT, "src") + path.sep, path.join(ROOT, "build-chain") + path.sep];

const owned = (file: string): boolean => OWNED.some((prefix) => file.startsWith(prefix));

/**
 * Runs `load` with a module graph of its own for `src/` and `build-chain/`, and with `environment`
 * set if there is one. Those modules read the site's configuration as they are first loaded and keep
 * it, so what `load` requires is read for the one site and stays that site's: loading another site
 * afterwards finds none of it cached, and reads its own. The modules `load` returned keep working
 * once it has returned; they are just not shared with anything that requires them again.
 */
export function isolated<T>(load: () => T, environment?: Environment): T {
	const saved = new Map<string, unknown>();
	for (const file of Object.keys(require.cache)) {
		if (!owned(file)) continue;
		saved.set(file, require.cache[file]);
		delete require.cache[file];
	}
	const run = () => (environment ? withEnvironment(environment, load) : load());
	try {
		return run();
	} finally {
		for (const file of Object.keys(require.cache)) if (owned(file)) delete require.cache[file];
		for (const [file, entry] of saved) require.cache[file] = entry;
	}
}
