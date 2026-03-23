import { Forms, TextInput } from "@vencord/types/webpack/common";
import type { AgentPolicyPrecedence, AgentSettings as TAgentSettings, Settings as TSettings } from "shared/settings";
/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Forms, TextInput } from "@vencord/types/webpack/common";
import { withAgentDefaults } from "agent/defaults";
import type { Settings as TSettings } from "shared/settings";

import { getAgentToolLog, subscribeAgentToolLog } from "renderer/agentLogStore";

import { VesktopSettingsSwitch } from "./VesktopSettingsSwitch";

function toTrueMap(ids: string[]) {
    return Object.fromEntries(ids.map(id => [id, true] as const));
}

function mapKeys(map?: Record<string, true>) {
    return Object.keys(map ?? {});
}

function roleEntries(map?: Record<string, string[]>) {
    return Object.entries(map ?? {});
}

function parseRoleIds(input: string) {
    return Array.from(new Set(input.split(",").map(id => id.trim()).filter(Boolean)));
}

function setAgent(settings: TSettings, agent: TAgentSettings) {
    settings.agent = agent;
}

function updatePolicyMap(
    settings: TSettings,
    agent: TAgentSettings,
    key: "allowedGuildIds" | "deniedGuildIds" | "allowedChannelIds" | "deniedChannelIds",
    ids: string[]
) {
    setAgent(settings, {
        ...agent,
        policy: {
            ...(agent.policy ?? {}),
            [key]: toTrueMap(ids.filter(Boolean))
        }
    });
}

