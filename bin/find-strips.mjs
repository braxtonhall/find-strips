#!/usr/bin/env node
// Runs the CLI's TypeScript under tsx. The package ships its source, so there is no build step to
// forget; this only starts Node with the loader on, found from this package so that it does not
// matter where the site's own `node_modules` put it.
import { spawn } from "node:child_process";
import path from "node:path";

const child = spawn(
	process.execPath,
	["--import", import.meta.resolve("tsx"), path.join(import.meta.dirname, "..", "cli", "main.ts"), ...process.argv.slice(2)],
	{ stdio: "inherit", cwd: process.cwd() },
);
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
