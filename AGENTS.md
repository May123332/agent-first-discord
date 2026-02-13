# AGENTS.md

This file contains repository-wide guidance for **all coding agents** working in this project, including:
- Gemini Jules
- Claude Code
- OpenAI Codex

Scope: this file applies to the entire repository tree.

## Project context

- Repository: `agent-first-discord`
- Base stack: Electron + Vencord/Vesktop-derived codebase.
- Goal: preserve Vesktop performance/privacy/customization while adding agent-first AI features.

## Core engineering rules

1. **Do not delete or overwrite the project README intent.**
   - Keep the repository positioned as `agent-first-discord`.

2. **Preserve privacy/performance defaults.**
   - Avoid introducing telemetry.
   - Keep startup and runtime overhead low.

3. **Keep architecture modular.**
   - Main process logic in `src/main/*`
   - Preload bridge in `src/preload/*`
   - Renderer/UI in `src/renderer/*`
   - AI integration in `src/agent/*`

4. **Secrets safety is mandatory.**
   - Never hardcode API keys.
   - Use env vars/config templates (e.g. `.env.example`).

5. **Cross-platform release expectations.**
   - Windows, macOS, Linux builds should remain supported.
   - Prefer platform-native packaging assets where required by electron-builder.

## Coding conventions

- Make small, focused changes.
- Prefer explicit types for new TypeScript interfaces/APIs.
- Avoid broad refactors unless asked.
- Keep comments concise and only where logic is non-obvious.
- Never wrap imports in try/catch.

## AI feature conventions

When changing AI behavior:
- Keep a unified client contract (`sendMessage(prompt, history, settings)`).
- Maintain local + online provider support.
- Include defensive error handling for unavailable providers.
- Ensure basic anti-spam/rate-limit behavior for channel interactions.

## Build and validation workflow

Before finalizing changes, run (as applicable):

1. `pnpm install --ignore-scripts` (if environment constraints exist)
2. `pnpm testTypes`
3. `pnpm build`

If full packaging is touched, also validate release workflow and `electron-builder` config.

## Git/PR expectations for agents

- Commit atomic, descriptive changes.
- Include what changed + why in PR body.
- Call out environment limitations explicitly (network, signing, CI secrets, etc.).

## Non-goals

- Do not add speculative framework migrations.
- Do not introduce unrelated tooling churn.
- Do not disable safeguards to “force green” builds.