export function AgentSettings({ settings }: { settings: TSettings }) {
    const agent = withAgentDefaults(settings.agent);
    settings.agent ??= agent;
    const logEntries = useSyncExternalStore(subscribeAgentToolLog, getAgentToolLog, getAgentToolLog);

    const allowedGuildIds = mapKeys(agent.policy?.allowedGuildIds);
    const deniedGuildIds = mapKeys(agent.policy?.deniedGuildIds);
    const allowedChannelIds = mapKeys(agent.policy?.allowedChannelIds);
    const deniedChannelIds = mapKeys(agent.policy?.deniedChannelIds);
    const requiredRoles = roleEntries(agent.policy?.requiredInvokerRoles);

    const policyPrecedence: AgentPolicyPrecedence = agent.policy?.precedence ?? "deny";

    return (
        <Forms.FormSection>
            <VesktopSettingsSwitch
                value={!!agent.enabled}
                onChange={v => setAgent(settings, { ...agent, enabled: v })}
                note="Enable the channel agent mediator."
            >
                Enable Agent
            </VesktopSettingsSwitch>

            <Forms.FormText className="vcd-agent-label">Agent Backend</Forms.FormText>
            <div className="vcd-agent-row">
                <button
                    className={`vcd-agent-mode ${agent.mode === "local" ? "active" : ""}`}
                    onClick={() => setAgent(settings, { ...agent, mode: "local" })}
                >
                    Local
                </button>
                <button
                    className={`vcd-agent-mode ${agent.mode === "online" ? "active" : ""}`}
                    onClick={() => setAgent(settings, { ...agent, mode: "online" })}
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
            <TextInput value={agent.mentionName} onChange={v => setAgent(settings, { ...agent, mentionName: v })} />

            <Forms.FormTitle>Allowlist/Denylist Precedence</Forms.FormTitle>
            <div className="vcd-agent-row">
                <button
                    className={`vcd-agent-mode ${policyPrecedence === "deny" ? "active" : ""}`}
                    onClick={() => setAgent(settings, { ...agent, policy: { ...(agent.policy ?? {}), precedence: "deny" } })}
                >
                    Deny wins
                </button>
                <button
                    className={`vcd-agent-mode ${policyPrecedence === "allow" ? "active" : ""}`}
                    onClick={() => setAgent(settings, { ...agent, policy: { ...(agent.policy ?? {}), precedence: "allow" } })}
                >
                    Allow wins
                </button>
            </div>

            <Forms.FormTitle>Allowed Guild IDs</Forms.FormTitle>
            {allowedGuildIds.map((id, index) => (
                <div className="vcd-agent-policy-row" key={`allowed-guild-${id}-${index}`}>
                    <TextInput
                        value={id}
                        onChange={value => updatePolicyMap(settings, agent, "allowedGuildIds", allowedGuildIds.map((current, i) => i === index ? value.trim() : current))}
                    />
                    <button
                        className="vcd-agent-policy-remove"
                        onClick={() => updatePolicyMap(settings, agent, "allowedGuildIds", allowedGuildIds.filter((_, i) => i !== index))}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button className="vcd-agent-policy-add" onClick={() => updatePolicyMap(settings, agent, "allowedGuildIds", [...allowedGuildIds, ""])}>Add Guild</button>

            <Forms.FormTitle>Denied Guild IDs</Forms.FormTitle>
            {deniedGuildIds.map((id, index) => (
                <div className="vcd-agent-policy-row" key={`denied-guild-${id}-${index}`}>
                    <TextInput
                        value={id}
                        onChange={value => updatePolicyMap(settings, agent, "deniedGuildIds", deniedGuildIds.map((current, i) => i === index ? value.trim() : current))}
                    />
                    <button
                        className="vcd-agent-policy-remove"
                        onClick={() => updatePolicyMap(settings, agent, "deniedGuildIds", deniedGuildIds.filter((_, i) => i !== index))}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button className="vcd-agent-policy-add" onClick={() => updatePolicyMap(settings, agent, "deniedGuildIds", [...deniedGuildIds, ""])}>Add Guild</button>

            <Forms.FormTitle>Allowed Channel IDs</Forms.FormTitle>
            {allowedChannelIds.map((id, index) => (
                <div className="vcd-agent-policy-row" key={`allowed-channel-${id}-${index}`}>
                    <TextInput
                        value={id}
                        onChange={value => updatePolicyMap(settings, agent, "allowedChannelIds", allowedChannelIds.map((current, i) => i === index ? value.trim() : current))}
                    />
                    <button
                        className="vcd-agent-policy-remove"
                        onClick={() => updatePolicyMap(settings, agent, "allowedChannelIds", allowedChannelIds.filter((_, i) => i !== index))}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button className="vcd-agent-policy-add" onClick={() => updatePolicyMap(settings, agent, "allowedChannelIds", [...allowedChannelIds, ""])}>Add Channel</button>

            <Forms.FormTitle>Denied Channel IDs</Forms.FormTitle>
            {deniedChannelIds.map((id, index) => (
                <div className="vcd-agent-policy-row" key={`denied-channel-${id}-${index}`}>
                    <TextInput
                        value={id}
                        onChange={value => updatePolicyMap(settings, agent, "deniedChannelIds", deniedChannelIds.map((current, i) => i === index ? value.trim() : current))}
                    />
                    <button
                        className="vcd-agent-policy-remove"
                        onClick={() => updatePolicyMap(settings, agent, "deniedChannelIds", deniedChannelIds.filter((_, i) => i !== index))}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button className="vcd-agent-policy-add" onClick={() => updatePolicyMap(settings, agent, "deniedChannelIds", [...deniedChannelIds, ""])}>Add Channel</button>

            <Forms.FormTitle>Required Invoker Roles</Forms.FormTitle>
            <Forms.FormText>
                Add per-channel or per-guild role requirements. Scope can be a channel ID, guild ID, or "*" for global.
            </Forms.FormText>
            {requiredRoles.map(([scope, roles], index) => (
                <div className="vcd-agent-policy-roles-row" key={`required-roles-${scope}-${index}`}>
                    <TextInput
                        value={scope}
                        placeholder="Scope ID"
                        onChange={value => {
                            const next = [...requiredRoles];
                            next[index] = [value.trim(), roles];
                            setAgent(settings, {
                                ...agent,
                                policy: {
                                    ...(agent.policy ?? {}),
                                    requiredInvokerRoles: Object.fromEntries(next.filter(([s]) => s))
                                }
                            });
                        }}
                    />
                    <TextInput
                        value={roles.join(",")}
                        placeholder="Role IDs (comma-separated)"
                        onChange={value => {
                            const next = [...requiredRoles];
                            next[index] = [scope, parseRoleIds(value)];
                            setAgent(settings, {
                                ...agent,
                                policy: {
                                    ...(agent.policy ?? {}),
                                    requiredInvokerRoles: Object.fromEntries(next.filter(([s]) => s))
                                }
                            });
                        }}
                    />
                    <button
                        className="vcd-agent-policy-remove"
                        onClick={() => {
                            const next = requiredRoles.filter((_, i) => i !== index);
                            setAgent(settings, {
                                ...agent,
                                policy: {
                                    ...(agent.policy ?? {}),
                                    requiredInvokerRoles: Object.fromEntries(next.filter(([s]) => s))
                                }
                            });
                        }}
                    >
                        Remove
                    </button>
                </div>
            ))}
            <button
                className="vcd-agent-policy-add"
                onClick={() => {
                    setAgent(settings, {
                        ...agent,
                        policy: {
                            ...(agent.policy ?? {}),
                            requiredInvokerRoles: {
                                ...(agent.policy?.requiredInvokerRoles ?? {}),
                                [`new-scope-${Date.now()}`]: []
                            }
                        }
                    });
                }}
            >
                Add Role Rule
            </button>

            <Forms.FormTitle>Tool Allowlist Channel IDs (comma-separated; leave empty for all)</Forms.FormTitle>
            <TextInput
                value={(agent.toolEnabledChannels ?? []).join(",")}
                onChange={v => (settings.agent = { ...agent, toolEnabledChannels: parseCsv(v) })}
            />

            <Forms.FormTitle>Tool Allowlist Guild IDs (comma-separated; leave empty for all guilds)</Forms.FormTitle>
            <TextInput
                value={(agent.toolEnabledGuilds ?? []).join(",")}
                onChange={v => (settings.agent = { ...agent, toolEnabledGuilds: parseCsv(v) })}
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

            <Forms.FormTitle>Memory Depth (turns)</Forms.FormTitle>
            <TextInput value={String(agent.memoryDepth)} onChange={v => (settings.agent = { ...agent, memoryDepth: Number(v) || 1 })} />

            <Forms.FormTitle>Summary Frequency (turns)</Forms.FormTitle>
            <TextInput value={String(agent.summaryFrequency)} onChange={v => (settings.agent = { ...agent, summaryFrequency: Number(v) || 1 })} />

            {agent.mode === "local" && (
                <>
                    <Forms.FormTitle>Local Endpoint URL</Forms.FormTitle>
                    <TextInput value={agent.localUrl} onChange={v => setAgent(settings, { ...agent, localUrl: v })} />
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

            <Forms.FormTitle>Local Tool Invocation Log</Forms.FormTitle>
            <Forms.FormText>
                {logEntries.length
                    ? logEntries.slice(0, 10).map(entry => `${entry.timestamp} [${entry.status}] ${entry.toolName} (${entry.channelId}) - ${entry.summary}`).join("\n")
                    : "No tool activity yet."}
            </Forms.FormText>
        </Forms.FormSection>
    );
}
