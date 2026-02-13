/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, TextInput } from "@vencord/types/webpack/common";
import { withAgentDefaults } from "agent/defaults";
import type { Settings as TSettings } from "shared/settings";

import { VesktopSettingsSwitch } from "./VesktopSettingsSwitch";

function parseCsv(input: string) {
    return input
        .split(",")
        .map(x => x.trim())
        .filter(Boolean);
}

export function AgentSettings({ settings }: { settings: TSettings }) {
    const agent = withAgentDefaults(settings.agent);
    settings.agent ??= agent;

    return (
        <Forms.FormSection>
            <VesktopSettingsSwitch
                value={!!agent.enabled}
                onChange={v => (settings.agent = { ...agent, enabled: v })}
                note="Enable the channel agent mediator."
            >
                Enable Agent
            </VesktopSettingsSwitch>

            <Forms.FormText className="vcd-agent-label">Agent Backend</Forms.FormText>
            <div className="vcd-agent-row">
                <button
                    className={`vcd-agent-mode ${agent.mode === "local" ? "active" : ""}`}
                    onClick={() => (settings.agent = { ...agent, mode: "local" })}
                >
                    Local
                </button>
                <button
                    className={`vcd-agent-mode ${agent.mode === "online" ? "active" : ""}`}
                    onClick={() => (settings.agent = { ...agent, mode: "online" })}
                >
                    Online
                </button>
            </div>

            <Forms.FormTitle>Invocation Prefix</Forms.FormTitle>
            <TextInput
                value={agent.invocationPrefix}
                onChange={v => (settings.agent = { ...agent, invocationPrefix: v })}
            />

            <Forms.FormTitle>Mention Name</Forms.FormTitle>
            <TextInput value={agent.mentionName} onChange={v => (settings.agent = { ...agent, mentionName: v })} />

            <Forms.FormTitle>Enabled Channel IDs (comma-separated; leave empty for all)</Forms.FormTitle>
            <TextInput
                value={(agent.enabledChannels ?? []).join(",")}
                onChange={v => (settings.agent = { ...agent, enabledChannels: parseCsv(v) })}
            />

            <Forms.FormTitle>Temperature</Forms.FormTitle>
            <TextInput
                value={String(agent.temperature)}
                onChange={v => (settings.agent = { ...agent, temperature: Number(v) || 0 })}
            />

            <Forms.FormTitle>Maximum Tokens</Forms.FormTitle>
            <TextInput
                value={String(agent.maxTokens)}
                onChange={v => (settings.agent = { ...agent, maxTokens: Number(v) || 1 })}
            />

            <Forms.FormTitle>Rate Limit / Minute</Forms.FormTitle>
            <TextInput
                value={String(agent.rateLimitPerMinute)}
                onChange={v => (settings.agent = { ...agent, rateLimitPerMinute: Number(v) || 1 })}
            />

            {agent.mode === "local" && (
                <>
                    <Forms.FormTitle>Local Endpoint URL</Forms.FormTitle>
                    <TextInput value={agent.localUrl} onChange={v => (settings.agent = { ...agent, localUrl: v })} />
                    <Forms.FormTitle>Local Model</Forms.FormTitle>
                    <TextInput
                        value={agent.localModel}
                        onChange={v => (settings.agent = { ...agent, localModel: v })}
                    />
                </>
            )}

            {agent.mode === "online" && (
                <>
                    <Forms.FormTitle>Online Provider (openai or anthropic)</Forms.FormTitle>
                    <TextInput
                        value={agent.onlineProvider}
                        onChange={v =>
                            (settings.agent = { ...agent, onlineProvider: v === "anthropic" ? "anthropic" : "openai" })
                        }
                    />
                    <Forms.FormTitle>Online Model</Forms.FormTitle>
                    <TextInput
                        value={agent.onlineModel}
                        onChange={v => (settings.agent = { ...agent, onlineModel: v })}
                    />
                </>
            )}

            <Forms.FormText>
                {agent.mode === "local"
                    ? "Local mode uses a compatible server (default http://localhost:8000/v1/chat/completions)."
                    : "Online mode reads OPENAI_API_KEY or ANTHROPIC_API_KEY from your environment."}
            </Forms.FormText>
        </Forms.FormSection>
    );
}
