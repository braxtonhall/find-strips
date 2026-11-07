import { isolated } from "./isolated";
import type { Site } from "./siteImpl";

export type { Site } from "./siteImpl";

declare function require(id: string): unknown;

/**
 * Reads everything a site's configuration describes, once, and returns it. The build chain's
 * variables are put back when it returns, and the modules that read them are not shared with any
 * other site, so a process can load as many sites as it likes. See `isolated`.
 */
export function loadSite(config: string, options: { envFile?: string } = {}): Site {
	const environment = { config, envFile: options.envFile };
	return isolated(() => {
		const { readSite } = require("./siteImpl") as typeof import("./siteImpl");
		return { ...readSite(), source: environment };
	}, environment);
}
