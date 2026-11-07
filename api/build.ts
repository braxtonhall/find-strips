import webpack from "webpack";
import { Environment, setEnvironment } from "./environment";

declare function require(id: string): unknown;

export interface BuildOptions extends Environment {
	/** The folder the site is written to. */
	outDir: string;
	/** `production` unless said otherwise. */
	mode?: "production" | "development";
	/** Keep building as the configuration or the archive's files change. The promise then never settles. */
	watch?: boolean;
	/** Where the build's messages go, as webpack's own stats text. `console.log` unless said otherwise. */
	log?: (text: string) => void;
}

export interface BuildResult {
	/** Whether the build finished without errors. */
	ok: boolean;
	errors: number;
	warnings: number;
}

/**
 * Builds the site `config` describes into `outDir`: what `find-strips build` does. It sets the
 * process's `SITE_CONFIG` and `SITE_ENV_FILE` for good, since the build is the process's work; load
 * a site with `loadSite` to leave them alone.
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
	const log = options.log ?? ((text: string) => console.log(text));
	setEnvironment(options);
	// Loaded now, with the variables set.
	const { createWebpackConfig } =
		require("../build-chain/webpackConfig") as typeof import("../build-chain/webpackConfig");
	const compiler = webpack(createWebpackConfig({ outDir: options.outDir, mode: options.mode ?? "production" }));

	const report = (stats: webpack.Stats | undefined): BuildResult => {
		if (!stats) return { ok: false, errors: 1, warnings: 0 };
		log(stats.toString({ colors: false, modules: false, entrypoints: false, children: false }));
		return {
			ok: !stats.hasErrors(),
			errors: stats.compilation.errors.length,
			warnings: stats.compilation.warnings.length,
		};
	};

	if (options.watch) {
		return new Promise(() => {
			compiler.watch({}, (error, stats) => {
				if (error) log(String(error.stack ?? error));
				else report(stats);
			});
		});
	}

	return new Promise((resolve, reject) => {
		compiler.run((error, stats) => {
			compiler.close((closeError) => {
				if (error || closeError) reject(error ?? closeError);
				else resolve(report(stats));
			});
		});
	});
}
