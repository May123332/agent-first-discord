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
