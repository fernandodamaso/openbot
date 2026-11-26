// Fork: Alt+U opens the next item that needs the user (waiting, then failed, then unread) and focuses its composer.
import type { GlobalSearchAction } from "@openbot/ui/components/GlobalSearch";
import { onSettled } from "solid-js";
import { insideOverlay } from "./workspace-shortcuts";

const COMPOSER_SURFACE = '.composer-editor-surface[contenteditable="true"]';
const FOCUS_FRAMES = 30;

// The cursor: last opened item, and its index when it was opened (used if it left the list).
let lastId: string | undefined;
let lastIndex = -1;

function focusVisibleComposer(frames: number): void {
  const surface = [...document.querySelectorAll<HTMLElement>(COMPOSER_SURFACE)].find(
    (element) => element.getClientRects().length > 0 && element.closest("[role=menu], .sidebar-threads-card") === null,
  );
  if (surface) {
    surface.focus();
    return;
  }
  if (frames > 0) requestAnimationFrame(() => focusVisibleComposer(frames - 1));
}

function nextIndex(items: readonly GlobalSearchAction[]): number {
  const found = lastId === undefined ? -1 : items.findIndex((item) => item.id === lastId);
  if (found >= 0) return (found + 1) % items.length;
  return lastIndex >= 0 ? lastIndex % items.length : 0;
}

export function useNextAttentionShortcut(items: () => GlobalSearchAction[]): void {
  onSettled(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229) return;
      if (event.code !== "KeyU" || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (insideOverlay(event.target)) return;
      const list = items();
      if (list.length === 0) return;
      const index = nextIndex(list);
      const item = list[index];
      if (!item) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      lastId = item.id;
      lastIndex = index;
      item.run();
      requestAnimationFrame(() => focusVisibleComposer(FOCUS_FRAMES));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}
