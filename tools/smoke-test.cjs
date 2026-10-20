/**
 * dsh-theme-toggle 冒烟测试（开发用，不随插件打包）。
 * 用最小桩件替换浏览器/React/DSH 服务，真实执行 lib/client.js 的
 * factory 与 apply()，验证：
 *   1. 插件入口导出（apply / inject）与 Slot 注册 descriptor（含 order 50）；
 *   2. 样式注入；CSS 为 36px 单图标按钮规格且不含已废弃的夺行规则；
 *   3. 渲染：浅色→月亮（目标态），深色→太阳；aria/title 正确；
 *   4. 点击取反：setTheme 收到 dark / light，图标随之翻转；
 *   5. theme/change 事件与 DOM 观察两条同步路径都能刷新图标；
 *   6. system 偏好（DOM 深色）下点击 → 显式 light；
 *   7. wide / rail 两种宿主形态渲染一致（控件不依赖 wide）；
 *   8. 主题服务抛错或异步拒绝时，点击不向宿主抛出也不留下未处理 rejection。
 *
 * 运行：node tools/smoke-test.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

// ───────────────────────── 浏览器桩件 ─────────────────────────

const bodyAttrs = new Set(); // 当前 body 属性（权威渲染态）
const styleProps = new Map();
// 观察者桩：属性变化时如实触发回调（模拟浏览器 MutationObserver）
const observers = [];
const notifyObservers = () => { observers.forEach((o) => { if (!o.disposed) o.cb(); }); };
const documentBody = {
  hasAttribute: (name) => bodyAttrs.has(name),
  setAttribute: (name) => { bodyAttrs.add(name); notifyObservers(); },
  removeAttribute: (name) => { bodyAttrs.delete(name); notifyObservers(); },
  style: {
    setProperty: (k, v) => styleProps.set(k, v),
    getPropertyValue: (k) => styleProps.get(k) ?? ""
  }
};
const styleTags = [];
global.document = {
  body: documentBody,
  head: { appendChild: (tag) => styleTags.push(tag) },
  createElement: () => ({ id: "", textContent: "", remove() {} }),
  getElementById: (id) => (styleTags.some((t) => t.id === id) ? {} : null)
};
global.window = {
  __ModuleLoader__: { load: (mod) => { global.__loadedModule = mod; } },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
};
global.MutationObserver = class {
  constructor(cb) { this.cb = cb; observers.push(this); }
  observe() {}
  disconnect() { this.disposed = true; }
};

// ───────────────────────── React 桩件 ─────────────────────────

const React = {
  // 函数类型（组件）立即渲染，贴近真实 React 的行为
  createElement: (type, props, ...children) => {
    if (typeof type === "function") {
      return type({ ...(props ?? {}), children: children.length <= 1 ? children[0] : children });
    }
    return { type, props: props ?? {}, children };
  },
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  useRef: () => ({ current: null }),
  useEffect: () => {}
};

// primitives 桩件：只保留用到的两个图标
const P = {
  IconLightOutlineRegular: function IconLightOutlineRegular() { return { type: "IconLightOutlineRegular" }; },
  IconDarkOutlineRegular: function IconDarkOutlineRegular() { return { type: "IconDarkOutlineRegular" }; }
};

// ───────────────────────── 加载插件 ─────────────────────────

const clientPath = path.join(__dirname, "..", "lib", "client.js");
eval(fs.readFileSync(clientPath, "utf8"));
if (!global.__loadedModule) throw new Error("client.js 没有调用 window.__ModuleLoader__.load");
const api = global.__loadedModule.factory((name) => (name === "react" ? React : P));

// ───────────────────────── DSH ctx 桩件 ─────────────────────────

const themeListeners = new Set();
let snapshot = { preference: "light", active: { colorScheme: "light" }, revision: 1 };
const setThemeCalls = [];
let registeredSlot = null;
const localeRegistrations = [];

const ctx = {
  effect(fn) { const off = fn(); return typeof off === "function" ? off : () => {}; },
  locale: {
    register(ns, dicts) { localeRegistrations.push({ ns, dicts }); },
    bind: () => (key) => key
  },
  on(event, cb) { if (event === "theme/change") themeListeners.add(cb); return () => themeListeners.delete(cb); },
  theme: {
    getTheme: () => snapshot,
    setTheme: (id) => {
      setThemeCalls.push(id);
      snapshot = { preference: id, active: { colorScheme: id }, revision: snapshot.revision + 1 };
      // 模拟 ThemePresenter：写/摘 body 属性并发 theme/change
      if (id === "dark") bodyAttrs.add("data-ds-dark-theme");
      else bodyAttrs.delete("data-ds-dark-theme");
      themeListeners.forEach((cb) => cb(snapshot));
    }
  },
  slots: {
    inject(name, cb) { return cb(); },
    register(descriptor, Component) { registeredSlot = { descriptor, Component }; return {}; }
  }
};

// ───────────────────────── 断言工具 ─────────────────────────

let passed = 0;
const check = (name, cond) => {
  if (cond) { passed++; console.log("  PASS  " + name); }
  else { console.error("  FAIL  " + name); process.exitCode = 1; }
};
const render = (props) => registeredSlot.Component(props ?? {});

// ───────────────────────── 用例 ─────────────────────────

console.log("smoke: dsh-theme-toggle");

// 1. 入口与注册
check("导出 apply 函数", typeof api.apply === "function");
check("inject 含 slots/locale/theme", ["slots", "locale", "theme"].every((k) => api.inject.includes(k)));
api.apply(ctx);
check("注册到 sidebar.footer.action", registeredSlot && registeredSlot.descriptor.name === "sidebar.footer.action");
check("order 50（排在回收站 order 30 之后）", registeredSlot.descriptor.order === 50);
check("词条含 toDark/toLight", localeRegistrations.some((r) => r.dicts.zh.toDark === "切换到深色模式" && r.dicts.en.toLight === "Switch to light mode"));
check("样式已注入", styleTags.length === 1 && styleTags[0].id === "dsh-theme-toggle-style");
check("CSS 为 36px 单图标按钮", styleTags[0].textContent.includes("width:36px;height:36px"));
check("CSS 不再含夺行规则（回归）", !styleTags[0].textContent.includes("data-tt-root"));

// 2. 浅色初始态：月亮 + toDark 提示
const v0 = render();
check("渲染单按钮 class=tt-btn", v0.props.className === "tt-btn");
check("按钮 type=button", v0.props.type === "button");
check("浅色显示月亮（目标态）", v0.children[0].type === "IconDarkOutlineRegular");
check("aria/title 为 toDark", v0.props["aria-label"] === "toDark" && v0.props.title === "toDark");

// 3. 点击 → setTheme('dark') → 太阳 + toLight
v0.props.onClick();
check("点击调用 setTheme('dark')", setThemeCalls.at(-1) === "dark");
const v1 = render();
check("事件路径：刷新为太阳", v1.children[0].type === "IconLightOutlineRegular");
check("aria/title 为 toLight", v1.props["aria-label"] === "toLight");

// 4. 再点 → setTheme('light') → 月亮
v1.props.onClick();
check("再次点击调用 setTheme('light')", setThemeCalls.at(-1) === "light");
check("刷新为月亮", render().children[0].type === "IconDarkOutlineRegular");

// 5. DOM 观察路径：无事件，只改 body 属性
documentBody.setAttribute("data-ds-dark-theme");
check("DOM 路径：识别深色并显示太阳", render().children[0].type === "IconLightOutlineRegular");
render().props.onClick();
check("DOM 深色点击 → setTheme('light')", setThemeCalls.at(-1) === "light");

// 6. wide / rail 渲染一致
check("wide 与 rail 渲染一致", JSON.stringify(render({ wide: true })) === JSON.stringify(render({ wide: false })));

// 7. 主题服务异常时不把错误抛给宿主（回归）
const realSetTheme = ctx.theme.setTheme;
let threw = false;
ctx.theme.setTheme = () => { throw new Error("boom"); };
try { render().props.onClick(); } catch { threw = true; }
check("setTheme 同步抛错时点击不外抛", threw === false);

// 异步拒绝若未被 catch，Node 会以未处理 rejection 终止进程——这条即是该场景的回归
threw = false;
ctx.theme.setTheme = () => Promise.reject(new Error("nope"));
try { render().props.onClick(); } catch { threw = true; }
check("setTheme 异步拒绝时点击不外抛", threw === false);
ctx.theme.setTheme = realSetTheme;

console.log(`smoke: ${passed} 项通过${process.exitCode ? "，存在失败" : ""}`);
