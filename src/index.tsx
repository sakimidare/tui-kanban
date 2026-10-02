import "@opentui/react/runtime-plugin-support";

import { createCliRenderer } from "@opentui/core";
import { createRoot, useKeyboard, useRenderer } from "@opentui/react";
import { watch } from "node:fs";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createElement,
  useEffect,
  useState,
  type ComponentClass,
  type FunctionComponent,
} from "react";

const boardPath = resolve(import.meta.dir, "board.tsx");
const hotModuleDirectory = resolve(import.meta.dir, ".hot");

type BoardComponent = FunctionComponent | ComponentClass;

type BoardModule = { default: BoardComponent };

function isBoardModule(value: unknown): value is BoardModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "default" in value &&
    typeof value.default === "function"
  );
}

async function loadBoard(version: number): Promise<BoardComponent> {
  // Bun caches modules by canonical file path, so a query string alone does
  // not reload edited source. Import a versioned copy instead.
  await mkdir(hotModuleDirectory, { recursive: true });
  const hotModulePath = resolve(hotModuleDirectory, `board-${version}.tsx`);
  await copyFile(boardPath, hotModulePath);

  const loaded: unknown = await import(pathToFileURL(hotModulePath).href);
  if (!isBoardModule(loaded)) {
    throw new Error("src/board.tsx must contain a default exported React component");
  }

  return loaded.default;
}

function formatError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function App() {
  const renderer = useRenderer();
  const [Board, setBoard] = useState<BoardComponent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useKeyboard((key) => {
    if (key.name === "q" || key.name === "escape") {
      renderer.destroy();
    }
  });

  useEffect(() => {
    let disposed = false;
    let version = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reload = async () => {
      const requestedVersion = ++version;

      try {
        const NextBoard = await loadBoard(requestedVersion);
        if (disposed || requestedVersion !== version) return;

        setBoard(() => NextBoard);
        setError(null);
      } catch (cause) {
        if (disposed || requestedVersion !== version) return;
        setError(formatError(cause));
      }
    };

    void reload();

    const watcher = watch(dirname(boardPath), (_event, filename) => {
      if (filename?.toString() !== basename(boardPath)) return;

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reload(), 80);
    });

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      watcher.close();
      void rm(hotModuleDirectory, { recursive: true, force: true });
    };
  }, []);

  return (
    <box width="100%" height="100%" flexDirection="column">
      <box flexGrow={1} minHeight={0}>
        {Board ? createElement(Board) : <text>Loading src/board.tsx…</text>}
      </box>

      <box height={1} flexShrink={0} paddingX={1}>
        <text fg={error ? "#ff6b6b" : "#777777"} wrapMode="none">
          {error
            ? `Hotfix failed (rendering last version) : ${error}`
            : "Listening src/board.tsx · q / esc Quit"}
        </text>
      </box>
    </box>
  );
}

const renderer = await createCliRenderer({ exitOnCtrlC: true });
createRoot(renderer).render(<App />);
