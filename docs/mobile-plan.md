# Mobile Delivery Plan

## Recommended option: React Native + Expo native app

A dedicated React Native app (with Expo-managed workflow where possible) is the recommended mobile path.

### Why this is recommended

- Best fit for iOS/Android platform APIs (notifications, background tasks, secure storage).
- Native distribution through App Store / Play Store.
- Better long-term UX for chat-heavy, real-time interactions than a browser-only shell.
- Cleaner separation from desktop because there is **no Electron runtime on mobile**.

### Reused modules from `src/agent/core/`

The mobile app should reuse agent domain logic from `src/agent/core/` by extracting/consuming portable TypeScript modules:

- Prompt assembly and conversation history normalization.
- Provider-agnostic request shaping and validation.
- Shared settings schema/defaults and runtime guards.
- Rate-limit/anti-spam helpers for channel-triggered agent actions.

If parts of `src/agent/core/` are currently coupled to Electron/Node APIs, split those boundaries so mobile imports only pure logic modules.

### Agent invocation network contract

Mobile should call a shared contract-compatible endpoint/client interface:

- Method: `POST /api/agent/invoke`
- Request:
  - `prompt: string`
  - `history: Array<{ role: "system" | "user" | "assistant"; content: string; ts?: number }>`
  - `settings: {
      provider: "local" | "online";
      model?: string;
      temperature?: number;
      maxTokens?: number;
      channelId?: string;
      guildId?: string;
    }`
  - `requestId: string`
- Response:
  - `message: { role: "assistant"; content: string }`
  - `usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }`
  - `providerMeta?: Record<string, unknown>`
  - `requestId: string`
- Error shape:
  - `error: { code: string; message: string; retryable: boolean }`
  - `requestId: string`

This keeps parity with the unified `sendMessage(prompt, history, settings)` contract while allowing mobile-specific transport/auth.

## Fallback option: PWA / web client

A mobile web client (PWA) can be shipped as a fallback for faster validation.

### Benefits

- Fastest initial delivery.
- Reuses existing web/renderer patterns.
- Lower native surface area for M1 experimentation.

### Trade-offs

- Limited background execution and notification reliability.
- Weaker offline support depending on browser policies.
- App-store discoverability and UX parity are reduced compared to native.

## Milestones

### M1: read-only channel + invoke agent

- Authenticate and open a selected channel in read-only mode.
- Show recent message timeline.
- Allow manual agent invocation using shared `sendMessage(prompt, history, settings)` semantics.
- Display agent output inline without sending channel replies yet.

### M2: full channel reply + settings parity

- Enable posting channel replies from mobile.
- Reach settings parity with desktop-relevant agent controls (provider/model/core tuning).
- Preserve anti-spam/rate-limit safeguards in channel interactions.
- Improve error handling for unavailable local/online providers.

### M3: background notifications + offline cache

- Add push/background notifications for mentions and agent completions.
- Add offline cache for recent channels/conversations with safe eviction.
- Support resilient sync/reconnect behavior after app resume.

## Platform constraints

### iOS App Store rules

- Comply with Apple policies for account handling, content moderation surfaces, and privacy disclosures.
- Respect restrictions around executable code download/evaluation and dynamic behavior.
- Ensure subscription/payment flows (if any) follow App Store requirements.

### Android background execution limits

- Design around Doze/app standby limits and foreground service requirements.
- Use platform-approved scheduling (WorkManager/FCM patterns) for deferred/background tasks.
- Avoid battery-aggressive persistent background work.

### Runtime constraint

- Mobile targets must not depend on Electron internals; shared logic should be runtime-agnostic.

## CI placeholders (non-blocking initially)

Add mobile-only placeholder checks in CI that do not block the current desktop pipeline:

- `mobile-lint` placeholder (runs only if mobile script exists).
- `mobile-typecheck` placeholder (runs only if mobile script exists).

Both placeholders should be marked non-blocking until mobile implementation is production-ready.
