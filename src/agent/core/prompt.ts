export interface PromptAssemblyInput {
    channelId: string;
    participants: string[];
    invocationContent: string;
}

export function assembleChannelPrompt(input: PromptAssemblyInput): string {
    const uniqueParticipants = Array.from(new Set(input.participants));

    return [
        `Channel ID: ${input.channelId}`,
        `Participants: ${uniqueParticipants.join(", ")}`,
        "You are an AI participant in a shared Discord channel. Reply succinctly and helpfully.",
        `User invocation: ${input.invocationContent}`
    ].join("\n");
}
