import type { AgentSettings } from "shared/settings";

import type { AgentClient, AgentPromptTurn, AgentResponse, AgentToolRequest } from "./types";
import { withAgentDefaults } from "./defaults";

function toOpenAiMessages(turn: AgentPromptTurn) {
    const base = [...turn.history.map(h => ({ role: h.role, content: h.content })), { role: "user", content: turn.prompt }];
    if (!turn.toolResults?.length) return base;

    return [
        ...base,
        ...turn.toolResults.map(result => ({
            role: "tool",
            tool_call_id: result.requestId,
            content: result.content
        }))
    ];
}

function parseToolRequests(data: any): AgentToolRequest[] {
    const calls = data?.choices?.[0]?.message?.tool_calls;
    if (!Array.isArray(calls)) return [];

    return calls
        .map((call): AgentToolRequest | undefined => {
            try {
                return {
                    id: String(call.id),
                    name: String(call.function?.name),
                    arguments: JSON.parse(call.function?.arguments || "{}")
                };
            } catch {
                return void 0;
            }
        })
        .filter((call): call is AgentToolRequest => !!call);
}

export class LocalLlmClient implements AgentClient {
    async sendMessage(turn: AgentPromptTurn): Promise<AgentResponse> {
        const resolved = withAgentDefaults(turn.settings as AgentSettings);

        const response = await fetch(resolved.localUrl!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: resolved.localModel,
                temperature: resolved.temperature,
                max_tokens: resolved.maxTokens,
                messages: toOpenAiMessages(turn),
                tools: turn.tools?.map(tool => ({ type: "function", function: { name: tool.name, parameters: tool.schema } }))
            })
        }).catch(err => {
            throw new Error(`Failed to reach local LLM server at ${resolved.localUrl}: ${String(err)}`);
        });

        if (!response.ok) {
            throw new Error(`Local LLM server error (${response.status} ${response.statusText})`);
        }

        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content ?? "";
        const toolRequests = parseToolRequests(data);
        if (!content && !toolRequests.length) throw new Error("Local LLM server returned an unexpected response.");

        return { content, model: data?.model ?? resolved.localModel, toolRequests };
    }
}
