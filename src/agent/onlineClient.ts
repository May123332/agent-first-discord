import type { AgentSettings } from "shared/settings";

import type { AgentClient, AgentPromptTurn, AgentResponse, AgentToolRequest } from "./types";
import { withAgentDefaults } from "./defaults";

function requireEnv(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`Missing environment variable ${name}. Add it to your environment before enabling online mode.`);
    return value;
}

export class OnlineLlmClient implements AgentClient {
    async sendMessage(turn: AgentPromptTurn): Promise<AgentResponse> {
        const resolved = withAgentDefaults(turn.settings as AgentSettings);
        const baseHistory = [...turn.history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: h.content })), { role: "user", content: turn.prompt }];

        if (resolved.onlineProvider === "anthropic") {
            const apiKey = requireEnv("ANTHROPIC_API_KEY");
            const anthropicMessages = [
                ...baseHistory,
                ...(turn.toolResults ?? []).map(result => ({
                    role: "user",
                    content: [{ type: "tool_result", tool_use_id: result.requestId, content: result.content }]
                }))
            ];

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
                    messages: anthropicMessages,
                    tools: turn.tools?.map(tool => ({ name: tool.name, input_schema: tool.schema }))
                })
            });

            if (!response.ok) throw new Error(`Anthropic API error (${response.status} ${response.statusText})`);
            const data = await response.json() as any;
            const content = data?.content?.find((item: any) => item?.type === "text")?.text ?? "";
            const toolRequests: AgentToolRequest[] = (data?.content ?? [])
                .filter((item: any) => item?.type === "tool_use")
                .map((item: any) => ({ id: String(item.id), name: String(item.name), arguments: item.input ?? {} }));
            if (!content && !toolRequests.length) throw new Error("Anthropic returned no content.");
            return { content, model: data?.model ?? resolved.onlineModel, toolRequests };
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
                messages: [
                    ...turn.history.map(h => ({ role: h.role, content: h.content })),
                    { role: "user", content: turn.prompt },
                    ...(turn.toolResults ?? []).map(result => ({ role: "tool", tool_call_id: result.requestId, content: result.content }))
                ],
                tools: turn.tools?.map(tool => ({ type: "function", function: { name: tool.name, parameters: tool.schema } }))
            })
        });

        if (!response.ok) throw new Error(`OpenAI API error (${response.status} ${response.statusText})`);
        const data = await response.json() as any;
        const content = data?.choices?.[0]?.message?.content ?? "";
        const toolRequests: AgentToolRequest[] = (data?.choices?.[0]?.message?.tool_calls ?? []).map((call: any) => ({
            id: String(call.id),
            name: String(call.function?.name),
            arguments: JSON.parse(call.function?.arguments || "{}")
        }));
        if (!content && !toolRequests.length) throw new Error("OpenAI returned no content.");

        return { content, model: data?.model ?? resolved.onlineModel, toolRequests };
    }
}
