# SloerSpace Dev — Complete Project Reference

> **Agentic Development Environment** — A next-generation cross-platform desktop IDE built with Tauri 2 + Next.js 14 + Rust. Designed for developers who work with AI agent swarms, multi-pane terminals, and vibe coding workflows.

---

## Identity

| Field | Value |
|---|---|
| **Product Name** | SloerSpace Dev |
| **Identifier** | `dev.sloerspace.desktop` |
| **Version** | 1.0.0 |
| **License** | MIT |
| **Repository** | `github.com/norldlord34-debug/SLOERSPACE-DEV` |
| **Local Path** | `C:\Users\jhons\Downloads\SLOERSPACE-DEV-master\SLOERSPACE-DEV-master` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS 3 |
| **Backend** | Tauri 2, Rust (tokio, serde, portable-pty, reqwest, semver) |
| **State** | Zustand 5 (persisted to localStorage as `sloerspace-dev-store`, migration version 10) |
| **Icons** | Lucide React |
| **Fonts** | Inter (body), JetBrains Mono (code/terminal), Space Grotesk (headings) — Google Fonts |
| **Terminal** | xterm.js 6 + addon-fit + addon-unicode11 + addon-webgl |
| **Bundler** | Tauri Bundler (MSI, NSIS, DMG, AppImage, DEB) |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server (localhost:3000) |
| `npm run build` | Build Next.js for production (output to `out/`) |
| `npm run lint` | Run ESLint |
| `npm run tauri:dev` | Launch Tauri in development mode (hot-reload) |
| `npm run tauri:build` | Build production desktop binaries |

---

## Project Structure

