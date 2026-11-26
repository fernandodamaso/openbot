export interface MessageFileTarget {
  kind: "shared" | "workspace";
  path: string;
}

export function messageFileTargetOf(target: EventTarget | null): MessageFileTarget | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>("[data-file-path]");
  const path = element?.dataset.filePath;
  const kind = element?.dataset.fileKind;
  if (!path || (kind !== "shared" && kind !== "workspace")) return null;
  return { kind, path };
}
