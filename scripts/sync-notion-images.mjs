import { Client } from "@notionhq/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_GALLERY_DB_ID = process.env.NOTION_GALLERY_DB_ID;
const CACHE_DIR = path.join(__dirname, "../public/notion-images");

if (!NOTION_TOKEN || !NOTION_GALLERY_DB_ID) {
  console.error("缺少 NOTION_TOKEN 或 NOTION_GALLERY_DB_ID");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function inferExt(url, contentType) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  const p = url.split("?")[0].toLowerCase();
  if (p.endsWith(".png")) return "png";
  if (p.endsWith(".webp")) return "webp";
  if (p.endsWith(".gif")) return "gif";
  return "jpg";
}

async function downloadImage(url, id) {
  const safeId = id.replace(/-/g, "");
  const existing = fs.readdirSync(CACHE_DIR).find(f => f.startsWith(`${safeId}.`));
  if (existing) {
    console.log(`✓ 已缓存：${safeId}`);
    return;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ext = inferExt(url, res.headers.get("content-type"));
    const filepath = path.join(CACHE_DIR, `${safeId}.${ext}`);
    fs.writeFileSync(filepath, Buffer.from(await res.arrayBuffer()));
    console.log(`↓ 已下载：${safeId}.${ext}`);
  } catch (err) {
    console.error(`✗ 下载失败 ${safeId}：${err.message}`);
  }
}

async function main() {
  console.log("开始同步 Notion 画廊图片...");
  const database = await notion.databases.retrieve({ database_id: NOTION_GALLERY_DB_ID });
  const dataSourceId =
    database.data_sources?.[0]?.id ?? NOTION_GALLERY_DB_ID;
  let cursor;
  let total = 0;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of res.results) {
      const photoProp = page.properties?.photo ?? page.properties?.Photo;
      const files = photoProp?.files ?? [];
      for (const f of files) {
        const url = f.file?.url ?? f.external?.url;
        if (url) {
          await downloadImage(url, page.id);
          total++;
        }
      }
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  console.log(`完成，共处理 ${total} 张图片`);
}

main().catch(console.error);
