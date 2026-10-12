# dsh-theme-toggle

给 DSH（DeepSeek Harness）加一个**一键深浅色切换按钮**：侧栏底部、「会话回收站」等原生按钮旁边多一个 36px 的太阳/月亮图标按钮，点一下就在浅色与深色之间切换，不用再进「设置 → 外观」翻三选一。偏好经设置作用域持久化，设置页「外观」行与本按钮实时联动。

## 下载

```bash
git clone https://github.com/jackxiao17/dsh-theme-toggle.git
```

或到 [Releases 页面](https://github.com/jackxiao17/dsh-theme-toggle/releases)下载最新版解压，得到 `dsh-theme-toggle/` 文件夹。

## 安装

**方式一：官方一键安装（推荐，任意平台）**

```bash
dsh plugin --profile desktop add /路径/dsh-theme-toggle
```

然后重启 DSH。侧栏底部应立即出现月亮/太阳按钮。

**方式二：手动安装（方式一失败时用，与 dsh-session-cleaner 相同套路）**

1. 把 `dsh-theme-toggle/` 整个文件夹拷到 `~/.dsh/profiles/desktop/local/` 下（Windows 即 `C:\Users\你\.dsh\profiles\desktop\local\dsh-theme-toggle\`）
2. 编辑 `~/.dsh/profiles/desktop/package.json`：
   - `dependencies` 里加一行：`"dsh-theme-toggle": "file:./local/dsh-theme-toggle"`
   - `dsh.profile.bundles` 数组里加一项：`"dsh-theme-toggle"`
3. 在该目录跑一次 DSH 自带的 pnpm：
   ```
   node "%DSH_HOME%\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.cjs" install -C %DSH_HOME%\profiles\desktop
   ```
4. 重启 DSH 生效；在 DSH 的插件管理页可见

## 用法

- 按钮在**侧栏底部**，与「会话回收站」等原生按钮同排（在其右侧，或依各插件的 order 排列）。
- 图标显示「点击后会变成的样子」：**浅色时显示月亮**（点了变深色），**深色时显示太阳**（点了变浅色）。
- 只提供深色/浅色两个选项的切换，**不提供「跟随系统」**；若当前偏好是「跟随系统」，点一次即按系统实际呈现态取反，并写成显式偏好，此后不再跟随系统。
- 与设置页「外观」行双向同步：在设置里切换，按钮图标立即跟随；点按钮，设置页的选中态也立即跟随。
- 侧栏折叠时按钮变为 36px 纯图标形态，照常可用（macOS 上侧栏折叠会整栏隐藏，属 DSH 原生行为，展开侧栏即可见）。

## 卸载 / 回滚

```bash
dsh plugin --profile desktop rm dsh-theme-toggle
```

或手动：从 `~/.dsh/profiles/desktop/package.json` 删掉 dependencies 行与 bundles 行 → 跑一次上面的 pnpm install → 重启 DSH。无任何残留配置。

## 换位置（可选）

默认在侧栏底部。想换地方，改 `lib/client.js` 顶部的 `TARGET_SLOT` 一个常量，重启即可。以下位置均为官方扩展位（`replaceRisk: none`，不影响 DSH 升级）：

| 值 | 位置 |
|---|---|
| `sidebar.footer.action`（默认） | 侧栏底部按钮行 |
| `sidebar.panellist` | 侧栏面板图标栏（会话浏览区上方那排全局图标） |
| `conversation.header.leading` | 会话页眉左上角（首页和会话里都在） |
| `shell.overlay` | 全局浮动层（适合做右下角悬浮按钮） |

## 开发与同步

本仓库就是插件的开发源码。要点：

- **免构建**：`lib/client.js` 是 DSH 直接加载的 Cordis client bundle，改完重启 DSH 即生效，无需编译。
- **本机开发可软链**：工作电脑上 `~/.dsh/profiles/desktop/node_modules/dsh-theme-toggle` 是指向本仓库目录的 junction，改完重启即生效；换机器开发则用「覆盖拷贝到 `local/` 和 `node_modules/` 两处 + 重启」的方式（只拷一处可能因硬链接断裂而加载旧代码）。
- **改完顺手升 `package.json` 的 version**，重启后一眼确认新版本生效。
- 改动确认无误后提交推送到本仓库，保证 GitHub 上的代码和本机跑的一致。
- 自带的开发工具（不随插件发布）：`tools/smoke-test.cjs` 桩件冒烟测试（`node tools/smoke-test.cjs`）、`tools/asar-read.cjs` 从 app.asar 抽官方源码核对契约。

## 已知边界

- DSH 的插件接口没有官方稳定性承诺，大版本升级后插件可能失灵——失灵表现为按钮消失，不会造成任何数据问题
- 按钮提示文字（tooltip）在 DSH 内切换界面语言后，要到下次主题切换才会刷新（仅提示文字，功能不受影响）
- 与同槽位其他插件（如 dsh-session-cleaner）纯布局共存：互不调用、互不影响，本插件被卸载后其他按钮自动恢复原宽

## License

[MIT](LICENSE)

---

## English

A tiny [DSH](https://github.com/deepseek-ai/deepseek-harness) (DeepSeek Harness) plugin that adds a **one-click light/dark toggle** to the sidebar footer — a 36px sun/moon icon button next to the native footer buttons, so you never have to dig through Settings → Appearance again. The preference is persisted through the settings scope and stays in sync with the Appearance row.

**Install (any platform)**

```bash
git clone https://github.com/jackxiao17/dsh-theme-toggle.git
dsh plugin --profile desktop add /path/to/dsh-theme-toggle
```

Then restart DSH. The moon/sun button appears at the bottom of the sidebar.

Manual install (same recipe as dsh-session-cleaner): copy the folder to `~/.dsh/profiles/desktop/local/dsh-theme-toggle`, add `"dsh-theme-toggle": "file:./local/dsh-theme-toggle"` to `dependencies` and `"dsh-theme-toggle"` to `dsh.profile.bundles` in that profile's `package.json`, run DSH's bundled pnpm install there, restart DSH.

**Usage**

- The icon shows what you'll get: moon while light (click → dark), sun while dark (click → light).
- Only light/dark — there is no "follow system" option; if your current preference is system, the first click pins the opposite of whatever your OS is showing.
- Two-way sync with Settings → Appearance.
- Works in the collapsed sidebar too (icon-only form; on macOS a collapsed sidebar hides entirely — native DSH behavior).

**Uninstall**

```bash
dsh plugin --profile desktop rm dsh-theme-toggle
```

**Moving the button** — change the `TARGET_SLOT` constant at the top of `lib/client.js` (all options are official `replaceRisk: none` seats): `sidebar.footer.action` (default), `sidebar.panellist`, `conversation.header.leading`, or `shell.overlay`.

**Development** — no build step: `lib/client.js` is loaded by DSH directly as a Cordis client bundle; edit and restart. On the author's machine `node_modules/dsh-theme-toggle` is a junction to this repo. Dev tools in `tools/` (not published): a stubbed smoke test and an app.asar extractor used to verify the theme-service contract.

**Known limits** — DSH's plugin API has no stability promise; after a major DSH upgrade the button may disappear (no data risk). The tooltip label refreshes on the next theme change after an in-app language switch (cosmetic only).

License: [MIT](LICENSE)
