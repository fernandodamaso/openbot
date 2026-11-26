import { markdownPlainText } from "@openbot/contracts/markdown-preview-text";

export const CODE_FOLD_MIN_LINES = 25;
export const CODE_FOLD_PREVIEW_LINES = 6;
export const REPLY_FOLD_MIN_CHARACTERS = 1_500;

const REPLY_FOLD_HEADING_CHARACTERS = 120;
const REPLY_FOLD_SUMMARY_CHARACTERS = 160;
const LINE_PREFIX_MARKUP = /^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/u;
const FENCE_LINE = /^\s*(?:`{3,}|~{3,})/u;
const foldedReplies = new Set<string>();
const expandedCodeBlocks = new Set<string>();

export function codeBlockKey(code: string): string {
  return `${code.length}:${code.slice(0, 64)}`;
}

export function isCodeBlockExpanded(key: string): boolean {
  return expandedCodeBlocks.has(key);
}

export function setCodeBlockExpanded(key: string, expanded: boolean): void {
  if (expanded) expandedCodeBlocks.add(key);
  else expandedCodeBlocks.delete(key);
}

export function replyFoldSummary(text: string): { heading: string; summary: string } {
  const [heading = "", summary = ""] = leadingPlainLines(text, 2);
  return {
    heading: clipText(heading, REPLY_FOLD_HEADING_CHARACTERS),
    summary: clipText(summary, REPLY_FOLD_SUMMARY_CHARACTERS),
  };
}

export function isReplyFolded(id: string): boolean {
  return foldedReplies.has(id);
}

export function setReplyFolded(id: string, folded: boolean): void {
  if (folded) foldedReplies.add(id);
  else foldedReplies.delete(id);
}

function leadingPlainLines(text: string, count: number): string[] {
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    if (lines.length >= count) break;
    if (FENCE_LINE.test(line)) continue;
    const plain = markdownPlainText(line.replace(LINE_PREFIX_MARKUP, "")).replace(/\s+/gu, " ").trim();
    if (plain) lines.push(plain);
  }
  return lines;
}

function clipText(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
