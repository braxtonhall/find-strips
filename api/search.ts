import type { Compounds, SearchResult, Tuning } from "../src/search";
import type { SortMode } from "../src/types";
import { isolated } from "./isolated";
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
	/** The engine's stemmer, as this site's search applies it. */
	stem: typeof import("../src/stem").stem;
	/** The engine's parser, with the filters this site's configuration has. */
	parseQuery: typeof import("../src/boolean-query").parseQuery;
	parseDateExpression: typeof import("../src/date-query").parseDateExpression;
}

/**
 * A search over a site's strips. It has an engine of its own, read with the site's configuration, and
 * holds the strips itself, so the order of imports does not matter and a process can hold a search
 * over each of several sites. A site without a `source` (one that was not made by `loadSite`) is read
 * with the process's `SITE_CONFIG`, as the test scripts set it.
 */
export function createSearch(
	site: Pick<Site, "comics" | "descriptions"> & Partial<Pick<Site, "tuning" | "compounds" | "source">>,
): Search {
	const { engine, state, stem, parseQuery, parseDateExpression } = isolated(
		() => ({
			engine: require("../src/search") as typeof import("../src/search"),
			state: (require("../src/state") as typeof import("../src/state")).state,
			stem: (require("../src/stem") as typeof import("../src/stem")).stem,
			parseQuery: (require("../src/boolean-query") as typeof import("../src/boolean-query")).parseQuery,
			parseDateExpression: (require("../src/date-query") as typeof import("../src/date-query")).parseDateExpression,
		}),
		site.source,
	);
	state.comics = site.comics;
	state.descriptions = site.descriptions;
	const compounds: Compounds = site.compounds ?? new Map();
	return {
		search(query, options = {}) {
			if (!site.tuning && !options.tuning)
				throw new Error("A search needs a tuning: the site's, or one in the options");
			return engine.search(query, options.sort ?? "rank", { ...site.tuning, ...options.tuning } as Tuning, compounds);
		},
		stem,
		parseQuery,
		parseDateExpression,
	};
}

export type { Compounds, SearchResult, Tuning, HighlightRange } from "../src/search";
export type { Comic, SortMode } from "../src/types";
