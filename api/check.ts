import { loadSite } from "./site";

export interface CheckResult {
	ok: boolean;
	/** The problem, where `ok` is false. */
	error?: string;
	/** What was found, where `ok` is true. */
	strips?: number;
	books?: number;
}

/** Loads the configuration and every file it imports, building nothing: what `find-strips check` runs. */
export function check(config: string, options: { envFile?: string } = {}): CheckResult {
	try {
		const site = loadSite(config, options);
		return { ok: true, strips: site.comics.length, books: site.collections.collections.length };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}
