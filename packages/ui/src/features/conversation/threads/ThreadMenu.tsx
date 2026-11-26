import {
  Archive,
  buttonVariants,
  ChevronDown,
  ChevronRight,
  DropdownMenu,
  IconButton,
  MessageCirclePlus,
  X,
} from "@openbot/ui";
import { createScrollFades } from "@openbot/ui/components/createScrollFades";
import { sidebarMessageTime } from "@openbot/ui/features/sidebar/sidebar-filtering";
import { useText } from "@openbot/ui/text";
import { createSignal, For, onCleanup, onSettled, Show } from "solid-js";
import { ThreadListFilter, threadMatchesQuery } from "./ThreadListFilter";
import { ThreadStatusMark, ThreadStatusText, ThreadTabIcon, threadAttention } from "./ThreadStatusMark";
import { ThreadTitle } from "./ThreadTitle";
import { tabNeedsAttention, useOffscreenTabs } from "./thread-tab-visibility";
import type { ThreadHeaderProps, ThreadRowMode, ThreadStem } from "./thread-types";

export function ThreadStemMark(props: { stem: ThreadStem }) {
  return (
    <span class="agent-threads-menu-stem" aria-hidden="true">
      <For each={props.stem.through}>
        {(line) => <span class={["agent-threads-stem-rail", line && "agent-threads-stem-line"]} />}
      </For>
      <span class={["agent-threads-stem-elbow", props.stem.last && "agent-threads-stem-last"]} />
    </span>
  );
}

function ThreadMenuList(props: ThreadHeaderProps & { query: string }) {
  const { t, format } = useText();
  const fades = createScrollFades();
  onSettled(() => fades.stop);
  const current = (id: string) => (id === props.activeId ? "true" : undefined);
  const matching = () =>
    props.threads.filter((thread) => threadMatchesQuery(props.query, thread.title, props.preview?.(thread.id)));
  const openTab = (id: string) => props.tabs.some((tab) => tab.id === id);
  return (
    <div class={["agent-threads-menu-list", fades.classes()]} ref={fades.bind} onScroll={fades.measure}>
      <For each={matching()}>
        {(thread) => (
          <DropdownMenu.Item
            class="agent-threads-menu-item"
            aria-current={current(thread.id)}
            onSelectAfterClose={() => props.onOpen(thread.id)}
          >
            <Show when={thread.stem}>{(stem) => <ThreadStemMark stem={stem()} />}</Show>
            <span class="fork-thread-text">
              <ThreadTitle class="agent-threads-menu-title" title={thread.title} />
              <Show when={props.preview?.(thread.id)}>
                {(text) => (
                  <span class="fork-thread-preview" dir="auto">
                    {text()}
                  </span>
                )}
              </Show>
            </span>
            <ThreadStatusMark status={thread.status} unread={thread.unread} />
            <span class="agent-threads-menu-time ui-menu-trailing">{sidebarMessageTime(thread.updatedAt, format)}</span>
            <Show when={openTab(thread.id) && props.onClose}>
              {(close) => (
                <IconButton
                  variant="ghost"
                  size="icon-xs"
                  class="fork-thread-close"
                  label={t("conversation.threads.closeTab")}
                  onPointerDown={stopEvent}
                  onPointerUp={stopEvent}
                  onMouseDown={stopEvent}
                  onClick={(event: MouseEvent) => {
                    stopEvent(event);
                    close()(thread.id);
                  }}
                >
                  <X aria-hidden="true" />
                </IconButton>
              )}
            </Show>
          </DropdownMenu.Item>
        )}
      </For>
      <Show when={props.query.trim() !== "" && matching().length === 0}>
        <p class="fork-thread-nomatch" role="status">
          {t("common.noMatches")}
        </p>
      </Show>
    </div>
  );
}

function stopEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

