import type { CollectionEntry } from "astro:content";
import { getSortedPostsList } from "@utils/content-utils";
import { getNotionPosts, type NotionPost } from "@utils/notion";
import { getPostUrlBySlug, url } from "@utils/url-utils";

export type PostSource = "local" | "notion";

export interface UnifiedPostListItem {
	source: PostSource;
	slug: string;
	url: string;
	title: string;
	published: Date;
	updated?: Date;
	tags: string[];
	category: string | null;
	image: string;
	description: string;
	draft: boolean;
	entryId?: string;
	notionId?: string;
}

function localToUnified(
	post: Awaited<ReturnType<typeof getSortedPostsList>>[number],
): UnifiedPostListItem {
	return {
		source: "local",
		slug: post.slug,
		url: getPostUrlBySlug(post.slug),
		title: post.data.title,
		published: post.data.published,
		updated: post.data.updated,
		tags: post.data.tags ?? [],
		category: post.data.category ?? null,
		image: post.data.image ?? "",
		description: post.data.description ?? "",
		draft: post.data.draft ?? false,
		entryId: `${post.slug}`,
	};
}

function notionToUnified(post: NotionPost): UnifiedPostListItem {
	const category = post.tags[0] ?? "灵感";
	return {
		source: "notion",
		slug: post.slug,
		url: url(`/notion/${post.id.replace(/-/g, "")}/`),
		title: post.title,
		published: post.published,
		tags: post.tags,
		category,
		image: post.coverImage ?? post.image ?? "",
		description: post.description,
		draft: false,
		notionId: post.id,
	};
}

export async function getMergedPosts(): Promise<UnifiedPostListItem[]> {
	const [localPosts, notionPosts] = await Promise.all([
		getSortedPostsList(),
		getNotionPosts(),
	]);

	const merged = [
		...localPosts.map(localToUnified),
		...notionPosts.map(notionToUnified),
	];

	return merged.sort(
		(a, b) => b.published.getTime() - a.published.getTime(),
	);
}

export type PostNavItem = {
	title: string;
	url: string;
};

export type MergedPostNavigation = {
	/** Chronologically newer post — shown on the left nav control */
	newer: PostNavItem | null;
	/** Chronologically older post — shown on the right nav control */
	older: PostNavItem | null;
};

function toNavItem(post: UnifiedPostListItem): PostNavItem {
	return { title: post.title, url: post.url };
}

export async function getMergedPostNavigation(
	matcher: (post: UnifiedPostListItem) => boolean,
): Promise<MergedPostNavigation> {
	const allPosts = await getMergedPosts();
	const index = allPosts.findIndex(matcher);

	if (index === -1) {
		return { newer: null, older: null };
	}

	return {
		newer: index > 0 ? toNavItem(allPosts[index - 1]) : null,
		older:
			index < allPosts.length - 1 ? toNavItem(allPosts[index + 1]) : null,
	};
}

export async function getMergedPostNavigationByLocalSlug(
	slug: string,
): Promise<MergedPostNavigation> {
	return getMergedPostNavigation(
		(post) => post.source === "local" && post.slug === slug,
	);
}

export async function getMergedPostNavigationByNotionId(
	id: string,
): Promise<MergedPostNavigation> {
	const normalizedId = id.replace(/-/g, "");
	return getMergedPostNavigation(
		(post) =>
			post.source === "notion" &&
			post.notionId?.replace(/-/g, "") === normalizedId,
	);
}

export type UnifiedPostPage = {
	data: UnifiedPostListItem[];
	currentPage: number;
	lastPage: number;
	url: {
		prev?: string;
		next?: string;
	};
};

export function paginateUnifiedPosts(
	posts: UnifiedPostListItem[],
	pageSize: number,
	currentPage = 1,
): UnifiedPostPage {
	const lastPage = Math.max(1, Math.ceil(posts.length / pageSize));
	const start = (currentPage - 1) * pageSize;

	return {
		data: posts.slice(start, start + pageSize),
		currentPage,
		lastPage,
		url: {
			prev:
				currentPage > 1
					? currentPage === 2
						? "/posts/"
						: `/posts/page/${currentPage - 1}/`
					: undefined,
			next:
				currentPage < lastPage
					? `/posts/page/${currentPage + 1}/`
					: undefined,
		},
	};
}

export type { CollectionEntry };
