import { Client } from "@notionhq/client";

// 初始化客户端
const notion = new Client({ auth: "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" });

async function check() {
  try {
    console.log("正在尝试调用 notion.databases.retrieve...");
    // 换一个更底层的 API，看看能不能连上数据库本身
    const db = await notion.databases.retrieve({
      database_id: "37f7a14bfc4d804b9890000c7bd9430e",
    });
    console.log("✅ 连接成功！数据库名称:", db.title[0].plain_text);
  } catch (err) {
    console.error("❌ 调用失败，详细报错:", err);
  }
}

check();