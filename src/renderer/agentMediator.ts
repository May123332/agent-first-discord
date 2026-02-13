import { withAgentDefaults } from "agent/defaults";
import type { AgentErrorCategory, AgentChatMessage, AgentTraceEvent } from "agent/types";

import { addAgentTraceEvent, addAgentTraceEvents } from "./agentDiagnostics";
import { VesktopLogger } from "./logger";
import { Settings } from "./settings";

const invocationTimes = new Map<string, number[]>();
const lastHandledMessageByChannel = new Map<string, string>();
const inFlightChannels = new Set<string>();

function estimateTokens(text: string) {
    return Math.max(1, Math.ceil(text.length / 4));
}

function makeTraceId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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

function blockedReason(content: string) {
    const blocked = ["token:", "password", "credit card"];
    return blocked.find(s => content.toLowerCase().includes(s));
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

function getProvider(mode: "local" | "online", provider: "openai" | "anthropic") {
    return mode === "online" ? provider : "local";
}

function errorCategoryFromError(err: unknown): AgentErrorCategory {
    const message = String((err as Error | undefined)?.message ?? err).toLowerCase();
    if (message.includes("missing environment variable")) return "provider_unavailable";
    if (message.includes("timeout")) return "timeout";
    if (message.includes("fetch") || message.includes("network") || message.includes("failed to reach")) return "network";
    return "unknown";
}

function emitTrace(event: AgentTraceEvent) {
    addAgentTraceEvent(event);
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

        const traceId = makeTraceId();
        const mode = settings.mode ?? "local";
        const promptTokens = estimateTokens(content);
        const provider = getProvider(mode, settings.onlineProvider!);
        const invocationStartedAt = Date.now();

        emitTrace({
            traceId,
            timestamp: new Date().toISOString(),
            eventType: "invocation_received",
            provider,
            mode,
            retryCount: 0,
            latencyMs: 0,
            tokenEstimatePrompt: promptTokens,
            tokenEstimateCompletion: 0,
            tokenEstimateTotal: promptTokens,
            details: `channel:${channel}`
        });

        const blocked = blockedReason(content);
        if (blocked) {
            emitTrace({
                traceId,
                timestamp: new Date().toISOString(),
                eventType: "policy_blocked",
                provider,
                mode,
                retryCount: 0,
                latencyMs: Date.now() - invocationStartedAt,
                tokenEstimatePrompt: promptTokens,
                tokenEstimateCompletion: 0,
                tokenEstimateTotal: promptTokens,
                errorCategory: "policy",
                details: `blocked pattern: ${blocked}`
            });
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
        VesktopNative.agent.chat(prompt, buildHistory(messages), settings)
            .then(reply => {
                addAgentTraceEvents(reply?.traceEvents);
                if (!reply?.content) return;

                emitTrace({
                    traceId: reply.traceId ?? traceId,
                    timestamp: new Date().toISOString(),
                    eventType: "tool_call_start",
                    provider,
                    mode,
                    retryCount: 0,
                    latencyMs: Date.now() - invocationStartedAt,
                    tokenEstimatePrompt: estimateTokens(prompt),
                    tokenEstimateCompletion: estimateTokens(reply.content),
                    tokenEstimateTotal: estimateTokens(prompt) + estimateTokens(reply.content),
                    details: "discord_send_message"
                });

                const composer = document.querySelector('[role="textbox"]') as HTMLElement | null;
                if (!composer) return;

                composer.focus();
                document.execCommand("insertText", false, reply.content);
                composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                lastHandledMessageByChannel.set(channel, latestMessageId);

                emitTrace({
                    traceId: reply.traceId ?? traceId,
                    timestamp: new Date().toISOString(),
                    eventType: "tool_call_end",
                    provider,
                    mode,
                    retryCount: 0,
                    latencyMs: Date.now() - invocationStartedAt,
                    tokenEstimatePrompt: estimateTokens(prompt),
                    tokenEstimateCompletion: estimateTokens(reply.content),
                    tokenEstimateTotal: estimateTokens(prompt) + estimateTokens(reply.content),
                    details: "discord_send_message"
                });
            })
            .catch(err => {
                const traceEvents = (err as { traceEvents?: AgentTraceEvent[]; })?.traceEvents;
                const errorTraceId = (err as { traceId?: string; })?.traceId ?? traceId;
                addAgentTraceEvents(traceEvents);
                emitTrace({
                    traceId: errorTraceId,
                    timestamp: new Date().toISOString(),
                    eventType: "error",
                    provider,
                    mode,
                    retryCount: 0,
                    latencyMs: Date.now() - invocationStartedAt,
                    tokenEstimatePrompt: estimateTokens(prompt),
                    tokenEstimateCompletion: 0,
                    tokenEstimateTotal: estimateTokens(prompt),
                    errorCategory: errorCategoryFromError(err),
                    details: String((err as Error | undefined)?.message ?? err)
                });
                VesktopLogger.error("Agent reply failed", err);
            })
            .finally(() => {
                inFlightChannels.delete(channel);
            });
    });

    observer.observe(document, { childList: true, subtree: true });
}
