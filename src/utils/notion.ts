import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";

export interface NotionPost {
	id: string;
	slug: string;
	title: string;
	date: Date;
	published: Date;
	tags: string[];
	description: string;
	url: string;
	/** Unified cover field: page cover + `cover` Files & media property */
	coverImage: string | null;
	/** @deprecated Use coverImage */
	image: string | null;
}

function getEnv(
	name: "NOTION_TOKEN" | "NOTION_DATABASE_ID" | "NOTION_GALLERY_DB_ID",
): string | undefined {
	const fromMeta = import.meta.env[name];
	if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;
	if (typeof process !== "undefined" && process.env[name]) {
		return process.env[name];
	}
	return undefined;
}

function formatNotionId(id: string): string {
	const clean = id.replace(/-/g, "");
	if (clean.length !== 32) return id;
	return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

function slugifyTitle(title: string, id: string): string {
	const normalized = title
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\p{L}\p{N}-]+/gu, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	return normalized ? `notion-${normalized}` : `notion-${id.replace(/-/g, "")}`;
}

function getNotionClient(): Client | null {
	const token = getEnv("NOTION_TOKEN");
	if (!token) return null;
	return new Client({ auth: token });
}

function getProperty(
	page: PageObjectResponse,
	...names: string[]
): PageObjectResponse["properties"][string] | undefined {
	for (const name of names) {
		if (page.properties[name]) return page.properties[name];
	}

	const keys = Object.keys(page.properties);
	for (const name of names) {
		const matched = keys.find((key) => key.toLowerCase() === name.toLowerCase());
		if (matched) return page.properties[matched];
	}

	return undefined;
}

async function resolveDataSourceId(
	notion: Client,
	databaseId: string,
): Promise<string | null> {
	const formattedId = formatNotionId(databaseId);

	try {
		const database = await notion.databases.retrieve({
			database_id: formattedId,
		});
		const dataSources = (
			database as { data_sources?: { id: string }[] }
		).data_sources;
		if (dataSources?.[0]?.id) return dataSources[0].id;
	} catch {
		// The env value may already be a data source ID.
	}

	return formattedId;
}

function isPageObject(page: unknown): page is PageObjectResponse {
	return (
		typeof page === "object" &&
		page !== null &&
		"object" in page &&
		(page as PageObjectResponse).object === "page"
	);
}

function getTitle(page: PageObjectResponse, logProperties = false): string {
	if (logProperties && import.meta.env.DEV) {
		console.log("[notion] page.properties keys:", Object.keys(page.properties));
		console.log("[notion] page.properties:", page.properties);
	}

	const titleProp = getProperty(page, "名称", "Name", "Title", "title");
	if (titleProp?.type === "title") {
		const text = titleProp.title.map((part) => part.plain_text).join("").trim();
		if (text) return text;
	}

	for (const key of Object.keys(page.properties)) {
		const prop = page.properties[key];
		if (prop?.type === "title") {
			const text = prop.title.map((part) => part.plain_text).join("").trim();
			if (text) return text;
		}
	}

	return "Untitled";
}

function getPublishedDate(page: PageObjectResponse): Date {
	const dateProp = getProperty(page, "Date", "日期", "date");
	if (dateProp?.type === "date" && dateProp.date?.start) {
		return new Date(dateProp.date.start);
	}
	return new Date(page.created_time);
}

function getTags(page: PageObjectResponse): string[] {
	const tagsProp = getProperty(page, "Tags", "标签", "tags");
	if (tagsProp?.type === "multi_select") {
		return tagsProp.multi_select.map((tag) => tag.name);
	}
	return [];
}

function isPublished(page: PageObjectResponse): boolean {
	const publishedProp = getProperty(
		page,
		"Published",
		"已发布",
		"发布",
		"published",
	);
	if (publishedProp?.type === "checkbox") {
		return publishedProp.checkbox === true;
	}
	return false;
}

