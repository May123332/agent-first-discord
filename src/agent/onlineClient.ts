import type { AgentSettings } from "shared/settings";

import type { AgentChatMessage, AgentClient, AgentResponse } from "./types";
import { withAgentDefaults } from "./defaults";

function requireEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable ${name}. Add it to your environment before enabling online mode.`);
    return value;
}

export class OnlineLlmClient implements AgentClient {
    async sendMessage(prompt: string, history: AgentChatMessage[], settings: AgentSettings): Promise<AgentResponse> {
        const resolved = withAgentDefaults(settings);

        if (resolved.onlineProvider === "anthropic") {
            const apiKey = requireEnv("ANTHROPIC_API_KEY");
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: resolved.onlineModel,
                    max_tokens: resolved.maxTokens,
                    temperature: resolved.temperature,
                    messages: [...history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })), { role: "user", content: prompt }]
                })
            });

            if (!response.ok) throw new Error(`Anthropic API error (${response.status} ${response.statusText})`);
            const data = await response.json() as any;
            const content = data?.content?.[0]?.text;
            if (!content) throw new Error("Anthropic returned no content.");
            return { content, model: data?.model ?? resolved.onlineModel };
        }

        const apiKey = requireEnv("OPENAI_API_KEY");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: resolved.onlineModel,
                temperature: resolved.temperature,
                max_tokens: resolved.maxTokens,
                messages: [...history.map(h => ({ role: h.role, content: h.content })), { role: "user", content: prompt }]
            })
        });

        if (!response.ok) throw new Error(`OpenAI API error (${response.status} ${response.statusText})`);
        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenAI returned no content.");

        return { content, model: data?.model ?? resolved.onlineModel };
    }
}
