import { withEnvironment } from "./environment";
import type { Site } from "./siteImpl";

export type { Site } from "./siteImpl";

declare function require(id: string): unknown;

/**
 * Reads everything a site's configuration describes, once, and returns it. The build chain's
 * variables are put back when it returns.
 *
 * Some of the engine's modules read the configuration the first time they are loaded and keep what
 * they read — the span of the archive, the tuning, the compounds — which is why this loads them here,
 * with the configuration set, rather than when the API is imported. A process works with one site.
 */
export function loadSite(config: string, options: { envFile?: string } = {}): Site {
	return withEnvironment({ config, envFile: options.envFile }, () => {
		const { readSite } = require("./siteImpl") as typeof import("./siteImpl");
		return readSite();
	});
}
