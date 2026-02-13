import { withAgentDefaults } from "agent/defaults";
import { getReadSafeToolMap, READ_SAFE_TOOLS } from "agent/tools";
import type { AgentChatMessage, AgentToolResult } from "agent/types";

import { VesktopLogger } from "./logger";
import { logAgentTool } from "./agentLogStore";
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

function getRouteContext() {
    const [, , guildId, channelId] = location.pathname.split("/");
    return {
        guildId: guildId && guildId !== "@me" ? guildId : undefined,
        channelId
    };
}

function canRunTools(guildId: string | undefined, channelId: string, toolChannelAllowlist: string[], toolGuildAllowlist: string[]) {
    const channelAllowed = !toolChannelAllowlist.length || toolChannelAllowlist.includes(channelId);
    const guildAllowed = !toolGuildAllowlist.length || (!!guildId && toolGuildAllowlist.includes(guildId));
    return channelAllowed && guildAllowed;
}

export function initAgentMediator() {
    const toolMap = getReadSafeToolMap();

    const observer = new MutationObserver(() => {
        const settings = withAgentDefaults(Settings.store.agent);
        if (!settings.enabled) return;

        const { channelId: channel, guildId } = getRouteContext();
        if (!channel) return;
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

        const toolsAllowed = canRunTools(guildId, channel, settings.toolEnabledChannels ?? [], settings.toolEnabledGuilds ?? []);
        const tools = toolsAllowed ? READ_SAFE_TOOLS.map(tool => ({ name: tool.name, schema: tool.schema })) : [];

        const prompt = [
            `Channel ID: ${channel}`,
            `Participants: ${Array.from(new Set(participants)).join(", ")}`,
            "You are an AI participant in a shared Discord channel. Reply succinctly and helpfully.",
            `User invocation: ${content}`
        ].join("\n");

        inFlightChannels.add(channel);
        (async () => {
            const toolResults: AgentToolResult[] = [];
            const messageSnapshot = messages.map(message => message.innerText.slice(0, 1200));

            for (let step = 0; step < 3; step++) {
                const reply = await VesktopNative.agent.chat({
                    prompt,
                    history: buildHistory(messages),
                    settings,
                    tools,
                    toolResults
                });

                if (!reply.toolRequests?.length) return reply;

                for (const request of reply.toolRequests) {
                    const tool = toolMap.get(request.name);
                    if (!tool) continue;

                    if (!toolsAllowed) {
                        toolResults.push({
                            requestId: request.id,
                            name: request.name,
                            content: "Tool use blocked: this channel/guild is not allowlisted.",
                            isError: true
                        });
                        logAgentTool({
                            timestamp: new Date().toISOString(),
                            channelId: channel,
                            guildId,
                            toolName: request.name,
                            summary: "Blocked by allowlist",
                            status: "blocked"
                        });
                        continue;
                    }

                    try {
                        const result = await tool.execute(request.arguments, {
                            channelId: channel,
                            guildId,
                            messages: messageSnapshot,
                            participants: Array.from(new Set(participants))
                        });
                        toolResults.push({
                            requestId: request.id,
                            name: request.name,
                            content: result.content,
                            isError: result.isError
                        });
                        logAgentTool({
                            timestamp: new Date().toISOString(),
                            channelId: channel,
                            guildId,
                            toolName: request.name,
                            summary: result.content.slice(0, 120),
                            status: result.isError ? "error" : "ok"
                        });
                    } catch (error) {
                        const reason = String(error);
                        toolResults.push({
                            requestId: request.id,
                            name: request.name,
                            content: reason,
                            isError: true
                        });
                        logAgentTool({
                            timestamp: new Date().toISOString(),
                            channelId: channel,
                            guildId,
                            toolName: request.name,
                            summary: reason,
                            status: "error"
                        });
                    }
                }
            }

            return { content: "" };
        })()
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
