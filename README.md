# OpenTUI Agent Kanban

一个支持 **AI Agent 实时编写终端界面** 的 OpenTUI React 项目。

运行 TUI 后，Agent 可以直接修改 `src/board.tsx`，使用原生 OpenTUI React JSX 构建界面。宿主会监听文件并动态加载新组件，整个过程不需要重启进程，也不会销毁 OpenTUI renderer。

## 它解决什么问题

通常，修改终端应用源码需要重新启动进程。这个项目把应用拆成两部分：

```text
src/index.tsx                 src/board.tsx
稳定宿主                     Agent 可编辑界面
    │                              │
    │ 监听文件变化                 │ 保存 TSX
    └──────────── 动态加载 ────────┘
                   │
                   ▼
             OpenTUI React 重渲染
```

- `src/index.tsx` 长期运行，持有 renderer、React root 和文件监听器。
- `src/board.tsx` 是实时画布，Agent 可以直接编写 OpenTUI 组件。
- 保存有效代码后，宿主在原进程内替换组件。
- 新代码加载失败时，继续显示最后一个有效版本，并在底部状态栏展示错误。

这不是通过 JSON 描述界面，也不要求额外的项目专用 DSL。Agent 直接使用 `@opentui/react` API。

## 环境要求

- [Bun](https://bun.sh/) 1.3 或更高版本
- 支持现代终端控制序列的终端模拟器

## 安装和运行

安装依赖：

```bash
bun install
```

启动实时 TUI：

```bash
bun run dev
```

程序运行后：

1. 保持当前 TUI 进程运行。
2. 手动编辑或让 Agent 编辑 `src/board.tsx`。
3. 保存文件。
4. 当前终端中的界面会自动刷新。

按 `q` 或 `Esc` 退出。

> 修改 `src/board.tsx` 时不要使用 `bun run --watch`，也不需要杀掉并重新启动 TUI。文件热加载由宿主自身完成。

## 让 Agent 使用

直接告诉 Agent 你希望看到的界面，例如：

```text
请修改 src/board.tsx，创建三列终端看板。
左侧显示待办任务，中间显示进行中的任务，右侧显示已完成任务。
支持方向键选择任务，并保持布局紧凑。
```

仓库根目录的 [`AGENTS.md`](./AGENTS.md) 已向 Agent 说明：

- 应该编辑哪个文件；
- 如何直接使用 OpenTUI React；
- 如何设计终端布局；
- 为什么不应重启现有进程；
- 修改后如何进行类型检查。

## 编写实时组件

`src/board.tsx` 必须默认导出一个 React 组件：

```tsx
export default function Board() {
  return (
    <box width="100%" height="100%" flexDirection="column">
      <box height={3} border paddingX={1}>
        <text fg="cyan">My live OpenTUI</text>
      </box>

      <box flexGrow={1} minHeight={0}>
        <text>保存文件后，这里会立即更新。</text>
      </box>
    </box>
  );
}
```

可以直接使用 OpenTUI React JSX 元素，例如：

- `<box>`
- `<text>`
- `<input>`
- `<textarea>`
- `<select>`
- `<scrollbox>`
- `<ascii-font>`

也可以使用 React state 和 OpenTUI hooks：

```tsx
import { useKeyboard } from "@opentui/react";
import { useState } from "react";

export default function Board() {
  const [count, setCount] = useState(0);

  useKeyboard((key) => {
    if (key.name === "left") setCount((value) => value - 1);
    if (key.name === "right") setCount((value) => value + 1);
  });

  return (
    <box width="100%" height="100%" alignItems="center" justifyContent="center">
      <text>使用左右方向键：{count}</text>
    </box>
  );
}
```

可从以下公开入口导入 API：

```tsx
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { useEffect, useState } from "react";
```

不要从包的内部源码路径进行深层导入。

## 热加载机制

宿主监听 `src/board.tsx` 所在目录。保存文件后：

1. 文件监听器收到变更事件；
2. 连续的保存事件经过短暂防抖；
3. 源文件被复制为 `src/.hot/board-<version>.tsx`；
4. Bun 动态导入这个版本化模块；
5. 宿主校验模块是否默认导出了组件；
6. React 使用新组件重新渲染界面。

使用版本化文件是必要的，因为 Bun 会按规范化文件路径缓存已导入的模块，仅在 URL 后添加查询参数不足以可靠地重新加载源码。

`src/.hot/` 是自动生成的临时目录，已被 Git 忽略。不要手动编辑或依赖其中的文件。

## 发生错误时

如果 `src/board.tsx` 存在语法错误、导入错误，或者没有默认导出组件：

- 宿主进程不会退出；
- renderer 不会被销毁；
- 上一个成功加载的界面继续显示；
- 底部状态栏会显示热更新错误。

修复 `src/board.tsx` 并再次保存即可恢复，无需重启。

注意：成功替换模块时，`src/board.tsx` 内部的局部 React state 可能会重置。需要跨版本长期保存的数据应该放在稳定宿主或外部持久化层中。

## 项目结构

```text
.
├── AGENTS.md          # Agent 使用和开发规范
├── README.md          # 项目文档
├── package.json       # 运行脚本和依赖
├── tsconfig.json      # TypeScript 和 JSX 配置
└── src/
    ├── index.tsx      # 稳定宿主，不用于普通界面修改
    ├── board.tsx      # Agent 实时编辑的 OpenTUI 组件
    └── .hot/          # 自动生成的动态模块，Git 忽略
```

## 可用命令

启动 TUI：

```bash
bun run dev
```

`start` 与 `dev` 当前行为相同：

```bash
bun run start
```

执行 TypeScript 检查：

```bash
bun run typecheck
```

## 开发约定

- 普通界面和内容更新只修改 `src/board.tsx`。
- 不要为了应用 `board.tsx` 的修改而编辑 `src/index.tsx`。
- 不要同时启动多个 TUI 实例。
- 终端布局使用字符单元而不是像素。
- 相邻面板应紧凑排列，避免网页式的大间距和外边距。
- 等宽列建议使用 `flexGrow={1}`、`flexBasis={0}` 和 `minWidth={0}`。
- 修改后运行 `bun run typecheck`。

## 安全说明

`src/board.tsx` 是在宿主进程内执行的可信代码，而不是沙箱配置。它拥有与当前 Bun 进程相同的权限，包括读取文件、访问网络和导入依赖的能力。

只允许可信 Agent 或可信用户修改并加载该文件。如果需要执行不可信代码，应使用独立用户、容器或单独进程进行隔离。
