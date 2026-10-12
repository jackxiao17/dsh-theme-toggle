/**
 * dsh-theme-toggle — Host half.
 *
 * 这个插件的全部逻辑都在 client 半边（lib/client.js）：
 * 主题读取/切换走客户端 ctx.theme 服务，按钮挂载走 ctx.slots 注入。
 * Host 侧无事可做，保留一个空 apply 只是让加载器有一行可插入的 bundle。
 */
export const name = "dsh-theme-toggle";

export function apply() {
  // no-op：深浅色切换完全发生在客户端。
}
