import type { APIRoute } from "astro";

export const prerender = false;

const memoryLikes = new Map<string, number>();

type LikesKv = Pick<KVNamespace, "get" | "put">;

function getKv(locals: App.Locals): LikesKv | undefined {
	const kv = locals.runtime?.env?.NEXTY_LIKES;
	if (kv) return kv;

	if (import.meta.env.DEV) {
		return {
			get: async (key: string) => {
				const id = key.replace(/^like:/, "");
				return String(memoryLikes.get(id) ?? 0);
			},
			put: async (key: string, value: string) => {
				const id = key.replace(/^like:/, "");
				memoryLikes.set(id, Number.parseInt(value, 10));
			},
		};
	}

	return undefined;
}

function jsonResponse(data: { id: string; count: number }, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export const GET: APIRoute = async ({ request, locals }) => {
	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	if (!id) return new Response("missing id", { status: 400 });

	const kv = getKv(locals);
	const count = Number.parseInt((await kv?.get(`like:${id}`)) ?? "0", 10);
	return jsonResponse({ id, count });
};

export const POST: APIRoute = async ({ request, locals }) => {
	const url = new URL(request.url);
	const id = url.searchParams.get("id");
	if (!id) return new Response("missing id", { status: 400 });

	const kv = getKv(locals);
	const current = Number.parseInt((await kv?.get(`like:${id}`)) ?? "0", 10);
	const newCount = current + 1;
	await kv?.put(`like:${id}`, String(newCount));
	return jsonResponse({ id, count: newCount });
};
