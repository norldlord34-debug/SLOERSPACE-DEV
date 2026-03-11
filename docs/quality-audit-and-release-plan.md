# SloerSpace Dev Quality Audit and Release Plan

## Current Audit Summary

### Critical issues found in the original baseline

- Global Zustand state mixed unrelated domains and made the app hard to evolve safely.
- Workspace tabs were only visual; switching tabs did not restore independent terminal or swarm sessions.
- Launching a workspace overwrote a single global terminal state.
- Terminal execution was mocked with sample output instead of real command execution.
- Swarm dashboard depended on hard-coded mock agents and fake progress.
- Multiple views used hardcoded developer paths such as `C:\Users\dev`.
- Custom desktop titlebar controls were present but not wired.
- A broken absolute Windows path entry in `.gitignore` interfered with repo tooling.

## Improvements implemented in this iteration

### Core architecture

- Introduced a new persistent store in `src/store/appStore.ts`.
- Preserved compatibility through `src/store/useStore.ts` re-exporting the new store.
- Split runtime state into:
  - `workspaceTabs`
  - `terminalSessions`
  - `swarmSessions`
- Added active-session helpers for terminal and swarm flows.
- Added persisted UI/runtime state for theme, tabs, sessions, prompts, agents and kanban data.

### Terminal runtime

- Replaced mocked terminal output with real desktop command execution.
- Added Tauri commands:
  - `get_default_workdir`
  - `run_terminal_command`
- Added `cd` handling so pane working directories update correctly across commands.
- Added clearer error handling and empty-state UX when no terminal workspace is active.
- Removed hardcoded default developer paths.

### Desktop integration

- Wired custom titlebar controls to:
  - minimize
  - maximize/restore
  - close
- Added `src/lib/desktop.ts` as a bridge layer for desktop behavior.
- Added graceful browser fallback for desktop-only operations.

### Swarm flow

- Replaced mock dashboard data with real swarm session state.
- Swarm launch now uses the configured objective, working directory and roster.
- Dashboard now displays:
  - actual mission objective
  - actual working directory
  - real assigned agents from the launched session
  - elapsed time derived from session start
- Added empty-state UX when no swarm session is active.

### UX and quality

- Replaced ad-hoc `Math.random()` IDs in UI flows with shared `generateId()` usage.
- Improved responsive layouts in key screens.
- Improved path label rendering for both Windows and POSIX-style paths.
- Fixed the broken `.gitignore` entry that affected search tooling.

## Validation completed in this iteration

### Automated checks run

- `node_modules\.bin\tsc.cmd --noEmit`
  - Result: passed

### Checks still required before release

- `next build`
- `cargo check`
- `tauri build` smoke validation
- Manual desktop QA on the packaged app

## Remaining priority backlog

### P0

- Integrate real agent CLI orchestration for `SloerSwarm` instead of session tracking only.
- Add formal automated test coverage for the new store and desktop command bridge.
- Add release smoke automation for Tauri desktop packaging.

### P1

- Persist and surface command history search/filtering.
- Add command cancellation and long-running process streaming.
- Add keyboard shortcut implementation instead of reference-only UI.
- Add richer workspace metadata in tabs.

### P2

- Add directory picker integration for desktop.
- Add richer telemetry for performance and failure analysis.
- Add update-check flow and real account/billing integration.

## Exhaustive Test Plan

### Unit tests

#### Store

- Create terminal workspace with selected layout.
- Launch workspace with explicit empty agent config.
- Restore active workspace after tab switching.
- Remove active and inactive tabs.
- Persist and rehydrate sessions safely.
- Stop active swarm and verify state transitions.

#### Desktop bridge

- Detect desktop vs browser environment.
- Format command duration values.
- Normalize terminal output formatting.
- Extract path labels from Windows and POSIX paths.

#### Domain helpers

- Agent assignment expansion.
- Swarm role/task generation.
- Pane update helpers.

### Integration tests

#### Terminal flow

- Launch workspace from wizard.
- Verify pane count matches selected layout.
- Execute command successfully.
- Execute failing command and show stderr.
- Run `cd` and verify subsequent cwd updates.
- Switch tabs and verify terminal state is preserved.
- Close tabs and verify fallback navigation is correct.

#### Swarm flow

- Launch swarm with valid objective and roster.
- Verify session tab creation.
- Verify dashboard reflects mission and working directory.
- Stop swarm and verify status becomes non-active.

#### Desktop shell

- Minimize, maximize/restore and close controls work in Tauri.
- Browser preview does not crash when desktop-only APIs are unavailable.

### Performance tests

- Cold start time of desktop shell.
- Time to launch 1, 4, 9 and 16 pane workspaces.
- Rendering performance with long terminal outputs.
- Session restore performance after persistence rehydration.
- Memory behavior when multiple workspace tabs remain open.

### Usability tests

- New user can create a workspace without confusion.
- Empty states clearly explain the next action.
- Errors are understandable when terminal execution is unavailable.
- Navigation remains clear on reduced widths.
- Swarm dashboard clearly communicates what is real vs pending deeper orchestration.

### Security tests

- Reject empty commands.
- Reject excessively long commands.
- Reject invalid working directories.
- Ensure working directory changes stay within real directories.
- Verify no secrets or local machine paths are hardcoded into UI defaults.
- Verify persisted state does not store sensitive tokens or API keys.

## Controlled Release Process

### 1. Development gate

- Work only on feature branches.
- Require review of architecture-sensitive changes to store, Tauri commands and runtime bridge code.

### 2. Pre-merge verification

- Run:
  - `node_modules\.bin\tsc.cmd --noEmit`
  - `next build`
  - `cargo check`
- Perform manual smoke checks for:
  - workspace creation
  - terminal command execution
  - tab switching
  - swarm launch/stop
  - titlebar controls

### 3. Release candidate gate

- Produce a versioned build candidate.
- Validate desktop artifacts open correctly.
- Confirm no regression in persisted state migration.
- Confirm no critical console/runtime errors in packaged desktop mode.

### 4. Final QA checklist

- Functional QA
- Performance smoke QA
- UX sanity QA
- Security sanity QA
- Packaging/install QA

### 5. Packaging and release

- Build desktop artifacts.
- Verify generated outputs:
  - `sloerspace-dev.exe`
  - MSI installer
  - NSIS setup executable
- Archive release notes with audited changes and known limitations.

### 6. Post-release verification

- Install from packaged artifacts on a clean Windows environment.
- Smoke test first-run experience.
- Confirm persistence and terminal execution still work after install.

## Recommended next execution order

1. Run `next build` and `cargo check`.
2. Verify Tauri desktop runtime manually.
3. Implement real `SloerSwarm` CLI orchestration.
4. Add automated unit/integration coverage.
5. Promote to release candidate only after all gates pass.
