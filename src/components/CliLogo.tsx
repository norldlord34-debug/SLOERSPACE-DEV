'use client'

import type { AgentCli } from '@/store/useStore'

const CLI_BRAND: Record<AgentCli, { color: string; bg: string; label: string }> = {
  claude: { color: '#e8956a', bg: '#e8956a18', label: 'Claude' },
  codex: { color: '#10a37f', bg: '#10a37f18', label: 'Codex' },
  gemini: { color: '#4285f4', bg: '#4285f418', label: 'Gemini' },
  opencode: { color: '#06b6d4', bg: '#06b6d418', label: 'OpenCode' },
  cursor: { color: '#a855f7', bg: '#a855f718', label: 'Cursor' },
  droid: { color: '#84cc16', bg: '#84cc1618', label: 'Droid' },
  copilot: { color: '#58a6ff', bg: '#58a6ff18', label: 'Copilot' },
}

/* ── Anthropic Claude – official logo (Bootstrap Icons bi-claude) ── */
function ClaudeSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="#e8956a">
      <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
    </svg>
  )
}

/* ── OpenAI / Codex – official logo (Bootstrap Icons bi-openai) ── */
function CodexSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="#10a37f">
      <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z"/>
    </svg>
  )
}

/* ── Google Gemini – official 4-pointed star (simplified from official SVG) ── */
function GeminiSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 65 65" fill="none">
      <path d="M32.447 0c.68 0 1.273.465 1.439 1.125a38.9 38.9 0 002 5.905c2.15 5 5.1 9.376 8.853 13.125 3.75 3.75 8.126 6.703 13.125 8.855a39 39 0 005.906 2c.66.165 1.124.757 1.124 1.437 0 .68-.464 1.273-1.125 1.44a38.9 38.9 0 00-5.905 1.998c-5 2.152-9.375 5.105-13.125 8.855-3.75 3.75-6.702 8.125-8.854 13.125a39 39 0 00-2 5.905 1.485 1.485 0 01-1.438 1.125c-.68 0-1.272-.465-1.438-1.125a38.9 38.9 0 00-2-5.905c-2.15-5-5.103-9.376-8.854-13.125-3.75-3.75-8.125-6.703-13.125-8.855a39 39 0 00-5.905-2A1.485 1.485 0 010 32.447c0-.68.465-1.272 1.125-1.438a38.9 38.9 0 005.905-2c5-2.15 9.376-5.104 13.125-8.854 3.75-3.75 6.703-8.125 8.855-13.125a39 39 0 002-5.905A1.485 1.485 0 0132.447 0z" fill="url(#gemini_g)"/>
      <defs>
        <linearGradient id="gemini_g" x1="18" y1="43" x2="52" y2="15" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285f4"/>
          <stop offset="0.5" stopColor="#9b72cb"/>
          <stop offset="1" stopColor="#d96570"/>
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ── OpenCode – terminal code brackets icon ── */
function OpenCodeSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
      <line x1="14" y1="4" x2="10" y2="20"/>
    </svg>
  )
}

/* ── Cursor IDE – official cursor pointer shape ── */
function CursorSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.65 2.65l12.7 8.15-5.3 1.55-2.85 5.65z" fill="#a855f7"/>
      <path d="M13.05 12.35l3.95 6.65" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M5.65 2.65l12.7 8.15-5.3 1.55-2.85 5.65z" stroke="#c084fc" strokeWidth="0.8" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  )
}

/* ── Droid – Android-inspired robot head ── */
function DroidSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 11a6 6 0 0112 0v4a3 3 0 01-3 3H9a3 3 0 01-3-3v-4z" fill="#84cc16" opacity="0.2" stroke="#84cc16" strokeWidth="1.5"/>
      <circle cx="9.5" cy="13" r="1.2" fill="#84cc16"/>
      <circle cx="14.5" cy="13" r="1.2" fill="#84cc16"/>
      <path d="M8.5 5.5L10 8M15.5 5.5L14 8" stroke="#84cc16" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

/* ── GitHub Copilot – official pilot visor / helmet shape ── */
function CopilotSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8 2 4.5 4.5 3.5 8.5c-.5 2 0 4 1 5.5l1.5 2V19a1 1 0 001 1h10a1 1 0 001-1v-3l1.5-2c1-1.5 1.5-3.5 1-5.5C19.5 4.5 16 2 12 2z" fill="#58a6ff" opacity="0.15" stroke="#58a6ff" strokeWidth="1.5"/>
      <path d="M7 11.5c0-1.1.9-2 2-2h6a2 2 0 012 2v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1z" fill="#58a6ff" opacity="0.9"/>
      <circle cx="9.5" cy="12" r="1" fill="white"/>
      <circle cx="14.5" cy="12" r="1" fill="white"/>
    </svg>
  )
}

const SVG_MAP: Record<AgentCli, React.FC<{ size: number }>> = {
  claude: ClaudeSvg,
  codex: CodexSvg,
  gemini: GeminiSvg,
  opencode: OpenCodeSvg,
  cursor: CursorSvg,
  droid: DroidSvg,
  copilot: CopilotSvg,
}

export function CliLogo({ cli, size = 20 }: { cli: AgentCli; size?: number }) {
  const SvgIcon = SVG_MAP[cli]
  return <SvgIcon size={size} />
}

export function getCliBrand(cli: AgentCli) {
  return CLI_BRAND[cli]
}
