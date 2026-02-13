export interface InvocationPolicyInput {
    content: string;
    mentionName: string;
    invocationPrefix: string;
}

const BLOCKED_PATTERNS = ["token:", "password", "credit card"];

export function shouldInvokeAgent({ content, mentionName, invocationPrefix }: InvocationPolicyInput): boolean {
    const lowered = content.toLowerCase();
    return lowered.includes(`@${mentionName.toLowerCase()}`) || lowered.trimStart().startsWith(invocationPrefix.toLowerCase());
}

export function isContentAllowed(content: string): boolean {
    const lowered = content.toLowerCase();
    return !BLOCKED_PATTERNS.some(pattern => lowered.includes(pattern));
}