```
SLOERSPACE-DEV-master/
├── public/
│   └── LOGO.png                 # Brand logo used across the app
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout, imports globals.css
│   │   ├── page.tsx             # Main App component, routes all views
│   │   └── globals.css          # CSS variables, 15 theme definitions, animations, utility classes
│   ├── components/
│   │   ├── AgentsPage.tsx       # AI agent management (custom agents, presets)
│   │   ├── BrowserView.tsx     # Native WebView2 browser with tabs, split terminal, persistence
│   │   ├── BrowserPane.tsx     # Browser pane management utilities
│   │   ├── CommandPalette.tsx   # Ctrl+K command launcher, starred commands, snippets
│   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   ├── HomeScreen.tsx       # Landing/onboarding screen (premium, state-aware)
│   │   ├── KanbanBoard.tsx      # Drag-and-drop task board
│   │   ├── LoginPage.tsx        # Auth screen (signup/signin/guest)
│   │   ├── NavigationMenu.tsx   # Sidebar navigation
│   │   ├── PromptsPage.tsx      # Prompt template library
│   │   ├── SettingsPage.tsx     # Full settings (8 tabs + Data)
│   │   ├── StatusBar.tsx        # Bottom status bar
│   │   ├── SwarmDashboard.tsx   # Live swarm monitoring dashboard
│   │   ├── SwarmLaunch.tsx      # Multi-step swarm launch wizard
│   │   ├── TerminalView.tsx     # Full terminal UI with PTY streaming
│   │   ├── TitleBar.tsx         # Custom title bar with SiulkVoice pill
│   │   ├── Toast.tsx            # Toast notification system
│   │   ├── UpgradeModal.tsx     # Premium upgrade modal
│   │   └── WorkspaceWizard.tsx  # Workspace creation wizard
│   ├── hooks/
│   │   └── useBrowserManager.ts # Browser webview management hook
│   ├── lib/
│   │   └── desktop.ts           # Tauri bridge (invoke wrappers, TS interfaces)
│   └── store/
│       ├── appStore.ts          # Zustand store (state, actions, types, normalizers, persistence)
│       └── useStore.ts          # Re-export from appStore
├── src-tauri/
│   ├── src/
│   │   └── lib.rs               # Rust backend (~2660 lines)
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Tauri app configuration
│   └── capabilities/            # Tauri permissions
├── docs/
│   ├── quality-audit-and-release-plan.md
│   └── PROJECT-REFERENCE.md     # This file
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Components Detail

### Core Views

| Component | Description |
|---|---|
| **HomeScreen.tsx** | Premium landing/onboarding. New-user guided onboarding vs returning-user operational home. Logo branding, startup controls, recent projects, keyboard shortcuts. State-aware: free/trial/pro. |
| **TerminalView.tsx** | Full integrated terminal (~133K). PTY streaming via Tauri, command blocks with collapsible output, session timeline, operator dock (recommended commands, favorites, workflows), interactive input mode, workspace-aware insights. |
| **SwarmLaunch.tsx** | Multi-step wizard (~94K): Roster → Mission → Directory → Context → Name. Agent fleet configuration, CLI availability probing, mission directives, operator notes, working directory with browse/recent/manual. |
| **SwarmDashboard.tsx** | Live swarm runtime (~92K). Canvas with pan/zoom and animated handoff flow lines, agent roster with status/progress/tokens, role/status filters, console/activity feed, terminal targeting, floating operator composer. |
| **KanbanBoard.tsx** | Drag-and-drop task board. Columns: todo, in-progress, in-review, complete, cancelled. Priority levels: low, medium, high, critical. Agent assignment per task. |
| **WorkspaceWizard.tsx** | Workspace creation. Layout grid selection (1-16 panes), agent assignment, directory picker, name. |
| **BrowserView.tsx** | Native WebView2 browser. Tabs with pin/restore/drag-reorder, URL bar, bookmarks, split terminal (real PTY), DevTools toggle, Google S2 favicons, session persistence. Uses PhysicalPosition/PhysicalSize for DPI-safe positioning. |

### Settings (SettingsPage.tsx)

| Tab | Content |
|---|---|
| **Account** | Profile card, billing/plan info, session management, sign out, updates check, log file path |
| **Appearance** | 15 themes with live preview canvas, quality audit (readability/layering/terminal/accent scores), theme JSON import/export/duplicate, theme studio, dark + light grids |
| **Shortcuts** | Keyboard bindings reference (workspaces, panes, AI features) |
| **AI Agents** | Default agent selection (Claude, Codex, Gemini, OpenCode, Cursor) with radio buttons |
| **SiulkVoice** | Enable toggle, Push-to-Talk hotkey, Toggle Recording hotkey, Transcription Mode (Local Whisper / Cloud), Microphone selection, How It Works guide |
| **CLI** | `sloerspace` CLI installation instructions, verify command, usage reference |
| **Terminal** | Default Shell radio selection: System Default, Windows PowerShell, Command Prompt, Git Bash |
| **API Keys** | Pro-gated API key generation for MCP endpoints |
| **Data** | Export/import backup JSON, factory reset (danger zone) |

### Supporting Components

| Component | Description |
|---|---|
| **TitleBar.tsx** | Custom frameless title bar. Workspace tabs, quick shell picker (PowerShell/CMD/Git Bash), SiulkVoice pill widget (recording toggle with animated states), search/command palette, settings, window controls. |
| **NavigationMenu.tsx** | Sidebar: Home, Terminal, Kanban, Agents, Prompts, SloerSwarm, Browser, Settings |
| **CommandPalette.tsx** | Ctrl+K launcher. Starred commands, snippets, recent session commands for replay. |
| **StatusBar.tsx** | Bottom bar: runtime backend kind, session info |
| **LoginPage.tsx** | Premium operator-access auth. Signup marks onboarding incomplete; sign-in/guest skip it. |
| **Toast.tsx** | Notification system (success, warning, error, info) |
| **UpgradeModal.tsx** | Premium upgrade modal |
| **ErrorBoundary.tsx** | React error boundary |

---

## State Management (appStore.ts)

### View System

```
Views: home | terminal | kanban | agents | prompts | settings
      | swarm-launch | swarm-dashboard | workspace-wizard | canvas-wizard
      | canvas | browser | login
```

### Type Definitions

| Type | Values |
|---|---|
| **ThemeId** | sloerspace, github-dark, catppuccin-mocha, rose-pine, one-dark-pro, nord, dracula, everforest-dark, poimandres, oled-dark, neon-tech, synthwave, catppuccin-latte, github-light, rose-pine-dawn |
| **SettingsTab** | account, appearance, shortcuts, ai-agents, siulk-voice, cli, terminal, api-keys, data |
| **AgentCli** | claude, codex, gemini, opencode, cursor |
| **AgentRole** | builder, reviewer, scout, coord, custom |
| **TerminalShellKind** | auto, powershell, command-prompt, git-bash |
| **TerminalSessionKind** | local, agent-attached |
| **SiulkVoiceTranscriptionMode** | local, cloud |
| **WorkspaceKind** | terminal, swarm, browser |
| **KanbanColumn** | todo, in-progress, in-review, complete, cancelled |
| **KanbanPriority** | low, medium, high, critical |
| **UserPlan** | free (default), pro |

### Core State Fields

```typescript
// Theme
theme: ThemeId                          // Active built-in theme
customTheme: CustomThemePreset | null   // Imported custom runtime theme

