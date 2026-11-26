import { createEffect, createSignal, onCleanup } from "solid-js";
import type { ThreadItem } from "./thread-types";

const EDGE_PX = 1;

// Fork: ids of the open tabs whose box lies outside the visible part of the tab strip.
export function offscreenTabIds(strip: Element): ReadonlySet<string> {
  const box = strip.getBoundingClientRect();
  const ids = new Set<string>();
  for (const tab of strip.querySelectorAll<HTMLElement>(".agent-threads-tab[data-thread-id]")) {
    const rect = tab.getBoundingClientRect();
    if (rect.right <= box.left + EDGE_PX || rect.left >= box.right - EDGE_PX) ids.add(tab.dataset.threadId ?? "");
  }
  return ids;
}

function sameIds(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const id of right) if (!left.has(id)) return false;
  return true;
}

// A tab that needs the user: its agent waits for an answer, or it has an unread reply.
export function tabNeedsAttention(tab: ThreadItem): boolean {
  return tab.status.kind === "waiting" || (tab.unread ?? 0) > 0;
}

// Tracks which open tabs are scrolled out of view. `bind` takes the element that sits in the same
// header as the tab strip (the thread menu trigger). Re-measures on scroll, resize and tab changes.
export function useOffscreenTabs(tabs: () => readonly ThreadItem[]) {
  const [hidden, setHidden] = createSignal<ReadonlySet<string>>(new Set());
  let anchor: Element | undefined;
  let strip: Element | undefined;
  let frame = 0;
  const resize = new ResizeObserver(() => schedule());
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(measure);
  };
  const trackStrip = (next: Element | undefined) => {
    if (next === strip) return;
    if (strip) {
      strip.removeEventListener("scroll", schedule);
      resize.unobserve(strip);
    }
    strip = next;
    if (strip) {
      strip.addEventListener("scroll", schedule, { passive: true });
      resize.observe(strip);
    }
  };
  const measure = () => {
    frame = 0;
    const header = anchor?.closest(".agent-threads-header");
    if (!strip?.isConnected || strip.closest(".agent-threads-header") !== header)
      trackStrip(header?.querySelector<HTMLElement>(".agent-threads-tabs") ?? undefined);
    const value = strip ? offscreenTabIds(strip) : new Set<string>();
    setHidden((current) => (sameIds(current, value) ? current : value));
  };
  createEffect(
    () => tabs(),
    () => schedule(),
  );
  onCleanup(() => {
    resize.disconnect();
    strip?.removeEventListener("scroll", schedule);
    if (frame !== 0) cancelAnimationFrame(frame);
  });
  return {
    hidden,
    bind: (element: Element | null) => {
      anchor = element ?? undefined;
      schedule();
    },
  };
}
