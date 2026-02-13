import { withAgentDefaults } from "agent/defaults";
import type { AgentChatMessage } from "agent/types";
import {
    ChannelStore,
    FluxDispatcher,
    MessageActions,
    SelectedChannelStore,
    UserStore
} from "@vencord/types/webpack/common";
import { VesktopLogger } from "renderer/logger";
import { Settings } from "renderer/settings";

import {
    contentAllowed,
    nowMinuteWindow,
    shouldInvokeFromMessage
} from "./mediatorUtils";

interface CanonicalAttachment {
    id?: string;
    filename?: string;
    url?: string;
    contentType?: string;
    size?: number;
}

export interface CanonicalMessage {
    id: string;
    channelId: string;
    author: string;
    authorId?: string;
    content: string;
    timestamp: string;
    attachments: CanonicalAttachment[];
}

const invocationTimes = new Map<string, number[]>();
const lastHandledMessageByChannel = new Map<string, string>();
const inFlightChannels = new Set<string>();
const channelHistory = new Map<string, CanonicalMessage[]>();

function toCanonicalMessage(action: any): CanonicalMessage | null {
    const message = action?.message;
    if (!message?.id || !message?.channel_id) return null;

    const authorName = message.author?.global_name || message.author?.username || "unknown";

    return {
        id: String(message.id),
        channelId: String(message.channel_id),
        author: authorName,
        authorId: message.author?.id ? String(message.author.id) : undefined,
        content: typeof message.content === "string" ? message.content : "",
        timestamp: String(message.timestamp ?? new Date().toISOString()),
        attachments: Array.isArray(message.attachments)
            ? message.attachments.map((attachment: any) => ({
                id: attachment?.id ? String(attachment.id) : undefined,
                filename: attachment?.filename,
                url: attachment?.url,
                contentType: attachment?.content_type,
                size: attachment?.size
            }))
            : []
    };
}

function rememberMessage(message: CanonicalMessage) {
    const existing = channelHistory.get(message.channelId) ?? [];
    const next = [...existing, message].slice(-50);
    channelHistory.set(message.channelId, next);
}

function buildHistory(messages: CanonicalMessage[]): AgentChatMessage[] {
    return messages.slice(-12).map(message => ({
        role: "user",
        author: message.author,
        timestamp: message.timestamp,
        content: message.content.slice(0, 1200)
    }));
}

function isSlashInvocation(content: string, mentionName: string) {
    const slashName = mentionName.toLowerCase().replace(/^@/, "");
    return content.trimStart().toLowerCase().startsWith(`/${slashName}`);
}

async function handleChannelMessage(message: CanonicalMessage) {
    const settings = withAgentDefaults(Settings.store.agent);
    if (!settings.enabled) return;
    if (settings.enabledChannels?.length && !settings.enabledChannels.includes(message.channelId)) return;
    if (inFlightChannels.has(message.channelId)) return;

    const currentUserId = UserStore.getCurrentUser()?.id;
    if (message.authorId && currentUserId && message.authorId === currentUserId) return;

    const content = message.content.trim();
    if (!content) return;

    const invoked = shouldInvokeFromMessage(content, settings.mentionName!, settings.invocationPrefix!)
        || isSlashInvocation(content, settings.mentionName!);
    if (!invoked) return;
    if (!contentAllowed(content)) return;
    if (lastHandledMessageByChannel.get(message.channelId) === message.id) return;

    const bucket = invocationTimes.get(message.channelId) ?? [];
    const rate = nowMinuteWindow(bucket, settings.rateLimitPerMinute!);
    invocationTimes.set(message.channelId, rate.times);
    if (!rate.allowed) return;

    const history = channelHistory.get(message.channelId) ?? [message];
    const participants = Array.from(new Set(history.slice(-20).map(entry => entry.author).filter(Boolean)));
    const channel = ChannelStore.getChannel(message.channelId);
    const channelName = channel?.name ?? "unknown";

    const prompt = [
        `Channel ID: ${message.channelId}`,
        `Channel Name: ${channelName}`,
        `Participants: ${participants.join(", ")}`,
        "You are an AI participant in a shared Discord channel. Reply succinctly and helpfully.",
        `User invocation: ${content}`,
        message.attachments.length ? `Attachment count: ${message.attachments.length}` : ""
    ]
        .filter(Boolean)
        .join("\n");

    inFlightChannels.add(message.channelId);
    try {
        const reply = await VesktopNative.agent.chat(prompt, buildHistory(history), settings);
        if (!reply?.content) return;

        MessageActions.sendMessage(message.channelId, { content: reply.content.trim() });
        lastHandledMessageByChannel.set(message.channelId, message.id);
    } catch (err) {
        VesktopLogger.error("Agent reply failed", err);
    } finally {
        inFlightChannels.delete(message.channelId);
    }
}

export function initAgentMediator() {
    FluxDispatcher.subscribe("MESSAGE_CREATE", (action: any) => {
        const canonical = toCanonicalMessage(action);
        if (!canonical) return;

        rememberMessage(canonical);

        const selectedChannelId = SelectedChannelStore.getChannelId();
        if (selectedChannelId && canonical.channelId !== selectedChannelId) return;

        void handleChannelMessage(canonical);
    });
}
