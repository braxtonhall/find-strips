import type { Environment } from "./environment";
import { loadArcs } from "../build-chain/arcs";
import { loadCharacters } from "../build-chain/characters";
import { loadCollectionData } from "../build-chain/collectionPages";
import { loadComicSource } from "../build-chain/comicSource";
import { loadCanonicalForms } from "../build-chain/compoundLexicon";
import { loadCreators } from "../build-chain/creators";
import { exportComicsJson } from "../build-chain/exportComicsJson";
import { exportDescriptions } from "../build-chain/exportDescriptions";
import { generateCollectionIndex } from "../build-chain/generateCollectionIndex";
import { loadReruns } from "../build-chain/reruns";
import { loadPageConfig, loadSiteConfig } from "../build-chain/siteConfig";
import type { PageConfig } from "../src/site-config";
import { loadSubjects } from "../build-chain/subjects";
import { loadTuning } from "../build-chain/tuning";
import type { Arc, Character, CollectionIndex, Comic, Creator, Subject } from "../src/types";
import type { Compounds, Tuning } from "../src/search";

/** A site as the search and the pages read it, loaded from its configuration. */
export interface Site {
	/** Where the site was loaded from, which is what a search over it reads the rest of its configuration from. */
	source?: Environment;
	config: PageConfig;
	/** Every strip, dailies, Sundays and specials, in date order. */
	comics: Comic[];
	/** Each strip's description, by date, or by id for a special. */
	descriptions: Map<string, string>;
	/** How the search scores a match, as `tuning` in the configuration gives it. */
	tuning: Tuning;
	/** The compound words and misspellings the search folds together. */
	compounds: Compounds;
	/** Which days reran which, rerun day to original day. */
	reruns: Map<string, string>;
	collections: CollectionIndex;
	arcs: Arc[];
	characters: Character[];
	creators: Creator[];
	subjects: Subject[];
}

/** The work of `loadSite`, in a module of its own so that importing the API loads none of this: see `site.ts`. */
export function readSite(): Site {
	const source = loadComicSource();
	const collectionData = loadCollectionData();
	const basePath = loadSiteConfig()?.basePath ?? "/";
	const arcs = loadArcs(source, collectionData);
	const characters = loadCharacters(source, basePath);
	const creators = loadCreators(source, basePath);
	const subjects = loadSubjects(source);
	const comics: Comic[] = JSON.parse(
		exportComicsJson(
			collectionData,
			basePath,
			arcs,
			characters.byStrip,
			creators.byStrip,
			subjects.byStrip,
			characters.roles,
		),
	);
	return {
		config: loadPageConfig(),
		comics,
		descriptions: new Map(Object.entries(JSON.parse(exportDescriptions()) as Record<string, string>)),
		tuning: loadTuning(),
		compounds: new Map(loadCanonicalForms()),
		reruns: new Map(Object.entries(loadReruns(source))),
		collections: JSON.parse(generateCollectionIndex(collectionData, basePath)),
		arcs,
		characters: characters.characters,
		creators: creators.creators,
		subjects: subjects.subjects,
	};
}
