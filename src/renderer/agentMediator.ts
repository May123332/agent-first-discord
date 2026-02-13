import { withAgentDefaults } from "agent/defaults";
import { buildChannelMemory, type ChannelMessageSnapshot } from "agent/core/memory";
import { assembleChannelPrompt } from "agent/core/prompt";
import { isContentAllowed, shouldInvokeAgent } from "agent/core/policy";
import { applyMinuteRateLimit } from "agent/core/rateLimit";

import { VesktopLogger } from "./logger";
import { Settings } from "./settings";

const invocationTimes = new Map<string, number[]>();
const lastHandledMessageByChannel = new Map<string, string>();
const inFlightChannels = new Set<string>();

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

function toSnapshots(messages: HTMLElement[]): ChannelMessageSnapshot[] {
    return messages.map(message => ({ content: message.innerText }));
}

function getRecentParticipants() {
    return Array.from(document.querySelectorAll('[id^="message-username-"]'))
        .slice(-20)
        .map(node => (node as HTMLElement).innerText)
        .filter(Boolean);
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
        if (!content) return;

        if (!shouldInvokeAgent({ content, mentionName: settings.mentionName!, invocationPrefix: settings.invocationPrefix! })) return;
        if (!isContentAllowed(content)) return;

        const rate = applyMinuteRateLimit(invocationTimes.get(channel) ?? [], settings.rateLimitPerMinute!);
        invocationTimes.set(channel, rate.nextBucket);
        if (!rate.allowed) return;

        const prompt = assembleChannelPrompt({
            channelId: channel,
            participants: getRecentParticipants(),
            invocationContent: content
        });

        inFlightChannels.add(channel);
        VesktopNative.agent.invoke({
            prompt,
            history: buildChannelMemory(toSnapshots(messages)),
            settings,
            transport: "ipc-local",
            session: {
                sessionId: channel,
                channelId: channel,
                userId: "discord-local-user"
            },
            auth: {
                actorId: "discord-local-user",
                actorDisplayName: "Local Desktop User",
                channelRole: "member"
            }
        })
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
