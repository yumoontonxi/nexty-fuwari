// 彻底放弃 SDK，直接用系统自带的 fetch 调用 Notion API
async function test() {
  const TOKEN = "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";
  const DB_ID = "37f7a14bfc4d804b9890000c7bd9430e";

  console.log("正在尝试直接请求 Notion API...");

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({}) // 空请求体，获取所有
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ 调用成功！数据条数:", data.results.length);
    } else {
      console.error("❌ 调用失败！详细错误:", data);
    }
  } catch (err) {
    console.error("❌ 请求发生了网络异常:", err);
  }
}

test();