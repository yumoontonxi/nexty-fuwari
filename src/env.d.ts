/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />
/// <reference path="../.astro/types.d.ts" />

interface Env {
	NEXTY_LIKES: KVNamespace;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
	interface Locals extends Runtime {}
}

interface ImportMetaEnv {
	readonly NOTION_TOKEN?: string;
	readonly NOTION_DATABASE_ID?: string;
	readonly NOTION_GALLERY_DB_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
