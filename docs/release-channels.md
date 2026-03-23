# Release channels

This project currently ships **desktop binaries** and keeps future **mobile distribution** work separate.

## Desktop releases (current)

Desktop binaries are produced by `.github/workflows/release.yml` for:

- macOS
- Linux
- Windows

The desktop release workflow is tag-driven (`v*`) and includes preflight checks for:

- required icon formats per desktop platform
- macOS signing/notarization secret presence

This keeps desktop artifacts stable and independently releasable.

## Mobile distribution (future)

Mobile work is isolated in `.github/workflows/mobile-ci.yml`.

At this stage, mobile CI is intentionally a separate pipeline and does **not** gate desktop release artifacts.
As Android/iOS support is added, that workflow should evolve to include:

- platform-specific build jobs
- signing checks for mobile credentials
- distribution targets (for example, internal channels, app stores, or beta tracks)

## Why split workflows?

Separating desktop and mobile pipelines prevents unfinished mobile work from blocking desktop releases and keeps failure domains independent while mobile support matures.
