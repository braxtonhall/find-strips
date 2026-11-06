/**
 * Preloaded by the engine's tests (`node --import ./test/setup.ts`): points `SITE_CONFIG` at the full test
 * archive, so the modules that read the configuration when first loaded find one. See `archive.ts`.
 */
import { archiveConfig } from "./archive";

process.env.SITE_CONFIG = archiveConfig("full");
