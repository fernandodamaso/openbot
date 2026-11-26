import { prefersReducedMotion } from "@openbot/ui/utils";
import { createMemo, createSignal } from "solid-js";
import {
  type ChatScrollRailProps,
  type ChatScrollRow,
  type ChatScrollSection,
  chatScrollQuestions,
} from "../ChatScrollRail";

export function createThreadScrollRail<Row extends ChatScrollRow>(options: {
  rows: () => readonly Row[];
  question: (row: Row) => string | undefined;
  reply?: (row: Row) => string | undefined;
}): { ref: (element: HTMLElement) => void; props: ChatScrollRailProps } {
  const [scrollElement, setScrollElement] = createSignal<HTMLElement>();
  const [revision, setRevision] = createSignal(0);
  let labels = new Map<string, string>();
  let resizes: ResizeObserver | undefined;
  const questions = createMemo(() => {
    const read = chatScrollQuestions(options.rows(), options.question, labels, options.reply);
    labels = read.labels;
    return read.questions;
  });
  const sections = createMemo((): ChatScrollSection[] => {
    revision();
    const element = scrollElement();
    return questions().map((question) => {
      const message = element?.querySelector<HTMLElement>(
        `article[data-chat-search-message="${CSS.escape(question.key)}"]`,
      );
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
    setScrollElement(element);
    resizes?.disconnect();
    resizes = new ResizeObserver(() => setRevision((value) => value + 1));
    resizes.observe(element);
  };
  return { ref, props: { scrollElement, sections, onJump } };
}
