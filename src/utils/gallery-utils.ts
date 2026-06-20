import {
	getGalleryPhotos,
	type GalleryPhoto,
} from "@utils/notion";
import { url } from "./url-utils";

export type { GalleryPhoto };

export async function getGalleryImages(): Promise<GalleryPhoto[]> {
	return getGalleryPhotos();
}

export function getGalleryUrl(slug: string): string {
	return url(`/gallery/${slug}/`);
}

export type GalleryNavigation = {
	prevSlug: string | null;
	prevTitle: string | null;
	nextSlug: string | null;
	nextTitle: string | null;
};

export function getGalleryNavigation(
	photos: GalleryPhoto[],
	currentSlug: string,
): GalleryNavigation {
	const index = photos.findIndex((item) => item.slug === currentSlug);
	if (index < 0) {
		return {
			prevSlug: null,
			prevTitle: null,
			nextSlug: null,
			nextTitle: null,
		};
	}

	const prev = photos[index - 1];
	const next = photos[index + 1];

	return {
		prevSlug: prev?.slug ?? null,
		prevTitle: prev?.title ?? null,
		nextSlug: next?.slug ?? null,
		nextTitle: next?.title ?? null,
	};
}

export function buildGalleryMosaicTiles(
	photos: GalleryPhoto[],
	currentSlug: string,
	max = 20,
): { src: string }[] {
	return photos
		.filter((item) => item.slug !== currentSlug)
		.slice(0, max)
		.map((item) => ({ src: item.coverImage }));
}
