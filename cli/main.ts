import { spawn } from "child_process";
import path from "path";
import { build } from "../api/build";
import { check } from "../api/check";
import { setEnvironment } from "../api/environment";

const USAGE = `find-strips <command> [options]

  build <config> <outDir>      Build the site the configuration describes into outDir.
        --mode <mode>          production (default) or development
        --watch                rebuild as the configuration and its files change
        --env-file <path>      read $NAME values from this file in place of .env in the current folder
  serve <dir> [--port <n>]     Serve a built site, to look at it locally.
  check <config>               Load and validate the configuration and every file it imports.
        --env-file <path>
  candidates <config>          List compound words compounds.yaml does not mention yet.
        --env-file <path>
  help                         This text.
`;

interface Parsed {
	positional: string[];
	flags: Map<string, string | true>;
}

const VALUE_FLAGS = new Set(["mode", "env-file", "port"]);
const SWITCH_FLAGS = new Set(["watch"]);

function parse(args: string[]): Parsed {
	const positional: string[] = [];
	const flags = new Map<string, string | true>();
	for (let index = 0; index < args.length; index++) {
		const arg = args[index];
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}
		const [name, inline] = arg.slice(2).split("=", 2);
		if (SWITCH_FLAGS.has(name)) flags.set(name, true);
		else if (VALUE_FLAGS.has(name)) {
			const value = inline ?? args[++index];
			if (value === undefined) fail(`--${name} needs a value`);
			flags.set(name, value);
		} else fail(`Unknown option --${name}`);
	}
	return { positional, flags };
}

function fail(message: string): never {
	console.error(`${message}\n\n${USAGE}`);
	process.exit(2);
}

function need(parsed: Parsed, count: number, what: string): string[] {
	if (parsed.positional.length !== count) fail(`Expected ${what}`);
	return parsed.positional;
}

async function main(argv: string[]): Promise<number> {
	const [command, ...rest] = argv;
	if (!command || command === "help" || command === "--help" || command === "-h") {
		console.log(USAGE);
		return command ? 0 : 2;
	}
	const parsed = parse(rest);
	const envFile =
		typeof parsed.flags.get("env-file") === "string" ? (parsed.flags.get("env-file") as string) : undefined;

	switch (command) {
		case "build": {
			const [config, outDir] = need(parsed, 2, "build <config> <outDir>");
			const mode = parsed.flags.get("mode") ?? "production";
			if (mode !== "production" && mode !== "development") fail("--mode must be production or development");
			const result = await build({ config, outDir, envFile, mode, watch: parsed.flags.has("watch") });
			return result.ok ? 0 : 1;
		}
		case "serve": {
			const [dir] = need(parsed, 1, "serve <dir>");
			const port = parsed.flags.get("port");
			const serveMain = path.join(path.dirname(require.resolve("serve/package.json")), "build", "main.js");
			const child = spawn(process.execPath, [serveMain, dir, ...(typeof port === "string" ? ["-l", port] : [])], {
				stdio: "inherit",
			});
			return new Promise((resolve) => child.on("exit", (code) => resolve(code ?? 0)));
		}
		case "check": {
			const [config] = need(parsed, 1, "check <config>");
			const result = check(config, { envFile });
			if (result.ok) console.log(`${config}: ok (${result.strips} strips, ${result.books} books)`);
			else console.error(result.error);
			return result.ok ? 0 : 1;
		}
		case "candidates": {
			const [config] = need(parsed, 1, "candidates <config>");
			setEnvironment({ config, envFile });
			const { printCandidates } = await import("../build-chain/compoundCandidates");
			printCandidates();
			return 0;
		}
		default:
			return fail(`Unknown command ${command}`);
	}
}

main(process.argv.slice(2)).then(
	(code) => process.exit(code),
	(error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	},
);
