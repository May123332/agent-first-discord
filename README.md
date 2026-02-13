# agent-first-discord

This project builds on the Vesktop source code (see https://github.com/Vencord/Vesktop) to create an experimental Discord client designed for agent-first communication. The goal is to allow users to choose whether a local large language model or an online model should be used when launching the application. Instead of a single human interacting with a language model, this client connects the model to shared channels so it can talk with multiple people at once.

## Features

- Vesktop performance, privacy and customization base (Electron + Vencord, reduced telemetry surface, plugin/theme support).
- AI startup mode selection (`Local` or `Online`) through `--agent-mode=local|online` or first-launch prompt.
- Local LLM integration for OpenAI-compatible servers (default `http://localhost:8000/v1/chat/completions`).
- Online LLM integration (OpenAI or Anthropic) using environment variables.
- Multi-user channel mediator that responds when invoked by prefix (`!agent`) or mention (`@agent`) and includes channel participants and recent history in prompts.
- AI settings for temperature, max tokens, rate limits, and mode selection.

## Quick start

1. Install dependencies:
   - `pnpm install`
2. Run dev build:
   - `pnpm start:dev`
3. Optionally force mode at startup:
   - `pnpm start:dev -- --agent-mode=local`
   - `pnpm start:dev -- --agent-mode=online`

## AI configuration

Copy `.env.example` to `.env` (or export env vars in your shell):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `LOCAL_LLM_URL` (optional override)

Notes:
- API keys are never hardcoded; online mode requires env variables.
- Local mode reports a clear error if the local inference server is unavailable.

## Architecture boundary (agent core and invoke service)

The AI stack is split so provider-agnostic orchestration can be reused in-process today and moved to a remote service later:

- `src/agent/core/*` contains pure TypeScript logic for invocation policy checks, channel memory extraction, prompt assembly, and per-channel rate limiting.
- Renderer code (`src/renderer/agentMediator.ts`) gathers Discord DOM state and delegates decision-making/orchestration to `src/agent/core/*`.
- `src/agent/service/types.ts` defines the `agent invoke` endpoint contract (`AgentInvokeRequest` / `AgentInvokeResponse` / `AgentInvokeService`).
- `src/agent/service/localAgentInvokeService.ts` is the current in-process adapter used by Electron main via IPC.

### Remote-ready auth/session model

For a future remote agent backend, `AgentInvokeRequest` already carries explicit identity/session context:

- `session`: stable session and channel binding (`sessionId`, `channelId`, `userId`, optional `workspaceId`) so multi-user channels can be scoped safely.
- `auth`: actor metadata and optional bearer token (`actorId`, display name, channel role, token) for access control and auditability.
- `transport`: source marker (`ipc-local` now, `http-remote` later) so policy and telemetry-free diagnostics can branch without changing provider clients.

This keeps the provider client contract unified (`sendMessage(prompt, history, settings)`) while allowing the invoke boundary to move from Electron IPC to HTTP without changing core logic.

## Building installers

- Build all platforms: `pnpm dist` (runs `electron-builder --mac --win --linux`)
- Alternative shorthand: `pnpm dist:mwl` (runs `electron-builder -mwl`)

Platform notes:
- macOS signing/notarization must be performed on macOS with proper Apple credentials.
- Some platform-specific native dependencies may need per-OS build environments.
- Linux remains the most complete target today; some macOS parity items are tracked for future iterations.

## Contributing

- Keep Electron main-process, renderer, and AI integration logic modular.
- Prefer additions under `src/agent` for model integration and orchestration.
- Document platform-specific caveats in PRs.

### CI install behavior for releases

The release workflow intentionally installs dependencies with scripts disabled (`pnpm install --frozen-lockfile --ignore-scripts`) to avoid brittle postinstall failures from optional tooling. It then runs only the required arRPC update step explicitly, in a best-effort mode:

- `pnpm updateArrpcDB || echo "arrpc DB update failed; continuing with cached data"`

Before packaging, CI also validates that `node_modules/arrpc/src/process/detectable.json` is valid JSON so releases fail early if the generated/cached arRPC data is malformed.
