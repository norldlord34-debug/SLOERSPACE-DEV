# Architecture Decision Records (ADR)

> Maintained log of all architectural decisions for the SloerSpace Dev project.
> Format: [Michael Nygard's ADR template](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

---

## ADR-001: Monolithic Zustand Store

**Date**: 2026-03-20
**Status**: Accepted (with noted technical debt)

### Context
The entire application state (~2100 lines) lives in a single Zustand store at `src/store/appStore.ts`. This includes themes, workspaces, terminal sessions, swarm sessions, kanban tasks, agents, prompts, voice settings, terminal settings, user profile, and all corresponding actions.

### Decision
Retain the single-store pattern for now. Zustand's selector-based subscription model (`useStore((s) => s.field)`) already prevents unnecessary re-renders when unrelated state changes. The monolith is manageable because:
- All normalizers and persistence logic are co-located
- Type inference works seamlessly across the entire state tree
- Migration versioning is centralized

### Consequences
- **Positive**: Single source of truth, simple persistence/migration, no inter-store sync bugs
- **Negative**: File is large and harder to navigate; PRs touching the store have high conflict risk
- **Future**: If the store exceeds ~3000 lines, split into domain slices using Zustand's `combine` or separate stores with a shared middleware layer

---

## ADR-002: Tauri 2 + Next.js 14 Static Export

**Date**: 2026-03-20
**Status**: Accepted

### Context
The app needs to be a cross-platform desktop application with native OS access (PTY, filesystem, shell execution) while maintaining a modern React UI.

### Decision
Use Tauri 2 as the desktop runtime with a Next.js 14 static export (`output: 'export'`) as the frontend. The frontend is pre-rendered to static HTML/JS and served from the Tauri webview.

### Consequences
- **Positive**: Small binary size (~10-15MB vs Electron's ~150MB+), native Rust performance for terminal/PTY, cross-platform from a single codebase
- **Negative**: No SSR/ISR (static export only), Next.js image optimization disabled, CSP requires `unsafe-inline` for styles
- **Trade-off**: `unsafe-inline` in CSP is accepted because Next.js injects inline styles; mitigated by removing `unsafe-eval` and adding `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`

---

## ADR-003: Persistent PTY Terminal Backend

**Date**: 2026-03-20
**Status**: Accepted

### Context
Terminal sessions need to persist across command executions, support interactive input, and provide real-time streaming output.

### Decision
Use `portable-pty` crate for persistent PTY sessions in the Rust backend. Each terminal pane gets a dedicated PTY process that stays alive between commands. The backend emits ordered stream events (`terminal-session-stream`) and lifecycle events (`terminal-session-live`).

### Consequences
- **Positive**: True terminal emulation, interactive programs work (vim, ssh, etc.), streaming output
- **Negative**: PTY processes consume OS resources; need cleanup on workspace close
- **Mitigation**: Session lifecycle tracking with bounded event history (max 80 events per session)

---

## ADR-004: CSS Custom Properties for Theming

**Date**: 2026-03-20
**Status**: Accepted

### Context
The app supports 15 built-in themes plus custom imported themes. Theme switching must be instant and affect every surface.

### Decision
Use CSS custom properties (`:root` variables) for all design tokens. Themes are defined as `[data-theme="..."]` selectors in `globals.css`. Custom themes override variables at runtime via `document.documentElement.style.setProperty()`.

### Consequences
- **Positive**: Zero-JS theme switching for built-in themes, instant application, no component re-renders needed
- **Negative**: Cannot tree-shake unused theme CSS; all 15 themes are always in the bundle
- **Mitigation**: Theme CSS is ~4KB total, negligible impact on bundle size

---

## ADR-005: Agent CLI Resolution via Rust Backend

**Date**: 2026-03-20
**Status**: Accepted

### Context
The app needs to detect which AI coding agents (Claude, Codex, Gemini, etc.) are installed on the user's system before launching workspaces or swarms.

### Decision
Agent CLI resolution is performed in the Rust backend (`get_agent_cli_resolutions`) using `which`/`where.exe` system commands. Results include the resolved path and a shell-safe bootstrap command.

### Consequences
- **Positive**: Accurate OS-level detection, works across Windows/macOS/Linux, bootstrap commands are shell-safe
- **Negative**: Detection requires spawning processes (minor latency on first probe)
- **Mitigation**: Results are cached per session; frontend shows detection state (checking/available/missing/unverified)

---

## ADR-006: localStorage for State Persistence

**Date**: 2026-03-20
**Status**: Accepted (with security notes)

### Context
User preferences, workspace state, and session data need to persist across app restarts.

### Decision
Use Zustand's `persist` middleware with `localStorage` as the storage backend. State is serialized to JSON under the key `sloerspace-dev-store`.

### Consequences
- **Positive**: Simple, synchronous, works in both Tauri and browser environments
- **Negative**: localStorage has a ~5-10MB limit; auth tokens stored in localStorage are accessible to any JS in the same origin
- **Mitigation**: 
  - State is `partialize`d to exclude transient fields (functions, volatile UI state)
  - Auth tokens are cleared on logout
  - Tauri's CSP restricts script execution to `'self'` origin only
  - Migration system (version 9) ensures safe rehydration of older persisted state

---

## ADR-007: SloerCanvas Free-Form Terminal Layout

**Date**: 2026-03-20
**Status**: Accepted (ALPHA)

### Context
Users requested a free-form canvas where terminal windows can be positioned and resized freely, unlike the fixed grid layout.

### Decision
Implement SloerCanvas as a separate workspace kind (`canvas`) with:
- CSS transform-based pan/zoom on a large virtual canvas
- Pointer-event-based drag (headers) and resize (corners) for individual terminal nodes
- A discriminated union `InteractionMode` ref to prevent pan/drag/resize conflicts

### Consequences
- **Positive**: Complete freedom in terminal arrangement, supports any number of terminals
- **Negative**: No automatic layout reflow; users must manually arrange terminals
- **Future**: Add snap-to-grid, auto-arrange, and layout presets

---

## ADR-008: Content Security Policy Hardening

**Date**: 2026-03-20
**Status**: Accepted

### Context
The default Tauri CSP was overly permissive with `'unsafe-eval'` in script-src, missing `object-src`, `base-uri`, and `frame-ancestors` directives.

### Decision
Harden the CSP:
- Remove `'unsafe-eval'` from `script-src` (Next.js static export doesn't require eval at runtime)
- Add `object-src 'none'` (prevents Flash/plugin-based attacks)
- Add `base-uri 'self'` (prevents base tag injection)
- Add `frame-ancestors 'none'` (prevents clickjacking via iframe embedding)
- Explicitly allowlist `https://api.github.com` in `connect-src` for update checks

### Consequences
- **Positive**: Significantly reduces XSS and injection attack surface
- **Negative**: `'unsafe-inline'` must remain for styles due to Next.js/React inline style injection
- **Future**: Investigate nonce-based CSP for styles when Next.js supports it in static export mode

---

## ADR-009: Release Profile Optimization

**Date**: 2026-03-20
**Status**: Accepted

### Context
Production binaries should be as small and fast as possible for distribution.

### Decision
Configure Cargo release profile with:
- `lto = true` — Link-Time Optimization for cross-crate inlining
- `codegen-units = 1` — Maximum optimization (single codegen unit)
- `strip = "symbols"` — Remove debug symbols from binary
- `opt-level = 3` — Maximum speed optimization
- `panic = "abort"` — Smaller binary, no unwinding overhead

### Consequences
- **Positive**: ~30-40% smaller binary, measurably faster execution
- **Negative**: Longer compilation time in release mode (~2-3x); no panic backtraces in release

---

## ADR-010: CI/CD Pipeline Structure

**Date**: 2026-03-20
**Status**: Accepted

### Context
The project needs automated quality gates for every PR and automated release builds for tagged versions.

### Decision
Two GitHub Actions workflows:
1. **`ci.yml`** — Runs on push to `main`/`develop` and PRs: TypeScript type-check, ESLint (zero warnings), Next.js production build, Cargo check
2. **`release.yml`** — Runs on version tags: Full cross-platform Tauri build + GitHub Release with binaries

### Consequences
- **Positive**: No broken code reaches main; releases are fully automated
- **Dependency management**: Dependabot configured for npm, Cargo, and GitHub Actions with weekly cadence

---

## ADR-011: Structured Frontend Logging

**Date**: 2026-03-20
**Status**: Accepted

### Context
Frontend errors were logged inconsistently with bare `console.log/error` calls, making production debugging difficult.

### Decision
Introduce a structured logger (`src/lib/logger.ts`) with:
- Log levels: debug, info, warn, error
- Scoped loggers for component-level context
- Structured data payloads
- Production mode filters (only warn+ in production)
- ISO timestamp on every entry

### Consequences
- **Positive**: Consistent log format, filterable by level/context, ready for future log aggregation
- **Adoption**: Incremental — new code uses `logger`, existing code migrated over time
