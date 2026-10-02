# OpenTUI Agent Kanban

一个稳定运行的 OpenTUI React 宿主。Agent 可以直接修改 `src/board.tsx` 中的 OpenTUI JSX；宿主会动态加载新组件，不销毁 renderer，也不重启进程。

## 运行

需要 Bun 1.3 或更高版本。

```bash
bun install
bun run dev
```

保持程序运行，然后修改并保存 `src/board.tsx`。有效版本会立即显示；编译或加载失败时，终端会保留上一个有效版本，并在底部显示错误。

按 `q` 或 `Esc` 退出。

## 文件职责

- `src/index.tsx`：稳定宿主、文件监听、动态导入和错误回退。
- `src/board.tsx`：Agent 可直接编辑的 OpenTUI React 组件。

`board.tsx` 必须默认导出一个 React 组件。它可以直接使用 `@opentui/react` 提供的 `<box>`、`<text>` 等 JSX 元素，也可以导入 React hooks、`@opentui/react` 和 `@opentui/core`。

动态模块在宿主进程内执行，应当只加载可信代码。

## 检查类型

```bash
bun run typecheck
```
