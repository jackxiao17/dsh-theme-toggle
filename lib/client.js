/**
 * dsh-theme-toggle — Client half.
 *
 * 在侧栏底部（sidebar.footer.action 官方扩展位）注入一个 36px 单图标按钮：
 *   - 当前浅色 → 显示月亮，点击切到深色；
 *   - 当前深色 → 显示太阳，点击切到浅色；
 * 图标显示的是"点击后会变成的样子"（目标态）。只提供 light/dark 两个
 * 显式选项的切换，不提供"跟随系统"；当前偏好若是 system，点击即按
 * 系统实际呈现态取反，并写成显式偏好。
 *
 * 状态来源双保险，任一失效图标都不过期：
 *   A. ctx.theme 服务：getTheme() 初值 + theme/change 事件
 *      （snapshot.active.colorScheme 已把 system 偏好解析成实际配色）；
 *   B. DOM 权威态：body[data-ds-dark-theme] 属性的 MutationObserver
 *      + prefers-color-scheme 媒体查询（ui-layout 的 ThemePresenter
 *      在每个快照上维护该属性，设置页手动切换时它是唯一变化的信号）。
 *
 * 写入只走 ctx.theme.setTheme()：ThemeRuntime 经设置作用域
 * （ui-theme 命名空间的 preference 字段）持久化，设置页"外观"行
 * 自动同步，无需插件自己碰任何配置文件。
 *
 * No build step: DSH loads this file as a Cordis client bundle via the
 * dsh.client declaration in package.json（与 dsh-session-cleaner 同款）。
 */
