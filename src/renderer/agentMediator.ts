import { withAgentDefaults } from "agent/defaults";
import { checkAgentPolicy } from "agent/policy";
import type { AgentChatMessage, AgentInvocationContext } from "agent/types";

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

function parseChannelContext(): AgentInvocationContext {
    const [guildId, channelId] = location.pathname.split("/").slice(-2);
    return { guildId, channelId };
}

function sendComposerMessage(content: string) {
    const composer = document.querySelector('[role="textbox"]') as HTMLElement | null;
    if (!composer) return false;

    composer.focus();
    document.execCommand("insertText", false, content);
    composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    return true;
}

export function initAgentMediator() {
    const observer = new MutationObserver(() => {
        const settings = withAgentDefaults(Settings.store.agent);
        if (!settings.enabled) return;

        const context = parseChannelContext();
        const channel = context.channelId;
        if (!channel || inFlightChannels.has(channel)) return;

        const latestMessageData = getLatestMessageData();
        if (!latestMessageData) return;

        const { messages, latest, latestMessageId } = latestMessageData;
        if (lastHandledMessageByChannel.get(channel) === latestMessageId) return;

        const content = latest.innerText?.trim();
        if (!content || !shouldInvoke(content, settings.mentionName!, settings.invocationPrefix!)) return;
        if (!contentAllowed(content)) return;

        const policy = checkAgentPolicy(settings, context);
        if (!policy.allowed) {
            if (sendComposerMessage("agent disabled in this channel")) {
                lastHandledMessageByChannel.set(channel, latestMessageId);
            }
            return;
        }

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
        VesktopNative.agent.chat(prompt, buildHistory(messages), settings, context)
            .then(reply => {
                if (!reply?.content) return;

                if (sendComposerMessage(reply.content)) {
                    lastHandledMessageByChannel.set(channel, latestMessageId);
                }
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
