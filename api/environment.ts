import path from "path";

/**
 * The settings the build chain reads from the process's environment: which configuration file it is
 * for, and which env file the configuration reads its `$NAME`s from. They are variables because the
 * modules in `src/` that stand in for the bundle's literals under Node read them as they are
 * imported, before any argument could be passed to them; `isolated` gives each site modules of its own.
 */
export interface Environment {
	/** The configuration file, relative to where this runs. */
	config: string;
	/** The env file to read in place of `.env` in the folder this runs from, relative to that folder. */
	envFile?: string;
}

/** Sets the variables for good, as the CLI does: the process is the build. */
export function setEnvironment({ config, envFile }: Environment): void {
	process.env.SITE_CONFIG = path.resolve(config);
	if (envFile) process.env.SITE_ENV_FILE = path.resolve(envFile);
	else delete process.env.SITE_ENV_FILE;
}

/** Runs `run` with the variables set, and puts them back afterwards, for a caller that is a library. */
export function withEnvironment<T>(environment: Environment, run: () => T): T {
	const saved = { config: process.env.SITE_CONFIG, envFile: process.env.SITE_ENV_FILE };
	setEnvironment(environment);
	const restore = (name: "SITE_CONFIG" | "SITE_ENV_FILE", value: string | undefined) => {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	};
	const finish = () => {
		restore("SITE_CONFIG", saved.config);
		restore("SITE_ENV_FILE", saved.envFile);
	};
	try {
		const result = run();
		if (result instanceof Promise) return result.finally(finish) as T;
		finish();
		return result;
	} catch (error) {
		finish();
		throw error;
	}
}
