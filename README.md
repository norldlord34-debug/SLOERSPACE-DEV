<p align="center">
  <img src="LOGO.png" alt="SloerSpace Dev" width="200" />
</p>

<h1 align="center">SloerSpace Dev</h1>

<p align="center">
  <strong>Agentic Development Environment</strong><br/>
  A next-generation desktop IDE built with Tauri, Next.js, and Rust — designed for developers who think in swarms.
</p>

<p align="center">
  <a href="https://github.com/norldlord34-debug/SLOERSPACE-DEV/actions"><img src="https://github.com/norldlord34-debug/SLOERSPACE-DEV/actions/workflows/release.yml/badge.svg" alt="Build Status" /></a>
  <a href="https://github.com/norldlord34-debug/SLOERSPACE-DEV/releases"><img src="https://img.shields.io/github/v/release/norldlord34-debug/SLOERSPACE-DEV?color=blue&label=Latest%20Release" alt="Latest Release" /></a>
  <img src="https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platforms" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## Overview

**SloerSpace Dev** is a cross-platform desktop application that combines a powerful terminal, an agent swarm orchestrator, a Kanban board, and a workspace wizard into a single, cohesive development environment. Built on top of **Tauri 2** (Rust backend) and **Next.js 14** (React frontend), it delivers native performance with a modern, themeable UI.

---

## Features

| Module | Description |
|---|---|
| **Terminal** | Fully-featured integrated terminal with tab support, autocomplete, command history, git branch detection, and system info — powered by real OS shell execution via Rust. |
| **Swarm Orchestrator** | Launch, configure, and monitor multi-agent swarms with a step-by-step wizard, live dashboard, canvas view, and activity console. |
| **Workspace Wizard** | Create and manage project workspaces with guided setup flows and directory browsing. |
| **Kanban Board** | Organize tasks and track progress with a built-in drag-and-drop board. |
| **Agents** | Define and manage AI agent presets with custom roles, models, and capabilities. |
| **Prompts** | A library of prompt templates for fast, repeatable agent interactions. |
| **Settings & Themes** | Extensive appearance customization with multiple built-in themes and live previews. |
| **Command Palette** | Quick-access command launcher (Ctrl/Cmd + K) for navigating anywhere instantly. |
| **Login & Upgrade** | Authentication flow and premium upgrade modal integrated in-app. |

---

## Download

Pre-built binaries for all platforms are available on the [**Releases**](https://github.com/norldlord34-debug/SLOERSPACE-DEV/releases) page.

| Platform | Artifact |
|---|---|
| **Windows** (x64) | `.msi` installer / `.exe` (NSIS) |
| **macOS** (Intel) | `.dmg` disk image |
| **macOS** (Apple Silicon) | `.dmg` disk image |
| **Linux** (x64) | `.AppImage` / `.deb` |

> Releases are built automatically via GitHub Actions on every tagged version push.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, TailwindCSS 3 |
| **Backend** | Tauri 2, Rust (tokio, serde) |
| **State** | Zustand 5 |
| **Icons** | Lucide React |
| **Bundler** | Tauri Bundler (MSI, NSIS, DMG, AppImage, DEB) |

---

## Prerequisites

Before building from source, make sure you have the following installed:

- **Node.js** >= 18
- **npm** >= 9
- **Rust** >= 1.77 (via [rustup](https://rustup.rs))
- **Tauri CLI** (`npm install -g @tauri-apps/cli` or use the local dev dependency)

### Platform-specific dependencies

<details>
<summary><strong>Windows</strong></summary>

- Microsoft Visual Studio C++ Build Tools
- WebView2 (pre-installed on Windows 10/11)

</details>

<details>
<summary><strong>macOS</strong></summary>

- Xcode Command Line Tools: `xcode-select --install`
- For Apple Silicon cross-compile: `rustup target add aarch64-apple-darwin`

</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

</details>

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/norldlord34-debug/SLOERSPACE-DEV.git
cd SLOERSPACE-DEV

# Install frontend dependencies
npm install

# Run in development mode (hot-reload)
npm run tauri:dev

# Build production binaries for your current OS
npm run tauri:build
```

The compiled installers will be located in `src-tauri/target/release/bundle/`.

---

## Project Structure

```
SLOERSPACE-DEV/
├── public/                  # Static assets (logo, images)
├── src/
│   ├── app/                 # Next.js app directory (layout, globals.css)
│   ├── components/          # React UI components
│   │   ├── TerminalView     # Integrated terminal
│   │   ├── SwarmLaunch      # Swarm launch wizard
│   │   ├── SwarmDashboard   # Live swarm monitoring
│   │   ├── AgentsPage       # Agent management
│   │   ├── KanbanBoard      # Task board
│   │   ├── SettingsPage     # Appearance & config
│   │   └── ...
│   ├── lib/                 # Utilities (desktop bridge)
│   └── store/               # Zustand global state
├── src-tauri/
│   ├── src/lib.rs           # Rust backend (commands, shell, fs)
│   ├── tauri.conf.json      # Tauri app configuration
│   └── Cargo.toml           # Rust dependencies
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## CI/CD — Automated Releases

This project uses **GitHub Actions** to automatically build and publish releases for **Windows**, **macOS** (Intel + Apple Silicon), and **Linux** on every version tag push.

To create a new release:

```bash
# Tag a new version
git tag v0.1.0
git push origin v0.1.0
```

The workflow will:
1. Build the Next.js frontend
2. Compile the Tauri/Rust backend for all three platforms
3. Upload `.msi`, `.exe`, `.dmg`, `.AppImage`, and `.deb` artifacts
4. Create a GitHub Release with all binaries attached

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build Next.js for production |
| `npm run tauri:dev` | Launch Tauri in development mode |
| `npm run tauri:build` | Build production desktop binaries |
| `npm run lint` | Run ESLint |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with Rust + Next.js by <strong>SloerSpace</strong>
</p>
