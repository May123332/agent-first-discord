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

function buildHistory(messages: HTMLElement[]): AgentChatMessage[] {
    return messages.slice(-12).map(message => ({
        role: "user",
        content: message.innerText.slice(0, 1200)
    }));
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

        const { messages, latest, latestMessageId } = latestMessageData;
        if (lastHandledMessageByChannel.get(channel) === latestMessageId) return;

        const content = latest.innerText?.trim();
        if (!content || !shouldInvoke(content, settings.mentionName!, settings.invocationPrefix!)) return;
        if (!contentAllowed(content)) return;

        const bucket = invocationTimes.get(channel) ?? [];
        const rate = nowMinuteWindow(bucket, settings.rateLimitPerMinute!);
        invocationTimes.set(channel, rate.times);
        if (!rate.allowed) return;

        const participants = Array.from(document.querySelectorAll('[id^="message-username-"]'))
            .slice(-20)
            .map(node => (node as HTMLElement).innerText)
            .filter(Boolean);

        const prompt = [
            `Channel ID: ${channel}`,
            `Participants: ${Array.from(new Set(participants)).join(", ")}`,
            "You are an AI participant in a shared Discord channel. Reply succinctly and helpfully.",
            `User invocation: ${content}`
        ].join("\n");

        inFlightChannels.add(channel);
        VesktopNative.agent.chat(prompt, buildHistory(messages), settings)
            .then(reply => {
                if (!reply?.content) return;

                const composer = document.querySelector('[role="textbox"]') as HTMLElement | null;
                if (!composer) return;

                composer.focus();
                document.execCommand("insertText", false, reply.content);
                composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
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