function getPageCover(page: PageObjectResponse): string | null {
	const cover = page.cover;
	const coverUrl =
		cover?.type === "external"
			? cover.external.url
			: cover?.type === "file"
				? cover.file.url
				: null;

	// Notion database property: add a Files & media column named `cover`
	const coverProp = getProperty(
		page,
		"cover",
		"Cover",
		"封面",
		"Image",
		"image",
	);
	let imageFromProp: string | null = null;

	if (coverProp?.type === "files" && coverProp.files.length > 0) {
		const file = coverProp.files[0];
		if (file.type === "file") {
			imageFromProp = file.file.url;
		} else if (file.type === "external") {
			imageFromProp = file.external.url;
		}
	}

	return coverUrl || imageFromProp || null;
}

export function toNotionParamId(id: string): string {
	return id.replace(/-/g, "");
}

export function fromNotionParamId(paramId: string): string {
	const clean = paramId.replace(/-/g, "");
	return clean.replace(
		/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
		"$1-$2-$3-$4-$5",
	);
}

export function getNotionPostUrl(id: string): string {
	return `/notion/${id.replace(/-/g, "")}/`;
}

function toNotionPost(page: PageObjectResponse): NotionPost {
	const id = page.id;
	const title = getTitle(page);
	const date = getPublishedDate(page);
	const coverImage = getPageCover(page);

	return {
		id,
		slug: slugifyTitle(title, id),
		title,
		date,
		published: date,
		tags: getTags(page),
		description: "",
		url: getNotionPostUrl(id),
		coverImage,
		image: coverImage,
	};
}

function logNotionAccessHelp(message: string) {
	if (message.includes("object_not_found")) {
		console.warn(
			"[notion] 无法访问数据库。请在 Notion 打开 Nexty 数据库 → 右上角 ··· → Connections → 连接你的集成（nexty）。",
		);
		return;
	}
	console.warn(`[notion] Failed to fetch posts: ${message}`);
}

let cache: NotionPost[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchFromNotion(): Promise<NotionPost[]> {
	const notion = getNotionClient();
	const databaseId = getEnv("NOTION_DATABASE_ID");

	if (!notion || !databaseId) {
		console.warn(
			"[notion] NOTION_TOKEN 或 NOTION_DATABASE_ID 未配置，跳过 Notion 文章。",
		);
		return [];
	}

	try {
		const dataSourceId = await resolveDataSourceId(notion, databaseId);
		if (!dataSourceId) return [];

		const posts: NotionPost[] = [];
		let cursor: string | undefined;
		let loggedProperties = false;

		do {
			const response = await notion.dataSources.query({
				data_source_id: dataSourceId,
				filter: {
					property: "Published",
					checkbox: { equals: true },
				},
				sorts: [
					{
						property: "Date",
						direction: "descending",
					},
				],
				start_cursor: cursor,
				page_size: 100,
			});

			for (const result of response.results) {
				if (!isPageObject(result)) continue;
				if (!isPublished(result)) continue;
				if (!loggedProperties && import.meta.env.DEV) {
					getTitle(result, true);
					loggedProperties = true;
				}
				const post = toNotionPost(result);
				if (import.meta.env.DEV) {
					console.log(`[notion] ${post.title} coverImage:`, post.coverImage);
				}
				posts.push(post);
			}

			cursor = response.has_more
				? (response.next_cursor ?? undefined)
				: undefined;
		} while (cursor);

		return posts.sort(
			(a, b) => b.date.getTime() - a.date.getTime(),
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown Notion API error";
		logNotionAccessHelp(message);
		return [];
	}
}

export async function getNotionPosts(): Promise<NotionPost[]> {
	const now = Date.now();
	if (cache && now - cacheTime < CACHE_TTL) {
		return cache;
	}

	const posts = await fetchFromNotion();
	cache = posts;
	cacheTime = now;
	return posts;
}

export function clearNotionPostsCache(): void {
	cache = null;
	cacheTime = 0;
}

export async function getNotionPageMarkdown(
	pageId: string,
): Promise<string | null> {
	const notion = getNotionClient();
	if (!notion) return null;

	const normalizedId = fromNotionParamId(pageId);

	try {
		const n2m = new NotionToMarkdown({ notionClient: notion });
		const blocks = await n2m.pageToMarkdown(normalizedId);
		const markdown = n2m.toMarkdownString(blocks);
		return markdown.parent;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown Notion API error";
		console.warn(`[notion] Failed to fetch page ${pageId}: ${message}`);
		return null;
	}
}

export async function getNotionPostById(
	pageId: string,
): Promise<NotionPost | null> {
	const notion = getNotionClient();
	if (!notion) return null;

	const normalizedId = fromNotionParamId(pageId);

	try {
		const page = await notion.pages.retrieve({ page_id: normalizedId });
		if (!isPageObject(page) || !isPublished(page)) return null;
		return toNotionPost(page);
	} catch {
		return null;
	}
}

export function estimateReadingMinutes(markdown: string): number {
	const words = markdown.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 200));
}

