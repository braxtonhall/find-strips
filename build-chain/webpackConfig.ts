import path from "path";
import webpack, { Configuration } from "webpack";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import SiteFilesPlugin from "./SiteFilesPlugin";
import YamlToJsonPlugin from "./YamlToJsonPlugin";
import PagesPlugin from "./PagesPlugin";
import { loadComicImages, loadSiteConfig } from "./siteConfig";
import { COMIC_IMAGES_PATH } from "./exportComicsJson";

/** The package's own folder: where `src/` is, whether this runs from a checkout or from `node_modules`. */
const packageDir = path.join(__dirname, "..");
const srcDir = path.join(packageDir, "src");
const buildChainDir = __dirname;

export interface WebpackConfigOptions {
	/** The folder the site is written to. */
	outDir: string;
	mode: "production" | "development";
}

/**
 * The webpack configuration that builds the site `SITE_CONFIG` names. The configuration file is
 * read here and by the loaders and plugins below through that variable, so it must be set first;
 * `build` in `api/build.ts` does.
 */
export function createWebpackConfig({ outDir, mode }: WebpackConfigOptions): Configuration {
	// Read once, here: the bundle is compiled with the mount as a literal, so a change to it needs a
	// fresh build anyway, as does naming another folder for the strips' images.
	const basePath = loadSiteConfig()?.basePath ?? "/";
	const comicImages = loadComicImages();

	return {
		mode,
		context: packageDir,
		devtool: mode !== "production" ? "source-map" : undefined,
		performance: {
			hints: false,
		},
		entry: {
			index: path.join(srcDir, "index"),
		},
		output: {
			// Every page lives in its own directory, so everything it references is named from the mount.
			publicPath: basePath,
			path: path.resolve(outDir),
			// Unhashed on purpose: a hashed name would put a new script tag in all three thousand pages
			// on every change to the script, and would buy nothing — GitHub Pages serves every file with
			// `max-age=600`, which no name can lengthen.
			filename: "[name].js",
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					// Only the app: the package may sit in `node_modules`, which a blanket exclude would skip.
					include: [srcDir],
					use: {
						loader: require.resolve("ts-loader"),
						// Types are checked by the package's own CI, not by every site that builds with it.
						options: { transpileOnly: true, configFile: path.join(srcDir, "tsconfig.json") },
					},
				},
				{
					// Runs on ts-loader's output and replaces it: the archive's span, as a literal. See
					// `src/archive.ts`.
					test: path.join(srcDir, "archive.ts"),
					enforce: "post",
					use: path.join(buildChainDir, "archiveSpan.ts"),
				},
				{
					// The same, for the reruns, the books and the arcs. See `src/bundled-data.ts`.
					test: path.join(srcDir, "bundled-data.ts"),
					enforce: "post",
					use: path.join(buildChainDir, "bundledData.ts"),
				},
				{
					// The same, for the credits page's text. See `src/credits-content.ts`.
					test: path.join(srcDir, "credits-content.ts"),
					enforce: "post",
					use: path.join(buildChainDir, "credits.ts"),
				},
				{
					// The same, for the parts of the configuration the pages are drawn with. See `src/site-config.ts`.
					test: path.join(srcDir, "site-config.ts"),
					enforce: "post",
					use: path.join(buildChainDir, "siteConfig.ts"),
				},
				{
					// The same, for the compound words the search splits. See `src/compounds.ts`.
					test: path.join(srcDir, "compounds.ts"),
					enforce: "post",
					use: path.join(buildChainDir, "compoundLexicon.ts"),
				},
				{
					// The same, for how the search scores a match. See `src/tuning.ts`.
					test: path.join(srcDir, "tuning.ts"),
					enforce: "post",
					use: path.join(buildChainDir, "tuning.ts"),
				},
				{
					// The theme's colours from the configuration, in place of the stylesheet's own text — before
					// `css-loader` reads it. See `build-chain/theme.ts`.
					test: path.join(srcDir, "styles", "theme.css"),
					enforce: "pre",
					use: path.join(buildChainDir, "theme.ts"),
				},
				{
					test: /\.css$/,
					use: [MiniCssExtractPlugin.loader, require.resolve("css-loader")],
				},
			],
		},
		optimization: {
			// Production mode minifies the script on its own, but not the stylesheet; "..." keeps the
			// script's minimizer beside this one.
			minimizer: ["...", new CssMinimizerPlugin()],
		},
		resolve: {
			extensions: [".tsx", ".ts", ".json", ".js"],
		},
		plugins: [
			// The mount, for the app's addresses; see `src/base-path.ts`.
			new webpack.DefinePlugin({ __BASE_PATH__: JSON.stringify(basePath) }),
			new YamlToJsonPlugin(),
			// The strips' images, from the folder the configuration names, if it names one. The covers are
			// published by `YamlToJsonPlugin`, beside the books that name them.
			...(comicImages
				? [
						new CopyWebpackPlugin({
							patterns: [{ from: comicImages, to: COMIC_IMAGES_PATH, noErrorOnMissing: true }],
						}),
					]
				: []),
			// A stylesheet of its own rather than one injected by the script: a prerendered page has
			// content to paint before the script runs, and it should be painted styled.
			new MiniCssExtractPlugin({ filename: "[name].css" }),
			new PagesPlugin(path.join(srcDir, "index.html")),
			// The engine's own copies of the static files, for any the site does not provide.
			new SiteFilesPlugin(buildChainDir),
		],
	};
}