// Workspaces
workspaceTabs: WorkspaceTab[]           // Open tabs (id, name, color, view, kind, paneCount, workingDirectory)
activeTabId: string | null
terminalSessions: Record<string, TerminalPane[]>  // Workspace ID → panes
swarmSessions: Record<string, SwarmSession>        // Workspace ID → swarm

// Features
kanbanTasks: KanbanTask[]
customAgents: CustomAgent[]
prompts: Prompt[]
defaultAgent: AgentCli

// Wizard
wizardStep: number
wizardLayout: number                    // 1-16 pane grid
wizardAgentConfig: Record<AgentCli, number>

// User
userProfile: { username, email, plan, accountId }
isLoggedIn: boolean
authToken: string | null
sessionDevice: string | null
trialStartedAt: string | null           // 7-day trial timer
showOnStartup: boolean
hasCompletedOnboarding: boolean

// Terminal
recentProjects: string[]                // Last 10
pendingTerminalCommand: string | null
commandAliases: Record<string, string>
starredCommands: string[]
commandSnippets: Array<{ id, name, command }>

// SiulkVoice
siulkVoice: {
  enabled: boolean
  transcriptionMode: 'local' | 'cloud'
  pushToTalkKey: string | null
  toggleRecordingKey: string | null
  selectedMicrophone: string | null
  isRecording: boolean
  isProcessing: boolean
  lastTranscript: string | null
}

// Terminal Settings
terminalSettings: {
  defaultShell: TerminalShellKind       // auto | powershell | command-prompt | git-bash
}

// Browser
browserTabs: SavedBrowserTab[]         // Persisted tabs with history, favicon, pinned state
browserSplitMode: BrowserSplitMode     // 'full' | 'split-right' | 'split-bottom'
browserActiveTabId: string | null
browserShowBookmarks: boolean
```

### Key Interfaces

```typescript
interface WorkspaceTab {
  id, name, color, view, kind, splitDirection, paneCount, isActive, workingDirectory, createdAt
}

interface TerminalPane {
  id, cwd, commands: CommandBlock[], agentCli?, sessionKind?, shellKind?,
  shellBootstrapCommand?, isActive, label?, isRunning?, commandHistory?,
  isLocked?, runtimeSessionId?, runtimeSession?: TerminalSessionSnapshot
}

interface SwarmSession {
  id, name, objective, workingDirectory, agents: SwarmAgent[], status,
  startedAt, knowledgeFiles, contextNotes, missionDirectives, messages: SwarmMessage[]
}

