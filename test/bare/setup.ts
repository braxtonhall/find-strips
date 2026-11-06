/**
 * Preloaded by the tests of a site without the optional parts: points `SITE_CONFIG` at the bare test
 * archive. See `archive.ts`.
 */
import { archiveConfig } from "../archive";

process.env.SITE_CONFIG = archiveConfig("bare");