export interface GalleryPhoto {
	id: string;
	slug: string;
	title: string;
	location: string;
	remark: string;
	coverImage: string;
	createdAt: Date;
}

function getGalleryName(page: PageObjectResponse): string {
	const nameProp = getProperty(page, "Name", "name", "名称", "Title", "title");
	if (nameProp?.type === "title") {
		return nameProp.title.map((part) => part.plain_text).join("").trim();
	}
	return getTitle(page);
}

function getRichTextProperty(
	page: PageObjectResponse,
	...names: string[]
): string {
	const prop = getProperty(page, ...names);
	if (prop?.type === "rich_text") {
		return prop.rich_text.map((part) => part.plain_text).join("").trim();
	}
	if (prop?.type === "select" && prop.select?.name) {
		return prop.select.name.trim();
	}
	return "";
}

function getGalleryPhotoUrl(page: PageObjectResponse): string | null {
	const photoProp = getProperty(page, "photo", "Photo", "照片");
	if (photoProp?.type !== "files" || photoProp.files.length === 0) {
		return null;
	}

	const file = photoProp.files[0];
	if (file.type === "file") return file.file.url;
	if (file.type === "external") return file.external.url;
	return null;
}

function buildGallerySlug(title: string, pageId: string): string {
	const normalized = title
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\p{L}\p{N}-]+/gu, "")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");

	const shortId = pageId.replace(/-/g, "").slice(-8);
	if (normalized) return `${normalized}-${shortId}`;
	return `photo-${shortId}`;
}

function toGalleryPhoto(page: PageObjectResponse): GalleryPhoto | null {
	const coverImage = getGalleryPhotoUrl(page);
	if (!coverImage) return null;

	const id = page.id;
	const title = getGalleryName(page) || "Untitled";

	return {
		id,
		slug: buildGallerySlug(title, id),
		title,
		location: getRichTextProperty(page, "location", "Location", "地点"),
		remark: getRichTextProperty(page, "remark", "Remark", "备注"),
		coverImage,
		createdAt: new Date(page.created_time),
	};
}

let galleryCache: GalleryPhoto[] | null = null;
let galleryCacheTime = 0;

async function fetchGalleryFromNotion(): Promise<GalleryPhoto[]> {
	const notion = getNotionClient();
	const databaseId = getEnv("NOTION_GALLERY_DB_ID");

	if (!notion || !databaseId) {
		console.warn(
			"[notion] NOTION_TOKEN 或 NOTION_GALLERY_DB_ID 未配置，跳过 Notion 画廊。",
		);
		return [];
	}

	try {
		const dataSourceId = await resolveDataSourceId(notion, databaseId);
		if (!dataSourceId) return [];

		const photos: GalleryPhoto[] = [];
		let cursor: string | undefined;

		do {
			const response = await notion.dataSources.query({
				data_source_id: dataSourceId,
				sorts: [
					{
						timestamp: "created_time",
						direction: "descending",
					},
				],
				start_cursor: cursor,
				page_size: 100,
			});

			for (const result of response.results) {
				if (!isPageObject(result)) continue;
				const photo = toGalleryPhoto(result);
				if (photo) photos.push(photo);
			}

			cursor = response.has_more
				? (response.next_cursor ?? undefined)
				: undefined;
		} while (cursor);

		return photos.sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Unknown Notion API error";
		logNotionAccessHelp(message);
		return [];
	}
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
	const now = Date.now();
	if (galleryCache && now - galleryCacheTime < CACHE_TTL) {
		return galleryCache;
	}

	const photos = await fetchGalleryFromNotion();
	galleryCache = photos;
	galleryCacheTime = now;
	return photos;
}

export function clearGalleryPhotosCache(): void {
	galleryCache = null;
	galleryCacheTime = 0;
}