interface SwarmAgent {
  id, name, role, cli, cliBootstrapCommand?, terminalPaneId?,
  status, task, output?, runtime, progress, tokens, autoApprove, startedAt
}
```

### Persistence

- **Storage key**: `sloerspace-dev-store`
- **Migration version**: 10
- **Migrations**: v5 (startup view), v6 (command aliases/snippets), v7 (custom theme), v8 (onboarding), v9 (siulkVoice + terminalSettings), v10 (browser state + transient view reset)
- **Normalizers**: Safe rehydration for all state fields with type guards, fallback defaults, and boundary clamping

---

## Rust Backend (src-tauri/src/lib.rs)

### Tauri Commands

| Command | Description |
|---|---|
| `run_terminal_command` | Execute shell command, returns stdout/stderr/exitCode/durationMs/resolvedCwd |
| `run_terminal_session_command` | Execute in persistent PTY session with tracking |
| `cancel_terminal_command` | Cancel running command by ID |
| `get_terminal_capabilities` | Runtime backend descriptor + shell info |
| `get_default_workdir` | User home directory |
| `list_directory` | List files/dirs at path |
| `read_text_file` / `write_text_file` | File I/O |
| `get_system_info` | OS, arch, hostname, username, shell, node/rust versions |
| `check_app_update` / `install_app_update` | GitHub releases auto-update |
| `get_agent_cli_resolutions` | Resolve availability for all 5 agent CLIs |
| `inspect_working_directory` | Project type, package manager, git repo, recommended commands |
| `get_terminal_session_events` | Session timeline events |
| `write_terminal_session_input` | PTY interactive input |
| `resize_terminal_session` | PTY resize |
| `browser_create_pane` | Create native WebView2 child webview at physical pixel coordinates |
| `browser_close_pane` | Hide + close native webview |
| `browser_navigate_pane` | Navigate in-place via JS eval (no destroy/recreate) |
| `browser_resize_pane` | Reposition/resize webview using PhysicalPosition/PhysicalSize |
| `browser_list_panes` | List active browser panes |
| `browser_toggle_devtools` | Toggle WebView2 DevTools inspector |
| `browser_set_visible` | Show/hide webview without destroying it |

### Terminal Architecture

- **Active backend**: Persistent PTY (portable-pty)
- **Features**: persistent sessions, streaming output, interactive input, session resize
- **Events**: `terminal-session-live` (snapshot + event), `terminal-session-stream` (chunk + sequence)
- **Session tracking**: bounded event timeline (max 80 events), execution count, last command/exit code/duration
- **Markers**: `__SLOER_CMD_START_`, `__SLOER_CMD_END_`, `__EXIT__`, `__CWD__` for completion parsing
- **PTY defaults**: 32 rows × 120 cols, max 1MB output, 1 hour timeout

### Rust Dependencies

```toml
tauri = { version = "2", features = ["unstable", "devtools"] }
tauri-plugin-shell = "2"
tauri-plugin-opener = "2"
tauri-plugin-dialog = "2"
portable-pty = "0.9"
reqwest = "0.12"           # rustls-tls, json
semver = "1"
serde = "1"                # derive
serde_json = "1"
tokio = "1"                # process, time, fs, sync
```

---

## Desktop Bridge (src/lib/desktop.ts)

All Rust commands wrapped in async TypeScript with `isTauriApp()` guards and browser fallbacks.

### Key Interfaces

```typescript
TerminalCommandResult      // stdout, stderr, exitCode, durationMs, resolvedCwd, timedOut, cancelled
TerminalSessionSnapshot    // sessionId, sessionKind, backendKind, cwd, isRunning, executionMode, shell
TerminalSessionStreamEvent // sessionId, commandId, chunk, sequence
TerminalCapabilities       // desktopRuntimeAvailable, commandBlocks, persistentSessions, streamingOutput...
AgentCliResolution         // cli, available, resolvedPath, bootstrapCommand
WorkingDirectoryInsight    // cwd, projectType, packageManager, isGitRepo, recommendedCommands
AppUpdateInfo              // currentVersion, latestVersion, hasUpdate, installerAvailable, assetDownloadUrl
```

---

## CSS Architecture (globals.css)

### Design Tokens (CSS Custom Properties)

```css
/* Surfaces */
--surface-0 through --surface-5     /* Layered depth */
--surface-glass, --surface-glass-strong

/* Text */
--text-primary, --text-secondary, --text-muted

