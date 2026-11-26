import type { AppTextKey } from "@openbot/i18n";
import { Button, Code, File, Image, Link } from "@openbot/ui";
import { useText } from "@openbot/ui/text";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import type { ThreadArtifact, ThreadArtifactKind } from "./extract-thread-artifacts";

type ArtifactFilter = "all" | ThreadArtifactKind;

export interface ThreadArtifactsViewProps {
  artifacts: readonly ThreadArtifact[];
  onOpen: (artifact: ThreadArtifact) => void;
  onJump: (messageId: string) => void;
  loadImage?: ((artifact: ThreadArtifact) => Promise<string | null>) | undefined;
}

const FILTERS: readonly { value: ArtifactFilter; label: AppTextKey }[] = [
  { value: "all", label: "files.type.all" },
  { value: "image", label: "files.type.images" },
  { value: "file", label: "conversation.globalSearch.tab.files" },
  { value: "code", label: "files.type.code" },
  { value: "link", label: "vault.link.name" },
];

const COPY_FEEDBACK_MS = 1_500;

function ArtifactJump(props: { artifact: ThreadArtifact; onJump: (messageId: string) => void }) {
  const { t } = useText();
  return (
    <Button
      variant="ghost"
      type="button"
      class="thread-artifacts-jump"
      onClick={(event) => {
        event.stopPropagation();
        props.onJump(props.artifact.messageId);
      }}
    >
      {t("conversation.globalSearch.hint.jump")}
    </Button>
  );
}

function ArtifactThumb(props: { artifact: ThreadArtifact; loadImage: ThreadArtifactsViewProps["loadImage"] }) {
  const [src, setSrc] = createSignal<string | null>(null);
  createEffect(
    () => props.artifact,
    (artifact) => {
      setSrc(null);
      const load = props.loadImage;
      if (!load) return;
      let live = true;
      load(artifact)
        .then((url) => {
          if (live) setSrc(url);
        })
        .catch(() => undefined);
      return () => {
        live = false;
      };
    },
  );
  return (
    <Show
      when={src()}
      fallback={
        <span class="thread-artifacts-thumb-missing" aria-hidden="true">
          <Image />
        </span>
      }
    >
      <img class="thread-artifacts-thumb" src={src() ?? undefined} alt="" />
    </Show>
  );
}

function CodeArtifactRow(props: { artifact: ThreadArtifact; onJump: (messageId: string) => void }) {
  const { t } = useText();
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const target = () => (props.artifact.target.kind === "code" ? props.artifact.target : undefined);
  const copy = async () => {
    const code = target()?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      setCopied(false);
    }
  };
  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });
  return (
    <li class="thread-artifacts-row">
      <Button variant="ghost" type="button" class="thread-artifacts-open" onClick={() => void copy()}>
        <Code aria-hidden="true" />
        <span class="thread-artifacts-code">
          <span class="thread-artifacts-code-text">{props.artifact.name}</span>
          <span class="thread-artifacts-code-language">{target()?.language || t("files.type.code")}</span>
        </span>
      </Button>
      <Button
        variant="ghost"
        type="button"
        class="thread-artifacts-copy"
        aria-label={copied() ? t("chat.code.copied") : t("chat.code.copy")}
        onClick={() => void copy()}
      >
        {copied() ? t("common.copied") : t("common.copy")}
      </Button>
      <ArtifactJump artifact={props.artifact} onJump={props.onJump} />
    </li>
  );
}

export function ThreadArtifactsView(props: ThreadArtifactsViewProps) {
  const { t } = useText();
  const [filter, setFilter] = createSignal<ArtifactFilter>("all");
  const countOf = (value: ArtifactFilter) =>
    value === "all" ? props.artifacts.length : props.artifacts.filter((artifact) => artifact.kind === value).length;
  const visible = () => {
    const value = filter();
    return value === "all" ? props.artifacts : props.artifacts.filter((artifact) => artifact.kind === value);
  };
  const images = () => visible().filter((artifact) => artifact.kind === "image");
  const codes = () => visible().filter((artifact) => artifact.kind === "code");
  const rows = () => visible().filter((artifact) => artifact.kind === "file" || artifact.kind === "link");
  return (
    <section class="thread-artifacts" aria-label={t("conversation.globalSearch.tab.files")}>
      <Show
        when={props.artifacts.length > 0}
        fallback={
          <div class="thread-artifacts-empty">
            <p>{t("files.conversation.emptyTitle")}</p>
            <p>{t("files.conversation.emptyDescription")}</p>
          </div>
        }
      >
        <fieldset class="thread-artifacts-filters">
          <For each={FILTERS}>
            {(item) => (
              <Button
                variant="ghost"
                type="button"
                class="thread-artifacts-filter"
                aria-pressed={filter() === item.value ? "true" : "false"}
                onClick={() => setFilter(item.value)}
              >
                {t(item.label)}
                <span class="thread-artifacts-count">{countOf(item.value)}</span>
              </Button>
            )}
          </For>
        </fieldset>
        <Show when={visible().length > 0} fallback={<p class="thread-artifacts-empty">{t("files.list.noMatches")}</p>}>
          <Show when={images().length > 0}>
            <ul class="thread-artifacts-grid">
              <For each={images()} keyed={(artifact) => artifact.key}>
                {(artifact) => (
                  <li class="thread-artifacts-tile">
                    <Button
                      variant="ghost"
                      type="button"
                      class="thread-artifacts-open"
                      onClick={() => props.onOpen(artifact())}
                    >
                      <ArtifactThumb artifact={artifact()} loadImage={props.loadImage} />
                      <span class="thread-artifacts-caption">{artifact().name}</span>
                    </Button>
                    <ArtifactJump artifact={artifact()} onJump={props.onJump} />
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Show when={rows().length > 0}>
            <ul class="thread-artifacts-list">
              <For each={rows()} keyed={(artifact) => artifact.key}>
                {(artifact) => (
                  <li class="thread-artifacts-row">
                    <Button
                      variant="ghost"
                      type="button"
                      class="thread-artifacts-open"
                      onClick={() => props.onOpen(artifact())}
                    >
                      {artifact().kind === "link" ? <Link aria-hidden="true" /> : <File aria-hidden="true" />}
                      <span>{artifact().name}</span>
                    </Button>
                    <ArtifactJump artifact={artifact()} onJump={props.onJump} />
                  </li>
                )}
              </For>
            </ul>
          </Show>
          <Show when={codes().length > 0}>
            <ul class="thread-artifacts-list">
              <For each={codes()} keyed={(artifact) => artifact.key}>
                {(artifact) => <CodeArtifactRow artifact={artifact()} onJump={props.onJump} />}
              </For>
            </ul>
          </Show>
        </Show>
      </Show>
    </section>
  );
}