window.__ModuleLoader__.load({
  id: "dsh-theme-toggle",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { useSyncExternalStore } = React;
    const P = require("@deepseek-ai/dsh-client-ui-primitives");

    const h = (type, props, ...children) => React.createElement(type, props, ...children);

    const NS = "theme-toggle";

    // 注入位置：侧栏底部官方按钮行（replaceRisk: none），与「会话回收站」
    // （order 30）等同排，order 50 排在其后——单图标按钮并排是最自然的
    // 形态（回收站是通栏文字按钮，本按钮只占 36px，不影响它）。
    // 其他已验证安全的候选位：
    //   "sidebar.panellist"          侧栏面板图标栏（浏览区上方那排全局图标）
    //   "conversation.header.leading" 会话页眉左上角（single 槽，首页也在）
    //   "shell.overlay"              全局浮动层（可做右下角悬浮按钮）
    const TARGET_SLOT = "sidebar.footer.action";
    const TARGET_ORDER = 50;

    // apply(ctx) 时捕获的宿主上下文，点击回调里用 ctx.theme.setTheme。
    let hostCtx = undefined;

    const zh = {
      "toDark": "切换到深色模式",
      "toLight": "切换到浅色模式"
    };
    const en = {
      "toDark": "Switch to dark mode",
      "toLight": "Switch to light mode"
    };

    // ───────────────────────── 主题状态 store ─────────────────────────
    // 单一事实来源：当前是否为深色（布尔原语，useSyncExternalStore 友好）。
    // theme/change 事件与 DOM 观察都往这里写，set() 去重，不产生无谓重渲染。

    const readDomDark = () => {
      try { return document.body.hasAttribute("data-ds-dark-theme"); } catch { return false; }
    };

    let darkNow = readDomDark();
    const darkListeners = new Set();
    const darkStore = {
      subscribe(listener) { darkListeners.add(listener); return () => darkListeners.delete(listener); },
      getSnapshot() { return darkNow; },
      set(next) {
        if (next === darkNow) return;
        darkNow = next;
        darkListeners.forEach((listener) => listener());
      }
    };
    const useDark = () => useSyncExternalStore(darkStore.subscribe, darkStore.getSnapshot, darkStore.getSnapshot);

    const toggleTheme = () => {
      const theme = hostCtx && hostCtx.theme;
      if (!theme || typeof theme.setTheme !== "function") return;
      try {
        // 以"当前实际呈现态"取反；system 偏好下按系统实际颜色取反，
        // 并写成显式偏好（light/dark 为内置主题 id，未注册 id 会抛错）。
        const result = theme.setTheme(darkStore.getSnapshot() ? "light" : "dark");
        // setTheme 可能异步写设置作用域：失败只影响持久化，
        // 不该让一次点击变成未处理的 rejection 或未捕获异常。
        if (result && typeof result.catch === "function") result.catch(() => {});
      } catch { /* 主题服务异常时保持当前态，不把错误抛给宿主 */ }
    };

    // ───────────────────────── 控件 ─────────────────────────

    let boundT = (key) => key;

    function ThemeToggleButton() {
      const dark = useDark();
      const label = boundT(dark ? "toLight" : "toDark");
      // 深色下显示太阳（点了变浅），浅色下显示月亮（点了变深）。
      const Icon = dark ? P.IconLightOutlineRegular : P.IconDarkOutlineRegular;
      if (typeof Icon !== "function") return null;
      return h("button", {
        type: "button",
        className: "tt-btn",
        title: label,
        "aria-label": label,
        onClick: toggleTheme
      }, h(Icon, { size: 18 }));
    }

    // ───────────────────────── 样式 ─────────────────────────

    // 36px 图标按钮，规格对齐侧栏原生底部图标（如设置触发器的图标态）：
    // 透明底、悬停出浅底、8px 圆角。颜色全走 DSH 主题令牌，深浅色自动适配。
    const CSS = [
      ".tt-btn{",
      "  flex:none;display:flex;align-items:center;justify-content:center;",
      "  width:36px;height:36px;padding:0;margin:0;margin-inline-start:6px;",
      "  border:0;border-radius:var(--dsw-radius-md,8px);",
      "  background:transparent;cursor:pointer;",
      "  color:var(--dsw-alias-label-secondary,#67707c);",
      "  transition:background-color .15s ease,color .15s ease;",
      "  -webkit-app-region:no-drag;",
      "}",
      ".tt-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));color:var(--dsw-alias-label-primary,#1f2328);}",
      ".tt-btn:active{background:var(--dsw-alias-interactive-bg-active,rgba(127,127,127,.22));}",
      ".tt-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#3964fe);outline-offset:1px;}",
      "@media (prefers-reduced-motion:reduce){.tt-btn{transition:none;}}"
    ].join("\n");

    function injectStyle() {
      try {
        if (document.getElementById("dsh-theme-toggle-style")) return () => {};
        const tag = document.createElement("style");
        tag.id = "dsh-theme-toggle-style";
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => { try { tag.remove(); } catch { /* ignore */ } };
      } catch { return () => {}; }
    }

    // ───────────────────────── 插件入口 ─────────────────────────

    function apply(ctx) {
      hostCtx = ctx;

      // 卸载时释放宿主上下文；只在仍是本次 apply 的 ctx 时清空，
      // 避免热重载时旧实例的 dispose 抹掉新实例的引用。
      ctx.effect(() => () => { if (hostCtx === ctx) hostCtx = undefined; }, "theme-toggle: context");

      ctx.effect(() => injectStyle(), "theme-toggle: styles");
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "theme-toggle: dictionaries");
      boundT = ctx.locale.bind(NS);

      // 状态同步 A：theme/change 事件（快照路径，system 已解析）。
      ctx.effect(() => {
        darkStore.set(readDomDark());
        const off = ctx.on("theme/change", (snapshot) => {
          const scheme = snapshot && snapshot.active && snapshot.active.colorScheme;
          darkStore.set(typeof scheme === "string" ? scheme === "dark" : readDomDark());
        });
        return () => off();
      }, "theme-toggle: theme event subscription");

      // 状态同步 B：body 属性 + 系统媒体查询（DOM 路径）。
      // 覆盖设置页手动切换（只改 body 属性）与 OS 深浅色翻转。
      ctx.effect(() => {
        if (typeof MutationObserver !== "function" || !document.body) return () => {};
        const sync = () => darkStore.set(readDomDark());
        const observer = new MutationObserver(sync);
        observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
        const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
        const onMedia = () => sync();
        if (mq) {
          if (typeof mq.addEventListener === "function") mq.addEventListener("change", onMedia);
          else if (typeof mq.addListener === "function") mq.addListener(onMedia);
        }
        return () => {
          observer.disconnect();
          if (mq) {
            if (typeof mq.removeEventListener === "function") mq.removeEventListener("change", onMedia);
            else if (typeof mq.removeListener === "function") mq.removeListener(onMedia);
          }
        };
      }, "theme-toggle: DOM theme observation");

      ctx.slots.inject(TARGET_SLOT, () => ctx.slots.register({
        name: TARGET_SLOT,
        id: "theme-toggle",
        order: TARGET_ORDER,
        locale: NS,
        inject: () => ({})
      }, ThemeToggleButton));
    }

    const inject = ["slots", "locale", "theme"];

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
