import { useEffect } from "@vencord/types/webpack/common";
import { Button, Forms, Toasts, useState } from "@vencord/types/webpack/common";

import { formatAgentTraceEvents, getAgentTraceEvents, subscribeAgentTraceEvents } from "renderer/agentDiagnostics";

import { SettingsComponent } from "./Settings";

const MAX_ROWS = 30;

export const AgentDiagnostics: SettingsComponent = () => {
    const [events, setEvents] = useState(getAgentTraceEvents());

    useEffect(() => {
        return subscribeAgentTraceEvents(() => setEvents(getAgentTraceEvents()));
    }, []);

    const visible = events.slice(0, MAX_ROWS);

    return (
        <Forms.FormSection>
            <Forms.FormTitle>Agent Diagnostics</Forms.FormTitle>
            <Forms.FormText>
                Shows recent agent traces with trace IDs, retries, latency, token estimates, and provider mode.
            </Forms.FormText>
            <div className="vcd-settings-button-grid">
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={async () => {
                        await navigator.clipboard.writeText(formatAgentTraceEvents());
                        Toasts.show({
                            message: "Copied diagnostics to clipboard.",
                            id: Toasts.genId(),
                            type: Toasts.Type.SUCCESS
                        });
                    }}
                >
                    Copy diagnostics
                </Button>
            </div>
            <div className="vcd-agent-trace-list">
                {visible.length === 0 && <Forms.FormText>No traces yet.</Forms.FormText>}
                {visible.map((event, idx) => (
                    <div className="vcd-agent-trace-row" key={`${event.traceId}-${event.timestamp}-${idx}`}>
                        <Forms.FormText>
                            <strong>{event.eventType}</strong> · {event.traceId}
                        </Forms.FormText>
                        <Forms.FormText>
                            {event.mode}/{event.provider} · retry {event.retryCount} · {event.latencyMs}ms · tok {event.tokenEstimatePrompt}/
                            {event.tokenEstimateCompletion}/{event.tokenEstimateTotal}
                        </Forms.FormText>
                        {event.errorCategory && <Forms.FormText>Error: {event.errorCategory}</Forms.FormText>}
                        {event.details && <Forms.FormText>{event.details}</Forms.FormText>}
                    </div>
                ))}
            </div>
        </Forms.FormSection>
    );
};