/* Accents */
--accent (#4f8cff), --accent-hover, --accent-glow, --accent-subtle
--secondary (#28e7c5), --secondary-glow

/* Semantic */
--success (#38dd92), --warning (#ffbf62), --error (#ff6f96), --info (#8fc2ff)

/* Terminal */
--terminal-bg, --terminal-text

/* Borders & Shadows */
--border, --border-hover, --shadow-soft, --shadow-strong
```

### Themes (15)

| Dark | Light |
|---|---|
| SloerSpace (default) | Catppuccin Latte |
| GitHub Dark | GitHub Light |
| Catppuccin Mocha | Rosé Pine Dawn |
| Rosé Pine | |
| One Dark Pro | |
| Nord | |
| Dracula | |
| Everforest Dark | |
| Poimandres | |
| OLED Dark | |
| Neon Tech | |
| Synthwave | |

### Premium Utility Classes

- `.premium-panel`, `.premium-panel-elevated` — Glass panel containers
- `.premium-card-shell` — Card with layered background
- `.premium-chip` — Status/tag chip
- `.premium-kbd` — Keyboard shortcut badge
- `.premium-stat` — Metric display
- `.premium-surface-grid`, `.premium-shine` — Subtle surface patterns
- `.premium-status-glow`, `.premium-interactive` — Glow/hover effects
- `.premium-focus-ring` — Accessible focus indicator
- `.premium-meter-fill` — Progress bar fill
- `.btn-primary`, `.btn-secondary`, `.btn-ghost` — Button variants
- `.gradient-accent` — Accent gradient line

### Animations

- `animate-fade-in` — Fade in
- `animate-scale-in` — Scale + fade in
- `swarm-flow` — Animated dash offset for swarm handoff lines

---

## SiulkVoice Integration

### Frontend (implemented)

- **State**: `SiulkVoiceSettings` in appStore.ts (enabled, transcriptionMode, hotkeys, microphone, recording state)
- **Settings tab**: Full settings page with enable toggle, hotkey capture, transcription mode cards, microphone picker, How It Works
- **Header pill**: `TitleBar.tsx` — shows when enabled, click toggles recording, animated pulse when active

### Backend Reference (SIULK-VOICE project)

- **Location**: `C:\Users\jhons\Downloads\work\SIULK-VOICE`
- **Stack**: Tauri 2 + Vite + React + Rust
- **Whisper**: `whisper.rs` — uses `whisper-rs` crate with `ggml-base.en.bin` model (~142MB)
- **Audio**: `cpal` for microphone capture, downmix to mono, resample to 16kHz
- **Features**: Model warmup/caching, partial transcripts during recording, smart list formatting, snippet expansion, dictionary replacements, sanitization
- **Status**: Frontend UI layer ready in SloerSpace; Rust Whisper backend to be ported to `src-tauri` when ready

---

## Build & Packaging

### Windows

```bash
npm run tauri:build
```

- **Raw executable**: `src-tauri/target/release/sloerspace-dev.exe`
- **NSIS installer**: `src-tauri/target/release/bundle/nsis/SloerSpace Dev_x.x.x_x64-setup.exe`
- **MSI installer**: `src-tauri/target/release/bundle/msi/SloerSpace Dev_x.x.x_x64_en-US.msi`

### CI/CD

- GitHub Actions: auto-build on version tag push
- Platforms: Windows, macOS (Intel + Apple Silicon), Linux
- Artifacts: `.msi`, `.exe`, `.dmg`, `.AppImage`, `.deb`

---

## Tauri Configuration (tauri.conf.json)

```json
{
  "productName": "SloerSpace Dev",
  "version": "1.0.0",
  "identifier": "dev.sloerspace.desktop",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "windows": [{
      "title": "SloerSpace Dev",
      "width": 1400, "height": 900,
      "minWidth": 900, "minHeight": 600,
      "decorations": false,
      "resizable": true, "center": true
    }]
  },
  "bundle": { "active": true, "targets": "all" }
}
```

---

## Design Philosophy

- **Enterprise-grade** — Elegant business/developer vibe coding aesthetic
- **Dark-first** — Solid layered surfaces, no muddy transparencies
- **Premium glass panels** — Rounded corners (16-32px), gradient accents, subtle glows
- **Typography** — Space Grotesk headings, Inter body, JetBrains Mono code
- **Color system** — Cobalt accent `#4f8cff`, teal secondary `#28e7c5`, warm warning `#ffbf62`, pink error `#ff6f96`
- **Animations** — Meaningful, representational transitions between states
- **Accessibility** — Focus rings, keyboard shortcuts, aria attributes

---

## Native Browser Architecture (CRITICAL)

### DPI-Safe WebView Positioning

- **ALWAYS** use `PhysicalPosition<i32>` / `PhysicalSize<u32>` for `add_child`, `set_position`, `set_size`
- Frontend multiplies CSS pixels by `window.devicePixelRatio` before sending to Rust
- `LogicalPosition`/`LogicalSize` causes gaps on displays with DPI scaling (125%, 150%)

### Webview Lifecycle

- **Create ONCE** per tab ID — navigate via `eval("window.location.href='...'")` (no destroy/recreate)
- **Show/hide** via `browser_set_visible` for new tab page (instant, no flash)
- **hide() before close()** for instant visual removal on cleanup
- **Dark background**: `initialization_script` sets `#0a0e17` on creation to prevent white flash

### Positioning Method

- Walk `offsetTop`/`offsetLeft` chain (NOT `getBoundingClientRect()` which is affected by CSS transforms)
- Force right edge to `document.documentElement.clientWidth`
- CSS `view-enter` animation disabled for browser view (`view-enter-none` class) — `scale(0.99)` breaks measurements

### Startup

- Loading splash screen until Zustand hydrates (prevents flash of stale state)
- Transient views (`workspace-wizard`, `canvas-wizard`, `swarm-launch`) reset to `home` on startup

---

*Built with Rust + Next.js by **SloerSpace***
