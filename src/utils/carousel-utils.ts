import { getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getNotionPosts } from "@utils/notion";
import type { PostSource } from "@utils/posts-merge";
import { getPostUrlBySlug, url } from "@utils/url-utils";
import { resolvePostImageSrc } from "./hero-utils";

export type HomeCarouselSlide = {
	source: PostSource;
	title: string;
	category: string;
	coverImage: string;
	href: string;
	published: Date;
};

const MAX_SLIDES = 5;

export async function getHomeCarouselSlides(): Promise<HomeCarouselSlide[]> {
	const [localPosts, notionPosts] = await Promise.all([
		getCollection("posts", ({ data }) => {
			if (import.meta.env.PROD && data.draft) return false;
			return Boolean(data.image?.trim());
		}),
		getNotionPosts(),
	]);

	const uncategorized = i18n(I18nKey.uncategorized);

	const localSlides: HomeCarouselSlide[] = localPosts.map((post) => ({
		source: "local",
		title: post.data.title,
		category: (post.data.category || uncategorized).toUpperCase(),
		coverImage: resolvePostImageSrc(post.data.image, post.id),
		href: getPostUrlBySlug(post.slug),
		published: post.data.published,
	}));

	const notionSlides: HomeCarouselSlide[] = notionPosts
		.filter((post) => Boolean(post.coverImage?.trim()))
		.map((post) => ({
			source: "notion",
			title: post.title,
			category: (post.tags[0] || "灵感").toUpperCase(),
			coverImage: post.coverImage as string,
			href: url(`/notion/${post.id.replace(/-/g, "")}/`),
			published: post.published,
		}));

	return [...localSlides, ...notionSlides]
		.sort((a, b) => b.published.getTime() - a.published.getTime())
		.slice(0, MAX_SLIDES);
}
