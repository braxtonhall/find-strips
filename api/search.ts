import type { Compounds, SearchResult, Tuning } from "../src/search";
import type { SortMode } from "../src/types";
import type { Site } from "./siteImpl";

declare function require(id: string): unknown;

export interface SearchOptions {
	/** `rank` unless said otherwise. */
	sort?: SortMode;
	/** Values to score with in place of the site's own, for a sweep of them. */
	tuning?: Partial<Tuning>;
}

export interface Search {
	search(query: string, options?: SearchOptions): SearchResult[];
}

/**
 * A search over a site's strips. The engine reads the strips from module-wide state, so this installs
 * them there: there is one archive per process, and creating a search over another replaces the first.
 *
 * The engine's modules read their configuration when first loaded (see `loadSite`), so a `Site` from
 * `loadSite` should exist before this is called; or `SITE_CONFIG` must be set, as the test scripts do.
 */
export function createSearch(
	site: Pick<Site, "comics" | "descriptions"> & Partial<Pick<Site, "tuning" | "compounds">>,
): Search {
	const engine = require("../src/search") as typeof import("../src/search");
	const { state } = require("../src/state") as typeof import("../src/state");
	state.comics = site.comics;
	state.descriptions = site.descriptions;
	const compounds: Compounds = site.compounds ?? new Map();
	return {
		search(query, options = {}) {
			if (!site.tuning && !options.tuning)
				throw new Error("A search needs a tuning: the site's, or one in the options");
			return engine.search(query, options.sort ?? "rank", { ...site.tuning, ...options.tuning } as Tuning, compounds);
		},
	};
}

export type { Compounds, SearchResult, Tuning, HighlightRange } from "../src/search";
export type { Comic, SortMode } from "../src/types";
export { search } from "../src/search";
export { stem } from "../src/stem";
export { parseQuery } from "../src/boolean-query";
export { parseDateExpression } from "../src/date-query";
