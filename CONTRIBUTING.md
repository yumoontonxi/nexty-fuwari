
# Contributing

Thank you for your interest in contributing!

## Before You Start

If you plan to make major changes (especially new features or design changes), please open an issue or discussion before starting work. This helps ensure your effort aligns with the project's direction.

## Submitting Code

Please keep each pull request focused on a single purpose. Avoid mixing unrelated changes in one PR, as this can make reviewing and merging code more difficult.

Please use the [Conventional Commits](https://www.conventionalcommits.org/) format for your commit messages whenever possible. This keeps our history clear and consistent.

Before submitting code, please run the appropriate commands to check for errors and format your code.

```bash
pnpm check
pnpm format
```

## Writing Posts (Markdown)

When adding local Markdown posts under `src/content/posts/`, **folder and file names must use English or pinyin only**. Do not use Chinese characters in slugs.

Astro uses the file or folder name as the post `slug`, which becomes the URL path (for example `/posts/da-vinci-in-ai-era/`). Chinese slugs are URL-encoded and often fail to match at runtime, which can cause `entry` to be `undefined` and break post rendering.

**Good examples:**

- `src/content/posts/hamlet-in-ai-era/index.md`
- `src/content/posts/da-vinci-in-ai-era.md`

**Avoid:**

- `src/content/posts/AI时代的达芬奇.md`
- `src/content/posts/ai时代的哈姆雷特/index.md`

The post `title` in frontmatter can remain in Chinese. Only the filesystem slug must be ASCII-friendly.

## 撰写文章（Markdown）

在 `src/content/posts/` 下新增本地 Markdown 文章时，**文件夹名和文件名必须使用英文或拼音**，不能使用中文。

Astro 会把文件/文件夹名当作文章 `slug`，并生成访问路径（例如 `/posts/da-vinci-in-ai-era/`）。中文 slug 经过 URL 编码后容易匹配失败，导致 `entry` 为 `undefined`，页面在 `entry.render()` 处崩溃。

**推荐示例：**

- `src/content/posts/hamlet-in-ai-era/index.md`
- `src/content/posts/da-vinci-in-ai-era.md`

**请避免：**

- `src/content/posts/AI时代的达芬奇.md`
- `src/content/posts/ai时代的哈姆雷特/index.md`

文章 frontmatter 里的 `title` 可以继续写中文，只有文件系统路径需要英文或拼音。