function ThreadMenuTrigger(props: ThreadHeaderProps & { mode: ThreadRowMode }) {
  const { t } = useText();
  const active = () => props.tabs.find((thread) => thread.id === props.activeId);
  const switcher = () => (props.mode === "compact" ? active() : undefined);
  const unreadInMenu = () =>
    props.threads.some(
      (thread) =>
        (thread.unread ?? 0) > 0 &&
        thread.id !== props.activeId &&
        (props.mode !== "tabs" || !props.tabs.some((tab) => tab.id === thread.id)),
    );
  const allLabel = () => t(unreadInMenu() ? "conversation.threads.allUnread" : "conversation.threads.all");
  const offscreen = useOffscreenTabs(() => props.tabs);
  const offscreenAttention = () => {
    const hidden = offscreen.hidden();
    return props.tabs.some((tab) => hidden.has(tab.id) && tabNeedsAttention(tab));
  };
  const dotLit = () => unreadInMenu() || offscreenAttention();
  return (
    <Show
      when={switcher()}
      fallback={
        <DropdownMenu.Trigger
          ref={offscreen.bind}
          class={buttonVariants({
            variant: "ghost",
            size: "icon-sm",
            class: "agent-threads-icon-button agent-threads-menu-button no-drag",
          })}
          aria-label={allLabel()}
          title={allLabel()}
        >
          <ChevronDown aria-hidden="true" />
          <Show when={dotLit()}>
            <span class="agent-threads-menu-unread" aria-hidden="true" />
          </Show>
        </DropdownMenu.Trigger>
      }
    >
      {(thread) => (
        <DropdownMenu.Trigger
          class={buttonVariants({ variant: "ghost", size: "sm", class: "agent-threads-switcher no-drag" })}
          data-attention={threadAttention(thread().status)}
          title={thread().title}
          aria-label={t("conversation.threads.current", { title: thread().title })}
          aria-description={unreadInMenu() ? t("conversation.threads.allUnread") : undefined}
        >
          <span class="agent-threads-switcher-icon" aria-hidden="true">
            <ThreadTabIcon status={thread().status} />
          </span>
          <ThreadTitle class="agent-threads-tab-title" title={thread().title} />
          <ThreadStatusText status={thread().status} />
          <ChevronDown class="agent-threads-switcher-chevron" aria-hidden="true" />
          <Show when={dotLit()}>
            <span class="agent-threads-menu-unread" aria-hidden="true" />
          </Show>
        </DropdownMenu.Trigger>
      )}
    </Show>
  );
}

function MenuCloseReset(props: { onClose: () => void }) {
  onCleanup(() => props.onClose());
  return null;
}

export function ThreadMenu(props: ThreadHeaderProps & { mode: ThreadRowMode }) {
  const { t, format } = useText();
  let archivedMenu: HTMLDivElement | undefined;
  let filterField: HTMLInputElement | undefined;
  const [query, setQuery] = createSignal("");
  // The filter keeps its keys: typing must not trigger the menu's own type-ahead.
  const filterKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") return;
    event.stopPropagation();
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    filterField?.closest(".agent-threads-menu")?.querySelector<HTMLElement>(".agent-threads-menu-item")?.focus();
  };
  return (
    <DropdownMenu.Root placement="bottom-start" gutter={4}>
      <ThreadMenuTrigger {...props} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="agent-threads-menu">
          <MenuCloseReset onClose={() => setQuery("")} />
          <Show when={props.threads.length > 0}>
            <ThreadListFilter
              value={query()}
              inputRef={(element) => {
                filterField = element;
                requestAnimationFrame(() => element.focus());
              }}
              onInput={setQuery}
              onKeyDown={filterKey}
            />
          </Show>
          <DropdownMenu.Item disabled={!props.canStartNew} onSelectAfterClose={props.onNew}>
            <MessageCirclePlus aria-hidden="true" />
            {t("conversation.threads.new")}
          </DropdownMenu.Item>
          <Show when={props.threads.length > 0}>
            <DropdownMenu.Separator />
            <ThreadMenuList {...props} query={query()} />
          </Show>
          <Show when={props.archived.length > 0 || props.olderArchived}>
            <DropdownMenu.Separator />
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>
                <Archive class="agent-context-icon size-4" aria-hidden="true" />
                <span>{t("conversation.threads.archived")}</span>
                <ChevronRight class="agent-context-submenu-chevron size-4" aria-hidden="true" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  ref={(element: HTMLDivElement) => {
                    archivedMenu = element;
                  }}
                  class="ui-action-menu agent-context-menu agent-context-submenu agent-threads-archived"
                >
                  <For each={props.archived}>
                    {(thread) => (
                      <DropdownMenu.Item
                        class="agent-threads-menu-item"
                        onSelectAfterClose={() => props.onRestore(thread.id)}
                      >
                        <ThreadTitle class="agent-threads-menu-title" title={thread.title} />
                        <span class="agent-threads-menu-time ui-menu-trailing">
                          {sidebarMessageTime(thread.updatedAt, format)}
                        </span>
                      </DropdownMenu.Item>
                    )}
                  </For>
                  <Show when={props.olderArchived}>
                    {(older) => (
                      <DropdownMenu.Item
                        class="agent-threads-menu-item"
                        closeOnSelect={false}
                        disabled={older().loading}
                        onSelect={() => {
                          archivedMenu?.focus();
                          props.onShowOlderArchived?.();
                        }}
                      >
                        {t("conversation.threads.archivedOlder")}
                      </DropdownMenu.Item>
                    )}
                  </Show>
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          </Show>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
