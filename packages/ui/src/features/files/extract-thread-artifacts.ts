import type { AttachmentSummary } from "@openbot/contracts/ipc";
import { messageFileReferences } from "../conversation/FileReference";
import { messageCodeTargets, messageFileTargets } from "../conversation/MarkdownMessageText";

export type ThreadArtifactKind = "image" | "file" | "link" | "code";

export type ThreadArtifactTarget =
  | { kind: "attachment"; attachment: AttachmentSummary }
  | { kind: "workspace" | "shared"; path: string; asWritten?: string | undefined }
  | { kind: "link"; url: string }
  | { kind: "code"; code: string; language: string };

export interface ThreadArtifact {
  key: string;
  kind: ThreadArtifactKind;
  name: string;
  target: ThreadArtifactTarget;
  messageId: string;
}

export interface ThreadArtifactMessage {
  id: string;
  author: string;
  body: string;
  attachments?: readonly AttachmentSummary[] | undefined;
  streaming?: boolean | undefined;
}

const IMAGE_NAME_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)$/iu;
const WEB_LINK_PATTERN = /https?:\/\/[^\s<>"'`]+/giu;
const WEB_URL_PATTERN = /^https?:\/\/\S/iu;
const TRAILING_LINK_PUNCTUATION = ".,;:!?)]}";
const CODE_NAME_LENGTH = 80;

function artifactKind(name: string): ThreadArtifactKind {
  return IMAGE_NAME_PATTERN.test(name) ? "image" : "file";
}

function lastPathSegment(path: string): string {
  return path.split(/[/\\]/u).pop() ?? path;
}

function trimTrailingLinkPunctuation(url: string): string {
  let end = url.length;
  while (end > 0 && TRAILING_LINK_PUNCTUATION.includes(url.charAt(end - 1))) end -= 1;
  return url.slice(0, end);
}

function codeName(code: string): string {
  const line = code
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0);
  if (!line) return "";
  return line.length > CODE_NAME_LENGTH ? `${line.slice(0, CODE_NAME_LENGTH).trimEnd()}…` : line;
}

export function extractThreadArtifacts(messages: readonly ThreadArtifactMessage[]): ThreadArtifact[] {
  const artifacts: ThreadArtifact[] = [];
  const seen = new Set<string>();
  const add = (artifact: ThreadArtifact) => {
    if (seen.has(artifact.key)) return;
    seen.add(artifact.key);
    artifacts.push(artifact);
  };

  for (const message of [...messages].reverse()) {
    if (message.author !== "agent" || message.streaming) continue;
    const { id: messageId, body } = message;
    const attachments = message.attachments ?? [];

    for (const attachment of attachments) {
      add({
        key: `attachment:${attachment.id}`,
        kind: attachment.previewKind === "image" ? "image" : "file",
        name: attachment.name,
        target: { kind: "attachment", attachment },
        messageId,
      });
    }

    for (const reference of messageFileReferences(body, [...attachments])) {
      if (reference.kind === "attachment") {
        add({
          key: `attachment:${reference.attachment.id}`,
          kind: artifactKind(reference.name),
          name: reference.name,
          target: { kind: "attachment", attachment: reference.attachment },
          messageId,
        });
      } else {
        add({
          key: `shared:${reference.path}`,
          kind: artifactKind(reference.name),
          name: reference.name,
          target: { kind: "shared", path: reference.path },
          messageId,
        });
      }
    }

    for (const file of messageFileTargets([body])) {
      const name = lastPathSegment(file.path);
      add({
        key: `${file.kind}:${file.path}`,
        kind: artifactKind(name),
        name,
        target: {
          kind: file.kind,
          path: file.path,
          ...(file.asWritten === undefined ? {} : { asWritten: file.asWritten }),
        },
        messageId,
      });
    }

    for (const match of body.matchAll(WEB_LINK_PATTERN)) {
      const url = trimTrailingLinkPunctuation(match[0]);
      if (!WEB_URL_PATTERN.test(url)) continue;
      add({
        key: `link:${url}`,
        kind: "link",
        name: url,
        target: { kind: "link", url },
        messageId,
      });
    }

    for (const block of messageCodeTargets([body])) {
      add({
        key: `code:${block.language}:${block.code}`,
        kind: "code",
        name: codeName(block.code),
        target: { kind: "code", code: block.code, language: block.language },
        messageId,
      });
    }
  }

  return artifacts;
}
