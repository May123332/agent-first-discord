import { agentMemoryStore } from "agent/memoryStore";
import { withAgentDefaults } from "agent/defaults";
import type { AgentChatMessage } from "agent/types";

import { VesktopLogger } from "./logger";
import { Settings } from "./settings";

const invocationTimes = new Map<string, number[]>();
const lastHandledMessageByChannel = new Map<string, string>();
const inFlightChannels = new Set<string>();

function nowMinuteWindow(times: number[], maxPerMinute: number) {
    const cutoff = Date.now() - 60_000;
    const next = times.filter(t => t >= cutoff);
    if (next.length >= maxPerMinute) return { allowed: false, times: next };
    next.push(Date.now());
    return { allowed: true, times: next };
}

function shouldInvoke(content: string, mentionName: string, prefix: string) {
    const lowered = content.toLowerCase();
    return lowered.includes(`@${mentionName.toLowerCase()}`) || lowered.trimStart().startsWith(prefix.toLowerCase());
}

function contentAllowed(content: string) {
    const blocked = ["token:", "password", "credit card"];
    return !blocked.some(s => content.toLowerCase().includes(s));
}

function getLatestMessageData() {
    const messages = Array.from(document.querySelectorAll('[id^="message-content-"]')) as HTMLElement[];
    if (!messages.length) return null;

    const latest = messages[messages.length - 1];
    return {
        messages,
        latest,
        latestMessageId: latest.id
    };
}

function getParticipants() {
    return Array.from(document.querySelectorAll('[id^="message-username-"]'))
        .slice(-20)
        .map(node => (node as HTMLElement).innerText)
        .filter(Boolean);
}

function toCanonicalMessage(content: string, participants: string[]): AgentChatMessage {
    return {
        role: "user",
        author: participants[participants.length - 1] || "User",
        content: content.slice(0, 1200),
        timestamp: new Date().toISOString()
    };
}

export function initAgentMediator() {
    const observer = new MutationObserver(() => {
        const settings = withAgentDefaults(Settings.store.agent);
        if (!settings.enabled) return;

        const channel = location.pathname.split("/").slice(-1)[0];
        if (settings.enabledChannels?.length && !settings.enabledChannels.includes(channel)) return;
        if (inFlightChannels.has(channel)) return;

        const latestMessageData = getLatestMessageData();
        if (!latestMessageData) return;

        const { latest, latestMessageId } = latestMessageData;
        if (lastHandledMessageByChannel.get(channel) === latestMessageId) return;

        const content = latest.innerText?.trim();
        if (!content || !shouldInvoke(content, settings.mentionName!, settings.invocationPrefix!)) return;
        if (!contentAllowed(content)) return;

        const bucket = invocationTimes.get(channel) ?? [];
        const rate = nowMinuteWindow(bucket, settings.rateLimitPerMinute!);
        invocationTimes.set(channel, rate.times);
        if (!rate.allowed) return;

        const participants = getParticipants();
        const canonicalUserMessage = toCanonicalMessage(content, participants);
        agentMemoryStore.appendMessage(channel, canonicalUserMessage, settings, participants);
        agentMemoryStore.maybeSummarize(channel, settings);
        const payload = agentMemoryStore.buildPromptPayload(channel, content, settings);

        inFlightChannels.add(channel);
        VesktopNative.agent.chat(payload.prompt, payload.history, settings)
            .then(reply => {
                if (!reply?.content) return;

                const composer = document.querySelector('[role="textbox"]') as HTMLElement | null;
                if (!composer) return;

                composer.focus();
                document.execCommand("insertText", false, reply.content);
                composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

                agentMemoryStore.appendMessage(channel, {
                    role: "assistant",
                    author: settings.mentionName,
                    content: reply.content,
                    timestamp: new Date().toISOString()
                }, settings, participants);
                agentMemoryStore.maybeSummarize(channel, settings);

                lastHandledMessageByChannel.set(channel, latestMessageId);
            })
            .catch(err => {
                VesktopLogger.error("Agent reply failed", err);
            })
            .finally(() => {
                inFlightChannels.delete(channel);
            });
    });

    observer.observe(document, { childList: true, subtree: true });
}
