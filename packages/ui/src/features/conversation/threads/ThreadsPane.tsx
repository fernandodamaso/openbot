import { Button, IconButton, MessageCirclePlus, PanelRight, X } from "@openbot/ui";
import { sidebarMessageTime } from "@openbot/ui/features/sidebar/sidebar-filtering";
import { useText } from "@openbot/ui/text";
import type { JSX } from "@solidjs/web";
import { createSignal, For, Show } from "solid-js";
import { ThreadListFilter, threadMatchesQuery } from "./ThreadListFilter";
import { ThreadStemMark } from "./ThreadMenu";
import { ThreadStatusMark } from "./ThreadStatusMark";
import { ThreadTitle } from "./ThreadTitle";
import type { ThreadItem } from "./thread-types";

export interface ThreadsPaneProps {
  threads: readonly ThreadItem[];
  activeId: string;
  besideIds: readonly string[];
  canStartNew: boolean;
  resizer?: JSX.Element;
  openIds?: readonly string[] | undefined;
  preview?: ((id: string) => string | undefined) | undefined;
  onCloseTab?: ((id: string) => void) | undefined;
  onOpen: (id: string) => void;
  onToggleBeside: (id: string) => void;
  onNew: () => void;
}

function ThreadsPaneRow(props: {
  thread: ThreadItem;
  current: boolean;
  beside: boolean;
  open: boolean;
  preview: string | undefined;
  onOpen: () => void;
  onToggleBeside: () => void;
  onCloseTab: (() => void) | undefined;
}) {
  const { t, format } = useText();
  const draft = () => props.thread.kind === "draft";
  return (
    <li class="threads-pane-item" data-beside={props.beside ? "" : undefined}>
      <Button
        variant="ghost"
        class="threads-pane-row"
        aria-current={props.current ? "true" : undefined}
        onClick={() => props.onOpen()}
      >
        <Show when={props.thread.stem}>{(stem) => <ThreadStemMark stem={stem()} />}</Show>
        <span class="fork-thread-text">
          <ThreadTitle class="threads-pane-title" title={props.thread.title} />
          <Show when={props.preview}>
            {(text) => (
              <span class="fork-thread-preview" dir="auto">
                {text()}
              </span>
            )}
          </Show>
        </span>
        <ThreadStatusMark status={props.thread.status} unread={props.thread.unread} />
        <Show when={!draft()}>
          <span class="threads-pane-time">{sidebarMessageTime(props.thread.updatedAt, format)}</span>
        </Show>
      </Button>
      <Show when={props.open && props.onCloseTab}>
        {(close) => (
          <IconButton
            variant="ghost"
            size="icon-xs"
            class="threads-pane-close fork-thread-close"
            label={t("conversation.threads.closeTab")}
            onClick={() => close()()}
          >
            <X aria-hidden="true" />
          </IconButton>
        )}
      </Show>
      <Show when={!draft()}>
        <IconButton
          variant="ghost"
          size="icon-xs"
          class="threads-pane-beside"
          label={t("conversation.threads.toSide")}
          aria-pressed={props.beside ? "true" : "false"}
          onClick={() => props.onToggleBeside()}
        >
          <PanelRight aria-hidden="true" />
        </IconButton>
      </Show>
    </li>
  );
}

export function ThreadsPane(props: ThreadsPaneProps) {
  const { t } = useText();
  const [query, setQuery] = createSignal("");
  const matching = () =>
    props.threads.filter((thread) => threadMatchesQuery(query(), thread.title, props.preview?.(thread.id)));
  const openTab = (id: string) => props.openIds?.includes(id) === true;
  return (
    <aside id="threads-panel" class="browser-panel threads-pane" aria-label={t("conversation.sidePanel.pane.threads")}>
      {props.resizer}
      <div class="threads-pane-scroll">
        <Show when={props.threads.length > 0}>
          <ThreadListFilter value={query()} onInput={setQuery} />
        </Show>
        <Show
          when={props.threads.length > 0}
          fallback={
            <div class="threads-pane-empty">
              <p class="threads-pane-empty-title">{t("conversation.threads.empty")}</p>
              <Button variant="secondary" size="sm" disabled={!props.canStartNew} onClick={() => props.onNew()}>
                <MessageCirclePlus aria-hidden="true" />
                {t("conversation.threads.new")}
              </Button>
            </div>
          }
        >
          <ul class="threads-pane-list" aria-label={t("conversation.threads.all")}>
            <For each={matching()} keyed={(thread) => thread.id}>
              {(thread) => (
                <ThreadsPaneRow
                  thread={thread()}
                  current={props.activeId === thread().id}
                  beside={props.besideIds.includes(thread().id)}
                  open={openTab(thread().id)}
                  preview={props.preview?.(thread().id)}
                  onCloseTab={props.onCloseTab ? () => props.onCloseTab?.(thread().id) : undefined}
                  onOpen={() => props.onOpen(thread().id)}
                  onToggleBeside={() => props.onToggleBeside(thread().id)}
                />
              )}
            </For>
          </ul>
          <Show when={query().trim() !== "" && matching().length === 0}>
            <p class="fork-thread-nomatch" role="status">
              {t("common.noMatches")}
            </p>
          </Show>
        </Show>
      </div>
    </aside>
  );
}
