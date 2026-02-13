import type { AgentSettings } from "shared/settings";

import type { AgentChatMessage, AgentClient, AgentResponse } from "./types";
import { withAgentDefaults } from "./defaults";

export class LocalLlmClient implements AgentClient {
    async sendMessage(prompt: string, history: AgentChatMessage[], settings: AgentSettings): Promise<AgentResponse> {
        const resolved = withAgentDefaults(settings);

        const response = await fetch(resolved.localUrl!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: resolved.localModel,
                temperature: resolved.temperature,
                max_tokens: resolved.maxTokens,
                messages: [...history.map(h => ({ role: h.role, content: h.content })), { role: "user", content: prompt }]
            })
        }).catch(err => {
            throw new Error(`Failed to reach local LLM server at ${resolved.localUrl}: ${String(err)}`);
        });

        if (!response.ok) {
            throw new Error(`Local LLM server error (${response.status} ${response.statusText})`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content;
        if (!content) throw new Error("Local LLM server returned an unexpected response.");

        return { content, model: data?.model ?? resolved.localModel };
    }
}
