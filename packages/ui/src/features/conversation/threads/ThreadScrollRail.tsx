import { prefersReducedMotion } from "@openbot/ui/utils";
import { createMemo, createSignal, onCleanup } from "solid-js";
import {
  type ChatScrollQuestion,
  type ChatScrollRailProps,
  type ChatScrollRow,
  type ChatScrollSection,
  chatScrollQuestions,
} from "../ChatScrollRail";

function sameQuestions(left: readonly ChatScrollQuestion[], right: readonly ChatScrollQuestion[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const previous = left[index];
    const next = right[index];
    if (
      !previous ||
      !next ||
      previous.key !== next.key ||
      previous.label !== next.label ||
      previous.reply !== next.reply ||
      previous.index !== next.index
    )
      return false;
  }
  return true;
}

export function createThreadScrollRail<Row extends ChatScrollRow>(options: {
  rows: () => readonly Row[];
  question: (row: Row) => string | undefined;
  reply?: (row: Row) => string | undefined;
}): {
  ref: (element: HTMLElement) => void;
  listRef: (element: HTMLElement) => void;
  props: ChatScrollRailProps;
} {
  const [scrollElement, setScrollElement] = createSignal<HTMLElement>();
  const [revision, setRevision] = createSignal(0);
  let labels = new Map<string, string>();
  let scroller: HTMLElement | undefined;
  let content: HTMLElement | undefined;
  let resizes: ResizeObserver | undefined;
  let frame = 0;
  const schedule = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      setRevision((value) => value + 1);
    });
  };
  const observe = () => {
    resizes?.disconnect();
    resizes = undefined;
    if (!scroller) return;
    resizes = new ResizeObserver(() => schedule());
    resizes.observe(scroller);
    if (content) resizes.observe(content);
  };
  const questions = createMemo(
    () => {
      const read = chatScrollQuestions(options.rows(), options.question, labels, options.reply);
      labels = read.labels;
      return read.questions;
    },
    { equals: sameQuestions },
  );
  const sections = createMemo((): ChatScrollSection[] => {
    revision();
    const element = scrollElement();
    return questions().map((question) => {
      const message = element?.querySelector<HTMLElement>(`[data-chat-search-message="${CSS.escape(question.key)}"]`);
      const row = message?.closest<HTMLElement>(".virtual-chat-row");
      const start =
        element && row
          ? row.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop
          : undefined;
      return {
        key: question.key,
        label: question.label,
        ...(question.reply ? { reply: question.reply } : {}),
        start,
        row: question.index,
      };
    });
  });
  const onJump = (index: number) => {
    const section = sections()[index];
    const element = scrollElement();
    if (!element || section?.start === undefined) return;
    element.scrollTo({ top: section.start, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };
  const ref = (element: HTMLElement) => {
    scroller = element;
    setScrollElement(element);
    observe();
  };
  const listRef = (element: HTMLElement) => {
    content = element;
    observe();
  };
  onCleanup(() => {
    resizes?.disconnect();
    if (frame !== 0) cancelAnimationFrame(frame);
  });
  return { ref, listRef, props: { scrollElement, sections, onJump } };
}
