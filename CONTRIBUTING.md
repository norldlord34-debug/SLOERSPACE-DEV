# Contributing to SloerSpace Dev

Thank you for your interest in contributing to **SloerSpace Dev**! This guide will help you get started.

---

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/SLOERSPACE-DEV.git
cd SLOERSPACE-DEV
```

### 2. Install Dependencies

```bash
npm install
```

Make sure you also have **Rust** installed via [rustup](https://rustup.rs).

### 3. Run in Development Mode

```bash
npm run tauri:dev
```

---

## Development Workflow

1. **Create a branch** from `master`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** — keep commits focused and descriptive.

3. **Test your changes**:
   - Run `npm run lint` to check for code style issues.
   - Run `npm run tauri:dev` to verify the app works correctly.
   - Test on your OS — note which platform you tested on in the PR.

4. **Push and open a Pull Request**:
   ```bash
   git push origin feature/my-feature
   ```
   Then open a PR on GitHub using the provided template.

---

## Code Style

- **TypeScript/React**: Follow the existing patterns. Use functional components with hooks.
- **Rust**: Follow standard Rust conventions (`cargo fmt` and `cargo clippy`).
- **CSS**: Use TailwindCSS utility classes. Avoid custom CSS unless absolutely necessary.
- **Imports**: Keep imports organized — external libraries first, then internal modules.

---

## Project Structure

| Directory | Purpose |
|---|---|
| `src/components/` | React UI components |
| `src/store/` | Zustand state management |
| `src/lib/` | Utility functions and desktop bridge |
| `src/app/` | Next.js app directory |
| `src-tauri/src/` | Rust backend commands |
| `src-tauri/tauri.conf.json` | Tauri app configuration |

---

## Reporting Bugs

Use the [Bug Report](https://github.com/norldlord34-debug/SLOERSPACE-DEV/issues/new?template=bug_report.md) template. Include:

- Steps to reproduce
- Expected vs actual behavior
- OS and app version
- Screenshots if applicable

---

## Requesting Features

Use the [Feature Request](https://github.com/norldlord34-debug/SLOERSPACE-DEV/issues/new?template=feature_request.md) template.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

Thank you for contributing!
