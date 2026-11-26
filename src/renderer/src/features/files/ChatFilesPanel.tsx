import { canPreviewAttachment, type StoredFileRow } from "@openbot/contracts/ipc";
import type { AgentMessage } from "@openbot/ui/data";
import type { AgentPickerAgent } from "@openbot/ui/features/agents/AgentPicker";
import { ConversationFilesPanel } from "@openbot/ui/features/files/ConversationFilesPanel";
import { extractThreadArtifacts, type ThreadArtifact } from "@openbot/ui/features/files/extract-thread-artifacts";
import type { JSX } from "@solidjs/web";
import { createMemo } from "solid-js";
import { type FilesPort, filesPort } from "./files-port";
import { createStorageUsage } from "./storage-usage";

export type ChatFilesSource =
  | { scope: "conversation"; conversationId: string }
  | { scope: "channel"; channelId: string };

export default function ChatFilesPanel(props: {
  serverId: string;
  source: ChatFilesSource;
  conversationTitle: string;
  messages?: readonly AgentMessage[] | undefined;
  canManage: boolean;
  onClose: () => void;
  onPreviewFile: (file: StoredFileRow) => void;
  onShowMessage: (messageId: string) => void;
  onOpenArtifact?: (artifact: ThreadArtifact) => void;
  loadArtifactImage?: (artifact: ThreadArtifact) => Promise<string | null>;
  calls?: FilesPort | undefined;
  workspaceAgents: readonly AgentPickerAgent[];
  onOpenWorkspace: (agentId: string) => void;
  resizer?: JSX.Element;
}) {
  const storage = createStorageUsage(
    () => ({
      serverId: props.serverId,
      input: { ...props.source },
    }),
    () => props.calls ?? filesPort(),
  );
  let artifactCache: { signature: string; artifacts: readonly ThreadArtifact[] } | undefined;
  const artifacts = createMemo(() => {
    const messages = props.messages ?? [];
    const settled: string[] = [];
    const streaming: string[] = [];
    for (const message of messages) {
      if (message.streaming === true) streaming.push(message.id);
      else settled.push(`${message.id}:${message.author}:${message.body.length}:${message.attachments?.length ?? 0}`);
    }
    const signature = `${settled.join("|")}#${streaming.join(",")}`;
    if (artifactCache?.signature === signature) return artifactCache.artifacts;
    const next = extractThreadArtifacts(messages);
    artifactCache = { signature, artifacts: next };
    return next;
  });
  const usage = () => storage.state.usage;
  const bytes = () => {
    const source = props.source;
    const current = usage();
    if (source.scope === "conversation")
      return current?.conversations.find((chat) => chat.id === source.conversationId)?.bytes ?? 0;
    return current?.files.reduce((total, file) => total + file.size, 0) ?? 0;
  };
  const showInChat = {
    onShowInChat: (row: StoredFileRow) => {
      if (row.messageId) props.onShowMessage(row.messageId);
    },
  };
  return (
    <ConversationFilesPanel
      conversationTitle={props.conversationTitle}
      files={usage()?.files ?? []}
      chatBytes={bytes()}
      artifacts={artifacts()}
      onOpenArtifact={props.onOpenArtifact}
      onJumpToArtifact={props.onShowMessage}
      loadArtifactImage={props.loadArtifactImage}
      loading={storage.scanState() === "scanning" && !usage()}
      canDelete={props.canManage}
      error={storage.error()}
      onRetry={() => void storage.refresh(true)}
      onClose={props.onClose}
      onPreviewFile={(file) =>
        canPreviewAttachment(file) ? props.onPreviewFile(file) : void storage.fileAction(file, "open", showInChat)
      }
      onFileAction={(file, action) => storage.fileAction(file, action, showInChat)}
      workspaceAgents={props.workspaceAgents}
      onOpenWorkspace={props.onOpenWorkspace}
      resizer={props.resizer}
    />
  );
}
