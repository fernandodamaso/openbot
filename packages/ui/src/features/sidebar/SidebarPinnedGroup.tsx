import { coordinatorText } from "@openbot/contracts/coordinator-text";
import { Badge, buttonVariants, ContextMenu } from "@openbot/ui";
import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { useText } from "../../text";
import { ChannelAvatar } from "../channels/ChannelAvatar";
import { threadWantsUser } from "../conversation/threads/fork-thread-attention";
import { SidebarAgentContextMenu } from "./SidebarAgentContextMenu";
import { SidebarAgentIndicator, SidebarPinnedAvatar } from "./SidebarAgentIndicator";
import { ThreadRow } from "./SidebarAgentThreads";
import { SidebarChannelContextMenu } from "./SidebarChannelContextMenu";
import { SidebarNameTooltip } from "./SidebarNameTooltip";
import { sidebarUnreadBadge } from "./sidebar-agent-states";
import { sidebarAgentStateLabel } from "./sidebar-filtering";
import { sidebarPinnedItemKey } from "./sidebar-pins";
import { useSidebarScope } from "./sidebar-scope";
import type { SidebarChatItem } from "./sidebar-types";

export function SidebarPinnedGroup() {
  const {
    emptyPinnedDropVisible,
    dragOffset,
    dragOverPinnedKey,
    draggedPinnedKey,
    listFiltered,
    movePinnedItem,
    pinnedDropActive,
    props,
    resolvedPinnedItems,
    startNativeItemDragging,
    stopSidebarDragging,
  } = useSidebarScope();
  const { t, format, sourceText } = useText();
  const chatName = (chat: SidebarChatItem) => (chat.kind === "agent" ? chat.agent.name : chat.channel.name);
  const chatIsActive = (chat: SidebarChatItem) =>
    chat.kind === "agent" ? props.activeAgentId === chat.id : props.activeChannelId === chat.id;
  const selectChat = (chat: SidebarChatItem) => {
    if (chat.kind === "agent") props.onSelectAgent(chat.id);
    else props.onSelectChannel?.(chat.id);
  };
  const attentionThreads = createMemo(() => {
    const model = props.agentThreads;
    if (!model) return [];
    return resolvedPinnedItems().flatMap((item) =>
      item.chat.kind === "agent"
        ? model
            .threads(item.chat.id)
            .filter(threadWantsUser)
            .map((thread) => ({ agentId: item.chat.id, thread }))
        : [],
    );
  });
  createEffect(
    () =>
      resolvedPinnedItems()
        .map((item) => item.chat.id)
        .join("\n"),
    () => {
      const model = props.agentThreads;
      if (!model) return;
      for (const item of resolvedPinnedItems()) if (item.chat.kind === "agent") model.load(item.chat.id);
    },
  );
  return (
    <Show when={resolvedPinnedItems().length > 0 || emptyPinnedDropVisible()}>
      <section
        class={[
          "sidebar-chat-group sidebar-pinned-group",
          {
            "sidebar-pinned-group-agent-drop-target": pinnedDropActive(),
            "sidebar-pinned-group-empty-target": emptyPinnedDropVisible(),
          },
        ]}
        aria-label={t("sidebar.pinned.label")}
      >
        <ul class="sidebar-pinned-list" data-dragging={draggedPinnedKey() ? "" : undefined}>
          <Show when={emptyPinnedDropVisible()}>
            <li class="sidebar-pinned-empty-drop">{t("sidebar.pinned.dropHint")}</li>
          </Show>
          <For each={resolvedPinnedItems()}>
            {(item) => {
              const key = () => sidebarPinnedItemKey(item.ref);
              const name = () => chatName(item.chat);
              const active = () => chatIsActive(item.chat);
              const agentId = () => (item.chat.kind === "agent" ? item.chat.id : undefined);
              const agentThreads = () => {
                const id = agentId();
                const model = props.agentThreads;
                return id === undefined || !model ? [] : model.threads(id).filter(threadWantsUser);
              };
              const agentState = () => {
                const id = agentId();
                if (id === undefined) return undefined;
                const own = props.agentStates[id];
                if (own?.kind === "waiting" || (own?.kind === "unread" && own.count > 0)) return own;
                const count = agentThreads().length;
                return count > 0 ? { kind: "unread" as const, count: Math.min(count, 99) } : own;
              };
              const attention = () => {
                const id = agentId();
                if (id === undefined) return false;
                const own = props.agentStates[id];
                if (own?.kind === "waiting") return true;
                if (props.mutedAgentIds?.has(id) ?? false) return false;
                return (own?.kind === "unread" && own.count > 0) || agentThreads().length > 0;
              };
              const [menuOpen, setMenuOpen] = createSignal(false);
              const pinnedPreview = () => {
                if (item.chat.kind === "agent") return item.chat.agent.preview;
                const lastMessage = item.chat.channel.lastMessage;
                if (lastMessage) return coordinatorText(lastMessage.author, lastMessage.text, sourceText);
                return props.channelPreviewsPending === true ? undefined : t("sidebar.channel.noMessages");
              };
              const channelWait = () => (item.chat.kind === "channel" ? props.channelWaits?.[item.chat.id] : undefined);
              const channelBadge = createMemo(() =>
                item.chat.kind === "channel"
                  ? sidebarUnreadBadge(item.chat.channel.unreadCount, channelWait())
                  : undefined,
              );
              const stateLabel = () => {
                const state = item.chat.kind === "agent" ? props.agentStates[item.chat.id] : channelWait();
                return state?.kind === "routine" || state?.kind === "waiting" || state?.kind === "limited"
                  ? sidebarAgentStateLabel(state, t, format)
                  : "";
              };
              const rowLabel = () => {
                if (item.chat.kind === "channel") {
                  return stateLabel()
                    ? t("sidebar.pinned.channelWithState", { name: name(), state: stateLabel() })
                    : t("sidebar.pinned.channel", { name: name() });
                }
                return stateLabel()
                  ? t("sidebar.pinned.agentWithState", { name: name(), state: stateLabel() })
                  : t("sidebar.pinned.agent", { name: name() });
              };
              return (
                <li
                  class={[
                    "sidebar-pinned-item",
                    {
                      "sidebar-pinned-item-dragging": draggedPinnedKey() === key(),
                      "sidebar-pinned-item-drag-over": dragOverPinnedKey() === key(),
                    },
                  ]}
                  style={`--sidebar-drag-x: ${dragOffset(key()).x}px; --sidebar-drag-y: ${dragOffset(key()).y}px;`}
                  data-pinned-key={key()}
                  draggable={listFiltered() ? "false" : "true"}
                  onDragStart={(event) => {
                    startNativeItemDragging(event, {
                      className: "sidebar-pinned-drag-preview",
                      data: key(),
                      source: { kind: "pinned", id: item.chat.id, key: key(), origin: "pinned" },
                    });
                  }}
                  onDragEnd={stopSidebarDragging}
                  onKeyDown={(event) => {
                    if (!event.altKey) return;
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      movePinnedItem(key(), -1);
                    } else if (event.key === "ArrowRight") {
                      event.preventDefault();
                      movePinnedItem(key(), 1);
                    }
                  }}
                >
                  <SidebarNameTooltip
                    name={name()}
                    title={item.chat.kind === "agent" ? item.chat.agent.title : item.chat.channel.title}
                    preview={pinnedPreview()}
                    detail={stateLabel()}
                    menuOpen={menuOpen()}
                  >
                    <ContextMenu.Root modal={false} onOpenChange={setMenuOpen}>
                      <ContextMenu.Trigger
                        as="button"
                        type="button"
                        class={[
                          buttonVariants({ variant: "ghost" }),
                          "agent-row sidebar-pinned-row",
                          { "agent-row-active": active() },
                        ]}
                        aria-label={rowLabel()}
                        title={props.compact ? undefined : stateLabel() || undefined}
                        aria-pressed={active() ? "true" : "false"}
                        data-attention={attention() && !active() ? "" : undefined}
                        data-cuelume-navigate=""
                        onClick={() => selectChat(item.chat)}
                      >
                        <Switch>
                          <Match when={item.chat.kind === "agent" ? item.chat.agent : undefined}>
                            {(agent) => (
                              <>
                                <SidebarPinnedAvatar
                                  agent={agent()}
                                  mood={props.agentMoods[agent().id] ?? "idle"}
                                  agentState={agentState}
                                />
                                <span class="agent-row-copy sidebar-pinned-copy">
                                  <strong class="sidebar-pinned-name" title={name()}>
                                    {name()}
                                  </strong>
                                  <Show when={agent().title.trim()}>
                                    {(label) => (
                                      <Badge class="sidebar-pinned-title" title={label()}>
                                        <span>{label()}</span>
                                      </Badge>
                                    )}
                                  </Show>
                                </span>
                                <Show when={agentState()}>
                                  {(state) => <span class="sr-only">{sidebarAgentStateLabel(state(), t, format)}</span>}
                                </Show>
                              </>
                            )}
                          </Match>
                          <Match when={item.chat.kind === "channel" ? item.chat.channel : undefined}>
                            {(channel) => (
                              <>
                                <span class="agent-row-avatar sidebar-pinned-avatar">
                                  <ChannelAvatar
                                    members={channel().members}
                                    agents={props.agents}
                                    layout="cluster"
                                    icon={channel().icon}
                                    imageUrl={channel().imageUrl}
                                  />
                                  <SidebarAgentIndicator state={channelBadge} />
                                </span>
                                <span class="agent-row-copy sidebar-pinned-copy">
                                  <strong class="sidebar-pinned-name" title={name()}>
                                    {name()}
                                  </strong>
                                  <Show when={channel().title.trim()}>
                                    {(label) => (
                                      <Badge class="sidebar-pinned-title" title={label()}>
                                        <span>{label()}</span>
                                      </Badge>
                                    )}
                                  </Show>
                                </span>
                                <Show when={channel().unreadCount > 0}>
                                  <span class="sr-only">
                                    {t("sidebar.channel.unread", { count: channel().unreadCount })}
                                  </span>
                                </Show>
                              </>
                            )}
                          </Match>
                        </Switch>
                      </ContextMenu.Trigger>
                      <Switch>
                        <Match when={item.chat.kind === "agent" ? item.chat.agent : undefined}>
                          {(agent) => <SidebarAgentContextMenu agent={agent()} pinned={true} />}
                        </Match>
                        <Match when={item.chat.kind === "channel" ? item.chat.channel : undefined}>
                          {(channel) => <SidebarChannelContextMenu channel={channel()} pinned={true} />}
                        </Match>
                      </Switch>
                    </ContextMenu.Root>
                  </SidebarNameTooltip>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={props.agentThreads}>
          {(model) => (
            <Show when={attentionThreads().length > 0}>
              <div class="sidebar-threads sidebar-pinned-threads" data-open="">
                <ul class="sidebar-threads-list" aria-label={t("conversation.tasks.title")}>
                  <For each={attentionThreads()}>
                    {(entry, index) => (
                      <ThreadRow
                        model={model()}
                        agentId={entry.agentId}
                        thread={entry.thread}
                        current={model().openId(entry.agentId) === entry.thread.id}
                        index={index()}
                        onOpen={() => model().onOpen(entry.agentId, entry.thread.id)}
                      />
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          )}
        </Show>
      </section>
    </Show>
  );
}
