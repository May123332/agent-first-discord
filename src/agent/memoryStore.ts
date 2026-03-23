import type { AgentSettings } from "shared/settings";

import { withAgentDefaults } from "./defaults";
import type { AgentChatMessage } from "./types";

export interface ChannelMemoryState {
    recentTurns: AgentChatMessage[];
    rollingSummary: string;
    lastParticipants: Set<string>;
    turnsSinceSummary: number;
}

const TOKEN_BUDGET_FALLBACK = 2400;

function estimateTokens(text: string) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

function estimateMessageTokens(message: AgentChatMessage) {
    return estimateTokens(`${message.role}:${message.author ?? ""}:${message.content}`);
}

function normalizeSummary(summary: string) {
    return summary.split("\n").map(line => line.trim()).filter(Boolean).slice(-8).join("\n");
}

function buildSummaryLine(message: AgentChatMessage) {
    const speaker = message.author?.trim() || (message.role === "assistant" ? "Assistant" : "User");
    const content = message.content.replace(/\s+/g, " ").trim().slice(0, 220);
    return `- ${speaker}: ${content}`;
}

export class AgentMemoryStore {
    private readonly channelState = new Map<string, ChannelMemoryState>();

    private getState(channelId: string): ChannelMemoryState {
        let state = this.channelState.get(channelId);
        if (!state) {
            state = {
                recentTurns: [],
                rollingSummary: "",
                lastParticipants: new Set<string>(),
                turnsSinceSummary: 0
            };
            this.channelState.set(channelId, state);
        }

        return state;
    }

    appendMessage(channelId: string, message: AgentChatMessage, settings?: AgentSettings, participants?: string[]) {
        const resolved = withAgentDefaults(settings);
        const state = this.getState(channelId);

        state.recentTurns.push(message);
        const maxRecentMessages = Math.max((resolved.memoryDepth ?? 12) * 2, 2);
        if (state.recentTurns.length > maxRecentMessages) {
            state.recentTurns = state.recentTurns.slice(-maxRecentMessages);
        }

        if (participants?.length) {
            state.lastParticipants = new Set(participants.filter(Boolean).slice(-32));
        }

        state.turnsSinceSummary += 1;
    }

    maybeSummarize(channelId: string, settings?: AgentSettings) {
        const resolved = withAgentDefaults(settings);
        const state = this.getState(channelId);
        const summaryFrequency = Math.max(resolved.summaryFrequency ?? 6, 1);
        const tokenBudget = Math.max(resolved.memoryTokenBudget ?? TOKEN_BUDGET_FALLBACK, 600);
        const currentTokens = estimateTokens(state.rollingSummary) + state.recentTurns.reduce((sum, turn) => sum + estimateMessageTokens(turn), 0);

        if (state.turnsSinceSummary < summaryFrequency && currentTokens < tokenBudget) return;

        const compactCount = Math.max(Math.floor(state.recentTurns.length / 2), 1);
        const compacted = state.recentTurns.slice(0, compactCount);
        if (!compacted.length) return;

        const digestHeader = state.rollingSummary ? "Recent summary update:" : "Conversation summary:";
        const digest = [
            state.rollingSummary,
            digestHeader,
            ...compacted.map(buildSummaryLine)
        ].filter(Boolean).join("\n");

        state.rollingSummary = normalizeSummary(digest);
        state.recentTurns = state.recentTurns.slice(compactCount);
        state.turnsSinceSummary = 0;
    }

    buildPromptPayload(channelId: string, invocationPrompt: string, settings?: AgentSettings) {
        const resolved = withAgentDefaults(settings);
        const state = this.getState(channelId);
        const tokenBudget = Math.max(resolved.memoryTokenBudget ?? TOKEN_BUDGET_FALLBACK, 600);

        const participants = Array.from(state.lastParticipants).join(", ") || "unknown";
        const promptSections = [
            `Channel ID: ${channelId}`,
            `Participants: ${participants}`,
            "You are an AI participant in a shared Discord channel. Reply succinctly and helpfully.",
            state.rollingSummary ? `Rolling Summary:\n${state.rollingSummary}` : "",
            `User invocation: ${invocationPrompt}`
        ].filter(Boolean);

        const prompt = promptSections.join("\n");
        const budgetForHistory = Math.max(tokenBudget - estimateTokens(prompt), 200);

        const selected: AgentChatMessage[] = [];
        let usedTokens = 0;

        for (let i = state.recentTurns.length - 1; i >= 0; i--) {
            const message = state.recentTurns[i];
            const messageTokens = estimateMessageTokens(message);
            if (selected.length && usedTokens + messageTokens > budgetForHistory) break;
            selected.unshift(message);
            usedTokens += messageTokens;
        }

        return { prompt, history: selected };
    }
}

export const agentMemoryStore = new AgentMemoryStore();
