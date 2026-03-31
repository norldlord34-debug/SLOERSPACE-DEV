'use client'

import Image from 'next/image'
import { checkAppUpdate, getAppVersion, installAppUpdate, type AppUpdateInfo } from '@/lib/desktop'
import { useStore, ThemeId, AgentCli, SettingsTab, CustomThemePreset, AIProvider, WhisperModel, WhisperLanguage } from '@/store/useStore'
import { useToast } from '@/components/Toast'
import { Palette, Keyboard, Bot, User, Key, ExternalLink, LogOut, Download, FileText, Check, Sparkles, ShieldCheck, Command, Upload, Database, Trash2, AlertTriangle, ChevronRight, Mail, Mic, Terminal, MonitorSmartphone, Radio, RefreshCw, Braces, Eye, EyeOff, Bell, HelpCircle, Zap, Globe, Layers, MessageSquare, Server, Activity, ChevronDown as ChevronDownIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const SETTINGS_TABS: { id: SettingsTab; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'account', label: 'Account', desc: 'Profile and billing', icon: User },
  { id: 'appearance', label: 'Appearance', desc: 'Theme and display', icon: Palette },
  { id: 'shortcuts', label: 'Shortcuts', desc: 'Keyboard bindings', icon: Keyboard },
  { id: 'ai-agents', label: 'AI Agents', desc: 'Default coding agent', icon: Bot },
  { id: 'ai-settings', label: 'AI Provider', desc: 'API keys & models', icon: Braces },
  { id: 'siulk-voice', label: 'SiulkVoice', desc: 'Voice-to-text dictation', icon: Mic },
  { id: 'notifications', label: 'Notifications', desc: 'Sounds and alerts', icon: Bell },
  { id: 'cli', label: 'CLI', desc: 'Install sloerspace command', icon: MonitorSmartphone },
  { id: 'terminal', label: 'Terminal', desc: 'Default shell', icon: Terminal },
  { id: 'api-keys', label: 'API Keys', desc: 'Create and manage keys', icon: Key },
  { id: 'data', label: 'Data', desc: 'Export, import, reset', icon: Database },
  { id: 'help', label: 'Help', desc: 'Features & shortcuts', icon: HelpCircle },
]

type ThemeDescriptor = {
  id: ThemeId
  name: string
  mode: 'dark' | 'light'
  colors: [string, string, string]
  surface0: string
  surface1: string
  surface2: string
  surface3: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  accent: string
  secondary: string
  border: string
  terminalBg: string
  terminalText: string
  description: string
}

type ThemePreviewDescriptor = Omit<ThemeDescriptor, 'id'> & { id: string }

const THEME_LIBRARY: ThemeDescriptor[] = [
  {
    id: 'sloerspace',
    name: 'SloerSpace',
    mode: 'dark',
    colors: ['#ef4444', '#22c55e', '#3b82f6'],
    surface0: '#03050a',
    surface1: '#07101a',
    surface2: '#0c1522',
    surface3: '#111d2d',
    textPrimary: '#f4f7ff',
    textSecondary: '#aeb9cf',
    textMuted: '#647189',
    accent: '#4f8cff',
    secondary: '#28e7c5',
    border: 'rgba(158, 197, 255, 0.1)',
    terminalBg: '#040914',
    terminalText: '#d9e8ff',
    description: 'Signature cobalt shell with enterprise depth and operator-grade contrast.',
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    mode: 'dark',
    colors: ['#f0883e', '#3fb950', '#58a6ff'],
    surface0: '#0d1117',
    surface1: '#161b22',
    surface2: '#21262d',
    surface3: '#30363d',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    textMuted: '#484f58',
    accent: '#238636',
    secondary: '#58a6ff',
    border: '#30363d',
    terminalBg: '#0d1117',
    terminalText: '#e6edf3',
    description: 'Repository-native dark balance with disciplined contrast and calm accents.',
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    mode: 'dark',
    colors: ['#f38ba8', '#a6e3a1', '#89b4fa'],
    surface0: '#1e1e2e',
    surface1: '#252536',
    surface2: '#313244',
    surface3: '#3b3b52',
    textPrimary: '#cdd6f4',
    textSecondary: '#a6adc8',
    textMuted: '#6c7086',
    accent: '#a6e3a1',
    secondary: '#94e2d5',
    border: '#45475a',
    terminalBg: '#1e1e2e',
    terminalText: '#cdd6f4',
    description: 'Velvet dark palette with pastel syntax energy and soft premium layering.',
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    mode: 'dark',
    colors: ['#eb6f92', '#9ccfd8', '#c4a7e7'],
    surface0: '#191724',
    surface1: '#1f1d2e',
    surface2: '#26233a',
    surface3: '#2a2740',
    textPrimary: '#e0def4',
    textSecondary: '#908caa',
    textMuted: '#6e6a86',
    accent: '#c4a7e7',
    secondary: '#9ccfd8',
    border: '#393552',
    terminalBg: '#191724',
    terminalText: '#e0def4',
    description: 'Muted plum atmosphere built for elegant late-night operator workflows.',
  },
  {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    mode: 'dark',
    colors: ['#e06c75', '#98c379', '#61afef'],
    surface0: '#1e2127',
    surface1: '#282c34',
    surface2: '#2c313a',
    surface3: '#363b44',
    textPrimary: '#abb2bf',
    textSecondary: '#828997',
    textMuted: '#545862',
    accent: '#98c379',
    secondary: '#56b6c2',
    border: '#3e4452',
    terminalBg: '#1e2127',
    terminalText: '#abb2bf',
    description: 'Classic editor-native dark with reliable separation and calm green emphasis.',
  },
  {
    id: 'nord',
    name: 'Nord',
    mode: 'dark',
    colors: ['#bf616a', '#a3be8c', '#81a1c1'],
    surface0: '#2e3440',
    surface1: '#3b4252',
    surface2: '#434c5e',
    surface3: '#4c566a',
    textPrimary: '#eceff4',
    textSecondary: '#d8dee9',
    textMuted: '#7b88a1',
    accent: '#a3be8c',
    secondary: '#88c0d0',
    border: '#4c566a',
    terminalBg: '#2e3440',
    terminalText: '#eceff4',
    description: 'Arctic control room tone with quiet blues and highly structured surfaces.',
  },
  {
    id: 'everforest-dark',
    name: 'Everforest Dark',
    mode: 'dark',
    colors: ['#e67e80', '#a7c080', '#7fbbb3'],
    surface0: '#272e33',
    surface1: '#2d353b',
    surface2: '#343f44',
    surface3: '#3d484d',
    textPrimary: '#d3c6aa',
    textSecondary: '#a7c080',
    textMuted: '#7a8478',
    accent: '#a7c080',
    secondary: '#83c092',
    border: '#3d484d',
    terminalBg: '#272e33',
    terminalText: '#d3c6aa',
    description: 'Organic dark field for low-fatigue sessions and warm, stable readability.',
  },
  {
    id: 'poimandres',
    name: 'Poimandres',
    mode: 'dark',
    colors: ['#d0679d', '#5de4c7', '#add7ff'],
    surface0: '#1b1e28',
    surface1: '#232736',
    surface2: '#2b2f3e',
    surface3: '#333847',
    textPrimary: '#e4f0fb',
    textSecondary: '#a6accd',
    textMuted: '#506477',
    accent: '#5de4c7',
    secondary: '#add7ff',
    border: '#303340',
    terminalBg: '#1b1e28',
    terminalText: '#e4f0fb',
    description: 'Futurist navy palette with vivid mint telemetry and crystalline highlights.',
  },
  {
    id: 'oled-dark',
    name: 'OLED Dark',
    mode: 'dark',
    colors: ['#ff3333', '#00ff88', '#4488ff'],
    surface0: '#000000',
    surface1: '#0a0a0a',
    surface2: '#141414',
    surface3: '#1e1e1e',
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    textMuted: '#606060',
    accent: '#00ff88',
    secondary: '#4488ff',
    border: '#222222',
    terminalBg: '#000000',
    terminalText: '#ffffff',
    description: 'Absolute black contrast profile with punchy neon telemetry for deep displays.',
  },
  {
    id: 'dark-contrast-puro',
    name: 'Dark Contrast Puro',
    mode: 'dark',
    colors: ['#ff5c5c', '#39ffb5', '#7aa2ff'],
    surface0: '#000000',
    surface1: '#050505',
    surface2: '#0b0b0d',
    surface3: '#111216',
    textPrimary: '#ffffff',
    textSecondary: '#d9dde7',
    textMuted: '#8d95a6',
    accent: '#7aa2ff',
    secondary: '#dce6ff',
    border: '#252932',
    terminalBg: '#000000',
    terminalText: '#ffffff',
    description: 'Pure black operator canvas with razor-sharp text, crisp borders and cold-blue highlights.',
  },
  {
    id: 'neon-tech',
    name: 'Neon Tech',
    mode: 'dark',
    colors: ['#ff4466', '#00ffcc', '#44aaff'],
    surface0: '#0a0a1a',
    surface1: '#0f0f2a',
    surface2: '#15153a',
    surface3: '#1c1c4a',
    textPrimary: '#e0e0ff',
    textSecondary: '#8888cc',
    textMuted: '#5555aa',
    accent: '#00ffcc',
    secondary: '#ff44ff',
    border: '#2a2a5a',
    terminalBg: '#0a0a1a',
    terminalText: '#e0e0ff',
    description: 'High-energy cyber shell with luminous cyan command accents and deep indigo layers.',
  },
  {
    id: 'dracula',
    name: 'Dracula',
    mode: 'dark',
    colors: ['#ff5555', '#50fa7b', '#bd93f9'],
    surface0: '#21222c',
    surface1: '#282a36',
    surface2: '#343746',
    surface3: '#3e4154',
    textPrimary: '#f8f8f2',
    textSecondary: '#bfbfbf',
    textMuted: '#6272a4',
    accent: '#50fa7b',
    secondary: '#8be9fd',
    border: '#44475a',
    terminalBg: '#21222c',
    terminalText: '#f8f8f2',
    description: 'Cult-favorite dark environment with vivid syntax color and playful polish.',
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    mode: 'dark',
    colors: ['#fe4450', '#72f1b8', '#36f9f6'],
    surface0: '#1a1025',
    surface1: '#241535',
    surface2: '#2e1a45',
    surface3: '#382055',
    textPrimary: '#f0e0ff',
    textSecondary: '#cc88ff',
    textMuted: '#7744aa',
    accent: '#ff6ec7',
    secondary: '#36f9f6',
    border: '#3a2060',
    terminalBg: '#1a1025',
    terminalText: '#f0e0ff',
    description: 'Retro-future stage lighting with rich magenta contrast and bright terminal detail.',
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    mode: 'light',
    colors: ['#d20f39', '#40a02b', '#1e66f5'],
    surface0: '#eff1f5',
    surface1: '#e6e9ef',
    surface2: '#dce0e8',
    surface3: '#ccd0da',
    textPrimary: '#4c4f69',
    textSecondary: '#5c5f77',
    textMuted: '#8c8fa1',
    accent: '#40a02b',
    secondary: '#179299',
    border: '#ccd0da',
    terminalBg: '#e6e9ef',
    terminalText: '#4c4f69',
    description: 'Creamy pastel daylight profile with smooth hierarchy and gentle operator focus.',
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    mode: 'light',
    colors: ['#cf222e', '#1a7f37', '#0969da'],
    surface0: '#ffffff',
    surface1: '#f6f8fa',
    surface2: '#eaeef2',
    surface3: '#d0d7de',
    textPrimary: '#1f2328',
    textSecondary: '#656d76',
    textMuted: '#8c959f',
    accent: '#1a7f37',
    secondary: '#0969da',
    border: '#d0d7de',
    terminalBg: '#f6f8fa',
    terminalText: '#1f2328',
    description: 'Clean product-grade daylight theme with strong document and UI clarity.',
  },
  {
    id: 'rose-pine-dawn',
    name: 'Rosé Pine Dawn',
    mode: 'light',
    colors: ['#b4637a', '#56949f', '#907aa9'],
    surface0: '#faf4ed',
    surface1: '#fffaf3',
    surface2: '#f2e9e1',
    surface3: '#dfdad6',
    textPrimary: '#575279',
    textSecondary: '#797593',
    textMuted: '#9893a5',
    accent: '#907aa9',
    secondary: '#56949f',
    border: '#dfdad6',
    terminalBg: '#f2e9e1',
    terminalText: '#575279',
    description: 'Warm dawn palette with soft editorial balance and refined rose undertones.',
  },
]

const DARK_THEMES = THEME_LIBRARY.filter((theme) => theme.mode === 'dark')
const LIGHT_THEMES = THEME_LIBRARY.filter((theme) => theme.mode === 'light')
const THEME_MAP = THEME_LIBRARY.reduce((acc, theme) => {
  acc[theme.id] = theme
  return acc
}, {} as Record<ThemeId, ThemeDescriptor>)

const AGENTS_LIST: { id: AgentCli; name: string; desc: string; cmd: string }[] = [
  { id: 'claude', name: 'Claude', desc: 'Anthropic Claude Code CLI', cmd: 'claude' },
  { id: 'codex', name: 'Codex', desc: 'OpenAI Codex CLI', cmd: 'codex' },
  { id: 'gemini', name: 'Gemini', desc: 'Google Gemini CLI', cmd: 'gemini' },
  { id: 'opencode', name: 'OpenCode', desc: 'OpenCode TUI agent', cmd: 'opencode' },
  { id: 'cursor', name: 'Cursor', desc: 'Cursor Agent CLI', cmd: 'agent' },
  { id: 'droid', name: 'Droid', desc: 'Droid coding agent', cmd: 'droid' },
  { id: 'copilot', name: 'Copilot', desc: 'GitHub Copilot CLI', cmd: 'copilot' },
]

const SHORTCUTS = [
  { category: 'Workspaces', items: [
    { label: 'New workspace tab', keys: ['Ctrl', 'T'] },
    { label: 'Close workspace', keys: ['Ctrl', 'Shift', 'W'] },
    { label: 'Next workspace', keys: ['Ctrl', 'Shift', ']'] },
    { label: 'Previous workspace', keys: ['Ctrl', 'Shift', '['] },
  ]},
  { category: 'Panes', items: [
    { label: 'New session', keys: ['Ctrl', 'N'] },
    { label: 'Split horizontal', keys: ['Ctrl', 'D'] },
    { label: 'Split vertical', keys: ['Ctrl', 'Shift', 'D'] },
    { label: 'Close active pane', keys: ['Ctrl', 'W'] },
    { label: 'Next pane', keys: ['Ctrl', ']'] },
    { label: 'Previous pane', keys: ['Ctrl', '['] },
  ]},
  { category: 'AI Features', items: [
    { label: 'AI assistance', keys: ['Ctrl', 'K'] },
  ]},
]

function SettingsCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`premium-card-shell rounded-[24px] border p-5 backdrop-blur-[26px] ${className}`}
      style={{
        background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))',
        borderColor: 'var(--border)',
        boxShadow: '0 22px 70px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      {children}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div
          className="premium-card-shell premium-status-glow flex h-11 w-11 items-center justify-center rounded-[18px] border"
          style={{
            background: 'var(--accent-subtle)',
            borderColor: 'var(--border)',
            boxShadow: '0 16px 34px var(--accent-glow)',
          }}
        >
          <Icon size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h1>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
        </div>
      </div>

      <div className="premium-chip">
        <Sparkles size={12} style={{ color: 'var(--warning)' }} />
        Executive Control
      </div>
    </div>
  )
}

function serializeTheme(theme: ThemePreviewDescriptor) {
  return {
    schema: 'sloerspace.theme',
    version: 1,
    id: theme.id,
    name: theme.name,
    mode: theme.mode,
    description: theme.description,
    tokens: {
      surface0: theme.surface0,
      surface1: theme.surface1,
      surface2: theme.surface2,
      surface3: theme.surface3,
      textPrimary: theme.textPrimary,
      textSecondary: theme.textSecondary,
      textMuted: theme.textMuted,
      accent: theme.accent,
      secondary: theme.secondary,
      border: theme.border,
      terminalBg: theme.terminalBg,
      terminalText: theme.terminalText,
    },
  }
}

function parseColorToRgb(input: string) {
  const value = input.trim()

  if (value.startsWith('#')) {
    const normalized = value.slice(1)
    if (normalized.length === 3) {
      return {
        r: parseInt(normalized[0] + normalized[0], 16),
        g: parseInt(normalized[1] + normalized[1], 16),
        b: parseInt(normalized[2] + normalized[2], 16),
      }
    }
    if (normalized.length >= 6) {
      return {
        r: parseInt(normalized.slice(0, 2), 16),
        g: parseInt(normalized.slice(2, 4), 16),
        b: parseInt(normalized.slice(4, 6), 16),
      }
    }
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i)
  if (rgbMatch) {
    const parts = rgbMatch[1].split(',').map((part) => Number.parseFloat(part.trim()))
    return {
      r: Number.isFinite(parts[0]) ? parts[0] : 0,
      g: Number.isFinite(parts[1]) ? parts[1] : 0,
      b: Number.isFinite(parts[2]) ? parts[2] : 0,
    }
  }

  return { r: 127, g: 127, b: 127 }
}

function withAlpha(input: string, alpha: number) {
  const { r, g, b } = parseColorToRgb(input)
  const safeAlpha = Math.max(0, Math.min(1, alpha))
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${safeAlpha})`
}

function getLuminance(input: string) {
  const { r, g, b } = parseColorToRgb(input)
  const normalize = (channel: number) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b)
}

function getContrastRatio(foreground: string, background: string) {
  const luminanceA = getLuminance(foreground)
  const luminanceB = getLuminance(background)
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function evaluateThemeQuality(theme: ThemePreviewDescriptor) {
  const readability = clampScore((getContrastRatio(theme.textPrimary, theme.surface0) / 14) * 100)
  const layering = clampScore((getContrastRatio(theme.surface3, theme.surface0) / 4.8) * 100)
  const terminal = clampScore((getContrastRatio(theme.terminalText, theme.terminalBg) / 14) * 100)
  const accent = clampScore((Math.max(
    getContrastRatio(theme.accent, theme.surface0),
    getContrastRatio(theme.secondary, theme.surface0),
  ) / 8.5) * 100)
  const total = clampScore((readability * 0.34) + (layering * 0.2) + (terminal * 0.24) + (accent * 0.22))

  return { readability, layering, terminal, accent, total }
}

function getQualityLabel(score: number) {
  if (score >= 96) return 'Flagship'
  if (score >= 90) return 'Enterprise ready'
  if (score >= 82) return 'Strong'
  if (score >= 70) return 'Stable'
  return 'Needs refinement'
}

function normalizeImportedTheme(raw: unknown): ThemePreviewDescriptor | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const candidate = raw as Record<string, unknown>
  const tokens = candidate.tokens && typeof candidate.tokens === 'object' && !Array.isArray(candidate.tokens)
    ? candidate.tokens as Record<string, unknown>
    : candidate

  const read = (key: string, fallback = '') => {
    const token = tokens[key]
    return typeof token === 'string' && token.trim() ? token.trim() : fallback
  }

  const accent = read('accent')
  const secondary = read('secondary')
  const textMuted = read('textMuted')
  const preview: ThemePreviewDescriptor = {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : 'imported-preview',
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Imported Theme',
    mode: candidate.mode === 'light' ? 'light' : 'dark',
    colors: [
      accent || '#ff6f96',
      secondary || '#28e7c5',
      textMuted || '#8fc2ff',
    ],
    surface0: read('surface0'),
    surface1: read('surface1'),
    surface2: read('surface2'),
    surface3: read('surface3'),
    textPrimary: read('textPrimary'),
    textSecondary: read('textSecondary'),
    textMuted: textMuted || '#647189',
    accent: accent || '#4f8cff',
    secondary: secondary || '#28e7c5',
    border: read('border', 'rgba(158, 197, 255, 0.1)'),
    terminalBg: read('terminalBg', read('surface0')),
    terminalText: read('terminalText', read('textPrimary')),
    description: typeof candidate.description === 'string' && candidate.description.trim()
      ? candidate.description.trim()
      : 'Imported preview validated from JSON theme tokens.',
  }

  const required = [
    preview.surface0,
    preview.surface1,
    preview.surface2,
    preview.surface3,
    preview.textPrimary,
    preview.textSecondary,
    preview.accent,
    preview.secondary,
    preview.terminalBg,
    preview.terminalText,
  ]

  return required.every(Boolean) ? preview : null
}

function ThemePreviewCanvas({ theme, compact = false }: { theme: ThemePreviewDescriptor; compact?: boolean }) {
  const traffic = compact ? 3 : 4
  const accentSoft = withAlpha(theme.accent, 0.1)
  const accentBorder = withAlpha(theme.accent, 0.24)
  const accentGlow = withAlpha(theme.accent, compact ? 0.16 : 0.22)
  const secondarySoft = withAlpha(theme.secondary, 0.12)
  const secondaryBorder = withAlpha(theme.secondary, 0.22)
  const muted66 = withAlpha(theme.textMuted, 0.66)
  const muted58 = withAlpha(theme.textMuted, 0.58)
  const muted55 = withAlpha(theme.textMuted, 0.55)
  const muted40 = withAlpha(theme.textMuted, 0.4)

  return (
    <div
      className="premium-card-shell premium-surface-grid premium-shine overflow-hidden rounded-[26px] border transition-[box-shadow,border-color] duration-300"
      style={{
        background: `radial-gradient(circle at 14% 0%, ${withAlpha(theme.accent, 0.12)}, transparent 28%), radial-gradient(circle at 86% 12%, ${withAlpha(theme.secondary, 0.1)}, transparent 24%), linear-gradient(180deg, ${theme.surface0}, ${theme.surface1})`,
        borderColor: theme.border,
        boxShadow: compact ? `0 22px 60px ${accentGlow}` : `0 30px 90px ${accentGlow}`,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          background: `linear-gradient(180deg, ${theme.surface2}, ${theme.surface1})`,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          {theme.colors.map((color) => (
            <span key={color} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          ))}
          <div className="ml-2">
            <div className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>{theme.name} Preview</div>
            {!compact && (
              <div className="text-[10px]" style={{ color: theme.textMuted }}>{theme.description}</div>
            )}
          </div>
        </div>
        <span
          className="premium-status-glow rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: accentSoft,
            color: theme.accent,
            border: `1px solid ${accentBorder}`,
          }}
        >
          {theme.mode}
        </span>
      </div>

      <div className={`grid gap-4 p-4 ${compact ? 'lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]' : 'xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]'}`}>
        <div className="space-y-4">
          <div
            className="premium-card-shell rounded-[20px] border p-4"
            style={{
              background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})`,
              borderColor: theme.border,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-[14px]"
                style={{
                  background: accentSoft,
                  border: `1px solid ${accentBorder}`,
                  boxShadow: `0 14px 34px ${withAlpha(theme.accent, 0.14)}`,
                }}
              />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Workspace</div>
                <div className="text-[13px] font-semibold" style={{ color: theme.textPrimary }}>Mission control</div>
              </div>
            </div>
            <div className="mt-4 grid gap-2.5">
              {['Overview', 'Threads', 'Agents', 'Console'].slice(0, traffic).map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-[14px] px-3 py-2.5"
                  style={{
                    background: index === 0 ? accentSoft : theme.surface0,
                    border: `1px solid ${index === 0 ? accentBorder : theme.border}`,
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: index === 0 ? theme.accent : theme.secondary }} />
                  <span className="text-[10px] font-medium" style={{ color: index === 0 ? theme.textPrimary : theme.textSecondary }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`grid gap-3 ${compact ? '' : 'sm:grid-cols-2'}`}>
            <div
              className="premium-card-shell rounded-[20px] border p-4"
              style={{
                background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})`,
                borderColor: theme.border,
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Surface stack</div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[theme.surface0, theme.surface1, theme.surface2, theme.surface3].map((color) => (
                  <div key={color} className="h-10 rounded-[12px] border" style={{ background: color, borderColor: theme.border }} />
                ))}
              </div>
            </div>

            <div
              className="premium-card-shell rounded-[20px] border p-4"
              style={{
                background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})`,
                borderColor: theme.border,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Quality verdict</div>
                  <div className="mt-1 text-[14px] font-semibold" style={{ color: theme.textPrimary }}>Stable layered profile</div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ background: secondarySoft, color: theme.secondary, border: `1px solid ${secondaryBorder}` }}>
                  {compact ? 'Compact' : 'Expanded'}
                </span>
              </div>
              <div className="mt-3 text-[10px] leading-5" style={{ color: theme.textSecondary }}>
                Balanced spacing, calmer surface hierarchy and wider signal cards for clearer readability.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div
            className="premium-card-shell rounded-[20px] border p-4"
            style={{
              background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})`,
              borderColor: theme.border,
            }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Editor</div>
              <span className="rounded-full px-2 py-1 text-[9px] font-medium" style={{ background: secondarySoft, color: theme.secondary, border: `1px solid ${secondaryBorder}` }}>Live tokens</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <div className="h-2 rounded-full" style={{ width: '16%', background: theme.colors[0] }} />
                <div className="h-2 rounded-full" style={{ width: '24%', background: muted66 }} />
                <div className="h-2 rounded-full" style={{ width: '20%', background: theme.colors[2] }} />
              </div>
              <div className="flex gap-2">
                <div className="h-2 rounded-full" style={{ width: '12%', background: muted55 }} />
                <div className="h-2 rounded-full" style={{ width: '30%', background: theme.colors[1] }} />
                <div className="h-2 rounded-full" style={{ width: '12%', background: muted40 }} />
              </div>
              <div className="flex gap-2">
                <div className="h-2 rounded-full" style={{ width: '22%', background: theme.colors[2] }} />
                <div className="h-2 rounded-full" style={{ width: '28%', background: muted58 }} />
              </div>
              <div className="flex gap-2">
                <div className="h-2 rounded-full" style={{ width: '10%', background: muted40 }} />
                <div className="h-2 rounded-full" style={{ width: '34%', background: theme.colors[0] }} />
                <div className="h-2 rounded-full" style={{ width: '14%', background: theme.colors[1] }} />
              </div>
            </div>
          </div>

          <div className={`grid gap-3 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]'}`}>
            <div
              className="premium-card-shell rounded-[20px] border p-4"
              style={{
                background: `linear-gradient(180deg, ${theme.terminalBg}, ${theme.surface0})`,
                borderColor: theme.border,
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Terminal</div>
                <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>PS &gt; ship</span>
              </div>
              <div className="space-y-2 text-[10px] font-mono">
                <div style={{ color: theme.terminalText }}>$ validate theme tokens</div>
                <div style={{ color: theme.secondary }}>✓ contrast baseline passed</div>
                <div style={{ color: theme.accent }}>✓ preview surface rendered</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[16px] px-3 py-3" style={{ background: accentSoft, color: theme.accent, border: `1px solid ${accentBorder}` }}>
                Accent channel armed
              </div>
              <div className="rounded-[16px] px-3 py-3" style={{ background: secondarySoft, color: theme.secondary, border: `1px solid ${secondaryBorder}` }}>
                Secondary lane synced
              </div>
              <div className="rounded-[16px] px-3 py-3 sm:col-span-2" style={{ background: theme.surface1, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                Panel contrast stabilized across wider cards and calmer section spacing.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeCard({
  theme,
  isActive,
  isPreviewed,
  onClick,
  onPreviewStart,
  onPreviewEnd,
}: {
  theme: ThemeDescriptor
  isActive: boolean
  isPreviewed: boolean
  onClick: () => void
  onPreviewStart: () => void
  onPreviewEnd: () => void
}) {
  const accentSoft = withAlpha(theme.accent, 0.1)
  const accentBorder = withAlpha(theme.accent, 0.34)
  const secondarySoft = withAlpha(theme.secondary, 0.12)
  const muted45 = withAlpha(theme.textMuted, 0.45)
  const muted35 = withAlpha(theme.textMuted, 0.35)
  const muted32 = withAlpha(theme.textMuted, 0.32)
  const terminalMuted = withAlpha(theme.terminalText, 0.55)
  const chipTone = theme.mode === 'dark' ? theme.accent : theme.secondary
  const chipBackground = theme.mode === 'dark' ? accentSoft : secondarySoft

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onPreviewStart}
      onMouseLeave={onPreviewEnd}
      onFocus={onPreviewStart}
      onBlur={onPreviewEnd}
      className="premium-card-shell premium-shine premium-interactive premium-focus-ring relative overflow-hidden rounded-[22px] p-3 text-left"
      aria-pressed={isActive}
      style={{
        background: `radial-gradient(circle at 100% 0%, ${withAlpha(theme.accent, isActive ? 0.14 : isPreviewed ? 0.1 : 0.06)}, transparent 34%), linear-gradient(180deg, ${theme.surface1}, ${theme.surface0})`,
        border: `1px solid ${isActive ? theme.accent : isPreviewed ? accentBorder : theme.border}`,
        boxShadow: isActive ? `0 22px 52px ${withAlpha(theme.accent, 0.24)}` : isPreviewed ? `0 16px 42px ${withAlpha(theme.accent, 0.18)}` : '0 12px 28px rgba(0,0,0,0.08)',
        transform: isActive ? 'translateY(-2px)' : isPreviewed ? 'translateY(-3px)' : 'translateY(0)',
      }}
    >
      {isActive && (
        <div className="absolute top-3 right-3 z-10 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: theme.accent, boxShadow: `0 10px 24px ${withAlpha(theme.accent, 0.28)}` }}>
          <Check size={10} className="text-white" />
        </div>
      )}

      <div className="premium-card-shell premium-surface-grid mb-3 overflow-hidden rounded-[16px] border" style={{ background: `linear-gradient(180deg, ${theme.surface0}, ${theme.surface1})`, borderColor: isActive ? accentBorder : theme.border }}>
        <div className="flex items-center justify-between px-3 pt-2.5">
          <div className="flex items-center gap-1">
            {theme.colors.map((color, index) => <div key={`${theme.id}-${index}`} className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: color }} />)}
          </div>
          <div className="h-[4px] w-14 rounded-full" style={{ background: muted32 }} />
        </div>
        <div className="grid grid-cols-[1.05fr_0.95fr] gap-2 px-3 pb-3 pt-2.5">
          <div className="rounded-[12px] p-2 space-y-1.5" style={{ background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})` }}>
            <div className="flex gap-1.5">
              <div className="h-[4px] rounded-full" style={{ width: '18%', background: theme.colors[2] }} />
              <div className="h-[4px] rounded-full" style={{ width: '30%', background: muted45 }} />
            </div>
            <div className="flex gap-1.5">
              <div className="h-[4px] rounded-full" style={{ width: '12%', background: muted35 }} />
              <div className="h-[4px] rounded-full" style={{ width: '26%', background: theme.colors[1] }} />
            </div>
            <div className="flex gap-1.5">
              <div className="h-[4px] rounded-full" style={{ width: '22%', background: theme.colors[0] }} />
              <div className="h-[4px] rounded-full" style={{ width: '20%', background: muted32 }} />
            </div>
          </div>
          <div className="rounded-[12px] border p-2 space-y-1.5" style={{ background: `linear-gradient(180deg, ${theme.terminalBg}, ${theme.surface0})`, borderColor: withAlpha(theme.secondary, 0.14) }}>
            <div className="h-[4px] w-8 rounded-full" style={{ background: theme.secondary }} />
            <div className="h-[4px] w-14 rounded-full" style={{ background: terminalMuted }} />
            <div className="h-[4px] w-10 rounded-full" style={{ background: theme.accent }} />
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 px-0.5">
        <div>
          <div className="text-[11px] font-semibold" style={{ color: theme.textPrimary }}>{theme.name}</div>
          <div className="mt-1 text-[9px] leading-4" style={{ color: theme.textMuted }}>{theme.description}</div>
        </div>
        <span
          className="premium-status-glow shrink-0 rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: chipBackground,
            color: chipTone,
            border: `1px solid ${theme.border}`,
          }}
        >
          {theme.mode}
        </span>
      </div>
    </button>
  )
}

function AIKeyInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (val: string) => void; placeholder: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg text-[12px] bg-transparent outline-none font-mono"
          style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          spellCheck={false}
        />
        <button onClick={() => setVisible(!visible)} className="p-2 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.06)]" style={{ color: 'var(--text-muted)' }}>
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {value && <div className="mt-1 text-[9px]" style={{ color: 'var(--success)' }}>● Key configured</div>}
    </div>
  )
}

export function SettingsPage() {
  const store = useStore()
  const { addToast } = useToast()
  const {
    settingsTab,
    setSettingsTab,
    theme,
    setTheme,
    customTheme,
    applyCustomTheme,
    clearCustomTheme,
    defaultAgent,
    setDefaultAgent,
    userProfile,
    isTrialActive,
    aiSettings,
    setAISettings,
    notificationSettings,
    setNotificationSettings,
  } = store
  const trialActive = isTrialActive()
  const hasPremiumAccess = userProfile.plan === 'pro' || trialActive
  const [exportMsg, setExportMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [themeActionMsg, setThemeActionMsg] = useState('')
  const [hoverThemeId, setHoverThemeId] = useState<ThemeId | null>(null)
  const [importedThemePreview, setImportedThemePreview] = useState<ThemePreviewDescriptor | null>(null)
  const [showThemeJson, setShowThemeJson] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [appVersion, setAppVersion] = useState('0.1.0')
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const themeJsonInputRef = useRef<HTMLInputElement>(null)
  const themeActionTimeoutRef = useRef<number | null>(null)

  const activeThemeDescriptor = useMemo<ThemePreviewDescriptor>(
    () => customTheme ?? THEME_MAP[theme] ?? THEME_LIBRARY[0],
    [customTheme, theme]
  )
  const hoveredThemeDescriptor = useMemo(
    () => (hoverThemeId ? (THEME_MAP[hoverThemeId] ?? null) : null),
    [hoverThemeId]
  )
  const previewTheme = useMemo<ThemePreviewDescriptor>(
    () => hoveredThemeDescriptor ?? importedThemePreview ?? activeThemeDescriptor,
    [hoveredThemeDescriptor, importedThemePreview, activeThemeDescriptor]
  )
  const activeThemeQuality = useMemo(
    () => evaluateThemeQuality(activeThemeDescriptor),
    [activeThemeDescriptor]
  )
  const previewThemeQuality = useMemo(
    () => evaluateThemeQuality(previewTheme),
    [previewTheme]
  )
  const previewSource = hoveredThemeDescriptor
    ? 'Hover preview'
    : importedThemePreview
      ? 'Imported preview'
      : 'Active theme'
  const previewThemeJson = useMemo(
    () => JSON.stringify(serializeTheme(previewTheme), null, 2),
    [previewTheme]
  )
  const matchedPreviewTheme = useMemo(
    () => THEME_LIBRARY.find((item) => item.id === previewTheme.id) ?? null,
    [previewTheme]
  )
  const isPreviewAlreadyApplied = !hoveredThemeDescriptor && !importedThemePreview
  const currentSettingsTab = useMemo(
    () => SETTINGS_TABS.find((tab) => tab.id === settingsTab) ?? SETTINGS_TABS[0],
    [settingsTab]
  )

  useEffect(() => {
    void getAppVersion().then((version) => {
      setAppVersion(version)
    })
  }, [])

  const pushThemeActionMessage = (message: string) => {
    setThemeActionMsg(message)
    if (themeActionTimeoutRef.current) {
      window.clearTimeout(themeActionTimeoutRef.current)
    }
    themeActionTimeoutRef.current = window.setTimeout(() => {
      setThemeActionMsg('')
    }, 3200)
  }

  const handleExport = () => {
    try {
      const data = localStorage.getItem('sloerspace-dev-store')
      if (!data) { setExportMsg('No data to export'); return }
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sloerspace-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('Data exported successfully!')
      setTimeout(() => setExportMsg(''), 3000)
    } catch { setExportMsg('Export failed') }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string
        JSON.parse(raw)
        localStorage.setItem('sloerspace-dev-store', raw)
        setImportMsg('Data imported! Reloading...')
        setTimeout(() => window.location.reload(), 1500)
      } catch { setImportMsg('Invalid backup file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    localStorage.removeItem('sloerspace-dev-store')
    setShowResetConfirm(false)
    window.location.reload()
  }

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true)

    try {
      const info = await checkAppUpdate()
      if (!info) {
        throw new Error('Update checks are only available in the desktop build.')
      }

      setUpdateInfo(info)

      if (!info.hasUpdate) {
        const message = `You already have the latest version (${info.currentVersion}).`
        addToast(message, 'success')
        return
      }

      if (!info.installerAvailable) {
        const message = `Version ${info.latestVersion} is available, but no Windows installer asset was attached to the release.`
        addToast(message, 'warning', 5200)
        return
      }

      const message = `Version ${info.latestVersion} is ready to install.`
      addToast(message, 'info')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update check failed.'
      addToast(message, 'error', 5200)
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  const handleInstallUpdate = async () => {
    setIsInstallingUpdate(true)

    try {
      const installerPath = await installAppUpdate()
      const message = `Installer launched from ${installerPath}. Follow the OS prompts to finish the upgrade.`
      addToast(message, 'success', 6200)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update installation failed.'
      addToast(message, 'error', 5200)
    } finally {
      setIsInstallingUpdate(false)
    }
  }

  const handleThemeExport = () => {
    try {
      const payload = JSON.stringify(serializeTheme(activeThemeDescriptor), null, 2)
      const blob = new Blob([payload], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${activeThemeDescriptor.id}.theme.json`
      link.click()
      URL.revokeObjectURL(url)
      pushThemeActionMessage(`${activeThemeDescriptor.name} exported.`)
    } catch {
      pushThemeActionMessage('Theme export failed.')
    }
  }

  const handleThemeDuplicate = async () => {
    try {
      await navigator.clipboard.writeText(previewThemeJson)
      pushThemeActionMessage('Theme JSON copied to clipboard.')
    } catch {
      pushThemeActionMessage('Clipboard write failed.')
    }
  }

  const handleThemeWizard = () => {
    setShowThemeJson((current) => !current)
    if (!showThemeJson) {
      pushThemeActionMessage('Theme studio opened. Hover cards or import a JSON file.')
    }
  }

  const handleThemeImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(String(event.target?.result ?? ''))
        const normalized = normalizeImportedTheme(raw)

        if (!normalized) {
          pushThemeActionMessage('Theme JSON is missing required tokens.')
          return
        }

        setImportedThemePreview(normalized)
        setShowThemeJson(true)
        pushThemeActionMessage(`${normalized.name} loaded into preview.`)
      } catch {
        pushThemeActionMessage('Invalid theme JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleApplyPreviewTheme = () => {
    if (isPreviewAlreadyApplied) {
      pushThemeActionMessage(`${previewTheme.name} is already active.`)
      return
    }

    if (!matchedPreviewTheme) {
      applyCustomTheme(previewTheme as CustomThemePreset)
      setImportedThemePreview(null)
      setHoverThemeId(null)
      pushThemeActionMessage(`${previewTheme.name} applied as custom runtime theme.`)
      return
    }

    setTheme(matchedPreviewTheme.id)
    setImportedThemePreview(null)
    pushThemeActionMessage(`${matchedPreviewTheme.name} applied.`)
  }

  const handleThemeSelect = (themeId: ThemeId) => {
    setTheme(themeId)
    setHoverThemeId(null)
    setImportedThemePreview(null)
    pushThemeActionMessage(`${THEME_MAP[themeId].name} applied.`)
  }

  return (
    <div
      className="premium-surface-grid h-full overflow-hidden rounded-[32px] px-3 py-4 md:px-4 md:py-5 xl:px-6 xl:py-6"
      style={{
        background: `radial-gradient(circle at 14% 12%, ${withAlpha(activeThemeDescriptor.accent, 0.08)}, transparent 24%), radial-gradient(circle at 84% 10%, ${withAlpha(activeThemeDescriptor.secondary, 0.08)}, transparent 20%), radial-gradient(circle at 82% 84%, ${withAlpha(activeThemeDescriptor.accent, 0.06)}, transparent 18%), linear-gradient(180deg, ${activeThemeDescriptor.surface0}, ${activeThemeDescriptor.surface1})`,
      }}
    >
      <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="flex h-full min-h-0 flex-col rounded-[30px] p-5 md:p-6 liquid-glass-heavy"
          style={{
            borderColor: 'var(--border)',
          }}
        >
          <div className="mb-4 flex items-center gap-3 px-1">
            <div className="h-10 w-10 overflow-hidden rounded-[15px] shrink-0"
              style={{ background: '#030812', boxShadow: '0 0 0 1.5px rgba(79,140,255,0.45), 0 4px 16px rgba(79,140,255,0.28)' }}>
              <Image src="/LOGO.png" alt="SloerSpace" width={40} height={40} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Settings</div>
              <div className="mt-0.5 text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{userProfile.username}</div>
            </div>
            <div className="ml-auto shrink-0 premium-chip text-[9px]" style={{ color: hasPremiumAccess ? 'var(--success)' : 'var(--warning)' }}>
              <ShieldCheck size={10} />
              {hasPremiumAccess ? 'PREMIUM' : userProfile.plan.toUpperCase()}
            </div>
          </div>

          <div className="mb-4 rounded-[20px] border px-4 py-3" style={{ background: 'linear-gradient(180deg, rgba(9,15,24,0.72), rgba(6,10,18,0.9))', borderColor: 'var(--border)' }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Active section</div>
            <div className="mt-2 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{currentSettingsTab.label}</div>
            <div className="mt-1 text-[10px] leading-5" style={{ color: 'var(--text-secondary)' }}>{currentSettingsTab.desc}</div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'none' }}>
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon
              const active = settingsTab === tab.id
              return (
                <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                  className="relative flex w-full items-start gap-3 rounded-[16px] px-3.5 py-3 text-left transition-all duration-150"
                  style={{
                    background: active ? 'linear-gradient(135deg, rgba(79,140,255,0.15), rgba(40,231,197,0.06))' : 'transparent',
                    border: `1px solid ${active ? 'rgba(163,209,255,0.2)' : 'transparent'}`,
                  }}
                >
                  {active && <div className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--accent), var(--secondary))' }} />}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px]"
                    style={{ background: active ? 'rgba(79,140,255,0.18)' : 'rgba(9,15,24,0.5)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-semibold" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{tab.label}</div>
                    <div className="mt-0.5 truncate text-[9px]" style={{ color: 'var(--text-muted)' }}>{tab.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[9px] uppercase tracking-[0.14em] font-bold" style={{ color: 'var(--text-muted)' }}>Quick open</span>
            <div className="premium-kbd text-[9px]">Ctrl + ,</div>
          </div>
        </aside>

        <div
          className="premium-panel-elevated flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[30px]"
          style={{
            background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))',
            borderColor: 'var(--border)',
            boxShadow: '0 28px 90px rgba(0,0,0,0.2)',
          }}
        >
          <div className="border-b border-[var(--border)] px-5 py-5 md:px-7 md:py-6">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="premium-chip" style={{ color: 'var(--warning)' }}>
                <Sparkles size={12} />
                Premium Console
              </div>
              <div className="premium-chip">
                <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                Live preferences
              </div>
              <div className="premium-chip" style={{ color: 'var(--accent)' }}>
                <Command size={12} />
                {currentSettingsTab.label}
              </div>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Settings & personalization
                </div>
                <div className="mt-2 max-w-3xl text-[13px] leading-6" style={{ color: 'var(--text-secondary)' }}>
                  Tune the shell, agents, account settings and shortcuts from a cleaner control surface with clearer grouping, calmer spacing and less visual compression.
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                <div className="rounded-[18px] border px-4 py-3" style={{ background: 'rgba(9,15,24,0.52)', borderColor: 'var(--border)' }}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Workspace profile</div>
                  <div className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{hasPremiumAccess ? 'Premium operator surface' : 'Core operator surface'}</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{userProfile.plan.toUpperCase()} · {userProfile.email}</div>
                </div>
                <div className="rounded-[18px] border px-4 py-3" style={{ background: 'rgba(9,15,24,0.52)', borderColor: 'var(--border)' }}>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Desktop runtime</div>
                  <div className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>v{appVersion}</div>
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{currentSettingsTab.label} · {currentSettingsTab.desc}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5 xl:px-7">
        {settingsTab === 'appearance' && (
          <div className="max-w-[1500px] space-y-6">
            <input ref={themeJsonInputRef} type="file" accept=".json" className="hidden" onChange={handleThemeImport} />
            <SectionHeader icon={Palette} title="Appearance" desc="Theme studio, live previews, and surface-quality control." />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px] 2xl:grid-cols-[minmax(0,1.14fr)_400px]">
              <SettingsCard className="premium-surface-grid space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Live theme preview</div>
                    <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {previewTheme.name}
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {previewSource} · {getQualityLabel(previewThemeQuality.total)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="premium-chip" style={{ color: previewTheme.accent }}>
                      <Sparkles size={12} />
                      {previewTheme.mode} profile
                    </span>
                    <span className="premium-chip" style={{ color: 'var(--success)' }}>
                      <ShieldCheck size={12} />
                      {previewThemeQuality.total}/100
                    </span>
                  </div>
                </div>

                <ThemePreviewCanvas theme={previewTheme} />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Readability', value: previewThemeQuality.readability, tone: previewTheme.accent },
                    { label: 'Layering', value: previewThemeQuality.layering, tone: previewTheme.secondary },
                    { label: 'Terminal', value: previewThemeQuality.terminal, tone: 'var(--success)' },
                    { label: 'Accent', value: previewThemeQuality.accent, tone: 'var(--warning)' },
                  ].map((metric) => (
                    <div key={metric.label} className="premium-stat premium-status-glow px-4 py-3">
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{metric.label}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{metric.value}</span>
                        <span className="text-[9px] font-mono" style={{ color: metric.tone }}>{metric.value >= 90 ? 'elite' : metric.value >= 75 ? 'good' : 'check'}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }}>
                        <div className="premium-meter-fill h-full rounded-full" style={{ width: `${metric.value}%`, background: metric.tone }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={handleApplyPreviewTheme} className="btn-primary text-[10px] px-4 py-2">
                    {isPreviewAlreadyApplied ? 'Applied' : 'Apply Preview'}
                  </button>
                  <button onClick={() => themeJsonInputRef.current?.click()} className="btn-secondary text-[10px] px-4 py-2">Import Theme JSON</button>
                  <button onClick={handleThemeExport} className="btn-secondary text-[10px] px-4 py-2">Export Active</button>
                  <button onClick={handleThemeDuplicate} className="btn-ghost text-[10px] px-4 py-2" style={{ color: 'var(--accent)' }}>Copy JSON</button>
                  {customTheme && (
                    <button onClick={clearCustomTheme} className="btn-ghost text-[10px] px-4 py-2" style={{ color: 'var(--warning)' }}>
                      Exit Custom Runtime
                    </button>
                  )}
                  {importedThemePreview && (
                    <button onClick={() => setImportedThemePreview(null)} className="btn-ghost text-[10px] px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                      Clear Imported
                    </button>
                  )}
                </div>

                {themeActionMsg && (
                  <div className="premium-status-glow rounded-[18px] border px-4 py-3 text-[11px]" style={{ background: withAlpha(previewTheme.accent, 0.08), borderColor: withAlpha(previewTheme.accent, 0.22), color: 'var(--text-primary)' }}>
                    {themeActionMsg}
                  </div>
                )}
              </SettingsCard>

              <SettingsCard className="premium-surface-grid space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Theme studio</div>
                    <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Zero-transparency audit</div>
                  </div>
                  <button onClick={handleThemeWizard} className="btn-secondary text-[9px] px-3 py-1.5">
                    {showThemeJson ? 'Hide JSON' : 'Open Studio'}
                  </button>
                </div>

                <div className="premium-card-shell rounded-[22px] border p-4" style={{ background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))', borderColor: 'var(--border)' }}>
                  <div className="grid gap-3">
                    <div className="premium-card-shell rounded-[16px] border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                      <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Surface stack</div>
                      <div className="mt-2 flex items-center gap-2">
                        {[previewTheme.surface0, previewTheme.surface1, previewTheme.surface2, previewTheme.surface3].map((color) => (
                          <div key={color} className="h-8 flex-1 rounded-[12px] border" style={{ background: color, borderColor: previewTheme.border }} />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="premium-card-shell rounded-[16px] border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Current runtime</div>
                        <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{activeThemeDescriptor.name}</div>
                        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                          {customTheme ? 'Applied as imported custom runtime theme.' : 'Applied across the workspace right now.'}
                        </div>
                      </div>
                      <div className="premium-card-shell rounded-[16px] border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Preview source</div>
                        <div className="mt-2 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{previewSource}</div>
                        <div className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>{hoveredThemeDescriptor ? 'Hovering a library theme card.' : importedThemePreview ? 'Loaded from an external JSON file.' : 'Mirrors the active runtime theme.'}</div>
                      </div>
                    </div>

                    <div className="premium-card-shell rounded-[16px] border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Quality verdict</div>
                          <div className="mt-1 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{previewThemeQuality.total}/100 · {getQualityLabel(previewThemeQuality.total)}</div>
                        </div>
                        <div className="premium-chip" style={{ color: previewTheme.secondary }}>
                          <Palette size={12} />
                          {THEME_LIBRARY.length} themes
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                        This studio now favors solid layered surfaces over unstable transparent stacking, especially for light themes and high-contrast dark palettes.
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </div>

            <SettingsCard className="premium-surface-grid">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Dark themes</div>
                  <div className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{DARK_THEMES.length} premium dark palettes</div>
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Hover to preview without applying</div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {DARK_THEMES.map((themeOption) => (
                  <ThemeCard
                    key={themeOption.id}
                    theme={themeOption}
                    isActive={theme === themeOption.id}
                    isPreviewed={hoverThemeId === themeOption.id}
                    onClick={() => handleThemeSelect(themeOption.id)}
                    onPreviewStart={() => setHoverThemeId(themeOption.id)}
                    onPreviewEnd={() => setHoverThemeId((current) => current === themeOption.id ? null : current)}
                  />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard className="premium-surface-grid">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Light themes</div>
                  <div className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{LIGHT_THEMES.length} daylight-ready palettes</div>
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Built to avoid muddy overlays and washed-out surfaces</div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {LIGHT_THEMES.map((themeOption) => (
                  <ThemeCard
                    key={themeOption.id}
                    theme={themeOption}
                    isActive={theme === themeOption.id}
                    isPreviewed={hoverThemeId === themeOption.id}
                    onClick={() => handleThemeSelect(themeOption.id)}
                    onPreviewStart={() => setHoverThemeId(themeOption.id)}
                    onPreviewEnd={() => setHoverThemeId((current) => current === themeOption.id ? null : current)}
                  />
                ))}
              </div>
            </SettingsCard>

            <SettingsCard className="premium-surface-grid">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Theme JSON</span>
                  <div className="mt-1 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    Uses schema version 1 (`sloerspace.theme`). Import validates preview tokens before rendering.
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={handleThemeWizard} className="btn-primary text-[9px] py-1.5 px-3">Open Wizard</button>
                  <button onClick={() => themeJsonInputRef.current?.click()} className="btn-secondary text-[9px] py-1.5 px-3">Import JSON</button>
                  <button onClick={handleThemeExport} className="btn-secondary text-[9px] py-1.5 px-3">Export Current</button>
                  <button onClick={handleThemeDuplicate} className="btn-ghost text-[9px] py-1.5 px-3" style={{ color: 'var(--accent)' }}>Duplicate Current</button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  <div className="premium-card-shell rounded-[20px] p-4" style={{ background: 'linear-gradient(180deg, var(--surface-1), var(--surface-2))', border: '1px solid var(--border)' }}>
                    <div className="text-[11px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                      Active Theme Quality: {activeThemeQuality.total}/100
                    </div>
                    <div className="text-[10px]" style={{ color: activeThemeQuality.total >= 90 ? 'var(--success)' : 'var(--warning)' }}>
                      {activeThemeQuality.total >= 90 ? 'Meets enterprise readability and layer-separation baselines.' : 'Review contrast or layering for a stronger production profile.'}
                    </div>
                  </div>

                  <div className="premium-card-shell rounded-[18px] border px-4 py-3 text-[10px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    Theme changes apply instantly, hover previews are non-destructive, and imported JSON can now be promoted into a persistent custom runtime theme.
                  </div>
                </div>

                <div className="premium-card-shell rounded-[20px] border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Preview JSON</div>
                      <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{previewTheme.name} · {previewSource}</div>
                    </div>
                    {showThemeJson && (
                      <button onClick={handleApplyPreviewTheme} className="btn-secondary text-[9px] px-3 py-1.5">
                        Apply preview
                      </button>
                    )}
                  </div>
                  {showThemeJson ? (
                    <pre className="max-h-[360px] overflow-auto p-4 text-[10px] leading-5 font-mono" style={{ color: 'var(--text-secondary)', background: 'var(--surface-0)' }}>
{previewThemeJson}
                    </pre>
                  ) : (
                    <div className="p-4">
                      <ThemePreviewCanvas theme={previewTheme} compact />
                    </div>
                  )}
                </div>
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'shortcuts' && (
          <div className="max-w-3xl">
            <SectionHeader icon={Keyboard} title="Shortcuts" desc="Keyboard bindings reference" />
            {SHORTCUTS.map((section) => (
              <SettingsCard key={section.category} className="mb-3">
                <div className="px-3 py-2 rounded-[18px] mb-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{section.category}</span>
                </div>
                {section.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-3 py-2.5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                    <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={i} className="premium-kbd">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </SettingsCard>
            ))}
          </div>
        )}

        {settingsTab === 'ai-agents' && (
          <div className="max-w-3xl">
            <SectionHeader icon={Bot} title="AI Agents" desc="Default coding agent for tasks" />
            <SettingsCard>
              <div className="space-y-1.5">
                {AGENTS_LIST.map((agent) => {
                  const active = defaultAgent === agent.id
                  return (
                    <button key={agent.id} onClick={() => setDefaultAgent(agent.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: active ? 'var(--accent-subtle)' : 'transparent',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${active ? 'var(--accent)' : 'var(--text-muted)'}` }}>
                        {active && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{agent.desc}</div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{agent.cmd}</span>
                    </button>
                  )
                })}
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'ai-settings' && (
          <div className="max-w-3xl space-y-5">
            <SectionHeader icon={Braces} title="AI Provider" desc="Configure your AI provider, API keys, and models for command suggestions and chat." />

            {/* Provider selector */}
            <SettingsCard>
              <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Provider</div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'anthropic' as AIProvider, name: 'Anthropic', desc: 'Claude models', color: '#e8956a' },
                  { id: 'openai' as AIProvider, name: 'OpenAI', desc: 'GPT-4o, o1', color: '#10a37f' },
                  { id: 'google' as AIProvider, name: 'Google', desc: 'Gemini models', color: '#4285f4' },
                  { id: 'ollama' as AIProvider, name: 'Ollama', desc: 'Local models (free)', color: '#f5f5f5' },
                ]).map((p) => {
                  const active = aiSettings.provider === p.id
                  return (
                    <button key={p.id} onClick={() => setAISettings({ provider: p.id })}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                      style={{
                        background: active ? 'var(--accent-subtle)' : 'transparent',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: p.color, boxShadow: active ? `0 0 8px ${p.color}40` : 'none' }} />
                      <div className="flex-1">
                        <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.desc}</div>
                      </div>
                      {active && <Check size={14} style={{ color: 'var(--accent)' }} />}
                    </button>
                  )
                })}
              </div>
            </SettingsCard>

            {/* API Keys */}
            {aiSettings.provider !== 'ollama' && (
              <SettingsCard>
                <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>API Key</div>
                <AIKeyInput
                  label={aiSettings.provider === 'anthropic' ? 'Anthropic API Key' : aiSettings.provider === 'openai' ? 'OpenAI API Key' : 'Google AI API Key'}
                  value={aiSettings.provider === 'anthropic' ? aiSettings.anthropicApiKey : aiSettings.provider === 'openai' ? aiSettings.openaiApiKey : aiSettings.googleApiKey}
                  onChange={(val) => {
                    if (aiSettings.provider === 'anthropic') setAISettings({ anthropicApiKey: val })
                    else if (aiSettings.provider === 'openai') setAISettings({ openaiApiKey: val })
                    else setAISettings({ googleApiKey: val })
                  }}
                  placeholder={aiSettings.provider === 'anthropic' ? 'sk-ant-...' : aiSettings.provider === 'openai' ? 'sk-...' : 'AIza...'}
                />
              </SettingsCard>
            )}

            {/* Ollama config */}
            {aiSettings.provider === 'ollama' && (
              <SettingsCard>
                <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Ollama Configuration</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Endpoint</label>
                    <input type="text" value={aiSettings.ollamaEndpoint} onChange={(e) => setAISettings({ ollamaEndpoint: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-[12px] bg-transparent outline-none"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>Model</label>
                    <input type="text" value={aiSettings.ollamaModel} onChange={(e) => setAISettings({ ollamaModel: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg text-[12px] bg-transparent outline-none"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      placeholder="llama3.2, codellama, mistral..." />
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Ollama runs locally on your machine. Install from <span style={{ color: 'var(--accent)' }}>ollama.com</span> and run <code className="px-1 py-0.5 rounded text-[9px]" style={{ background: 'var(--surface-3)' }}>ollama serve</code> to start.
                  </p>
                </div>
              </SettingsCard>
            )}

            {/* Model selection for cloud providers */}
            {aiSettings.provider !== 'ollama' && (
              <SettingsCard>
                <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Model</div>
                <input type="text"
                  value={aiSettings.provider === 'anthropic' ? aiSettings.anthropicModel : aiSettings.provider === 'openai' ? aiSettings.openaiModel : aiSettings.googleModel}
                  onChange={(e) => {
                    if (aiSettings.provider === 'anthropic') setAISettings({ anthropicModel: e.target.value })
                    else if (aiSettings.provider === 'openai') setAISettings({ openaiModel: e.target.value })
                    else setAISettings({ googleModel: e.target.value })
                  }}
                  className="w-full px-3 py-2 rounded-lg text-[12px] bg-transparent outline-none"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </SettingsCard>
            )}

            {/* Toggles */}
            <SettingsCard>
              <div className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Features</div>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Command Suggestions</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>AI suggests next commands in terminal</div>
                    </div>
                  </div>
                  <button onClick={() => setAISettings({ commandSuggestionsEnabled: !aiSettings.commandSuggestionsEnabled })}
                    className="w-10 h-5 rounded-full transition-all relative" style={{ background: aiSettings.commandSuggestionsEnabled ? 'var(--accent)' : 'var(--surface-3)' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: aiSettings.commandSuggestionsEnabled ? 22 : 2 }} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bell size={14} style={{ color: 'var(--accent)' }} />
                    <div>
                      <div className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>Agent Notifications</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Desktop alerts when swarm agents finish</div>
                    </div>
                  </div>
                  <button onClick={() => setAISettings({ notificationsEnabled: !aiSettings.notificationsEnabled })}
                    className="w-10 h-5 rounded-full transition-all relative" style={{ background: aiSettings.notificationsEnabled ? 'var(--accent)' : 'var(--surface-3)' }}>
                    <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: aiSettings.notificationsEnabled ? 22 : 2 }} />
                  </button>
                </label>
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'help' && (
          <div className="max-w-3xl space-y-5">
            <SectionHeader icon={HelpCircle} title="Help & Reference" desc="Complete guide to SloerSpace features, keyboard shortcuts, and workflows." />

            {/* Features Overview */}
            <SettingsCard>
              <div className="mb-4 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Features</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { icon: Terminal, name: 'Terminal Grid', desc: 'Multi-pane terminal with PTY streaming, command blocks, session timeline, and workspace tabs.' },
                  { icon: Zap, name: 'SloerSwarm', desc: 'Multi-agent AI orchestration. Launch parallel agents with live telemetry and operator control.' },
                  { icon: Globe, name: 'SloerBrowser', desc: 'Native WebView2 browser with tabs, bookmarks, split terminal, pin/restore, DevTools.' },
                  { icon: Layers, name: 'SloerCanvas', desc: 'Free-form canvas with draggable terminal panes. Position and resize sessions freely.' },
                  { icon: MessageSquare, name: 'AI Chat', desc: 'Contextual AI assistant (Ctrl+J). Supports Anthropic, OpenAI, Google, and local Ollama.' },
                  { icon: Sparkles, name: 'AI Provider', desc: 'Configure API keys, models, and toggle AI features in Settings > AI Provider.' },
                  { icon: Bot, name: 'Agent Library', desc: 'Manage custom AI agents and default CLI agent for terminal and swarm tasks.' },
                  { icon: FileText, name: 'Prompt Library', desc: 'Save, organize, and reuse prompt templates across workspaces.' },
                  { icon: Database, name: 'Kanban Board', desc: 'Drag-and-drop task board with priority levels and agent assignment.' },
                  { icon: Palette, name: '15+ Themes', desc: 'Dark and light themes with live preview. Import/export custom themes as JSON.' },
                  { icon: Mic, name: 'SiulkVoice', desc: 'Voice-to-text dictation with Push-to-Talk and Toggle modes.' },
                  { icon: Bell, name: 'Notifications', desc: 'Desktop alerts when swarm agents complete tasks. Toggle in AI Provider settings.' },
                ].map((f) => (
                  <div key={f.name} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <f.icon size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{f.name}</div>
                      <div className="text-[10px] leading-relaxed mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>

            {/* Keyboard Shortcuts */}
            <SettingsCard>
              <div className="mb-4 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Keyboard Shortcuts</div>
              <div className="space-y-1">
                {[
                  { section: 'Global' },
                  { key: 'Ctrl+K', action: 'Open Command Palette' },
                  { key: 'Ctrl+J', action: 'Toggle AI Chat Panel' },
                  { key: 'Ctrl+B', action: 'Open Browser' },
                  { key: 'Ctrl+,', action: 'Open Settings' },
                  { section: 'Workspaces' },
                  { key: 'Ctrl+T', action: 'New Terminal Workspace' },
                  { key: 'Ctrl+S', action: 'Launch SloerSwarm' },
                  { key: 'Ctrl+Shift+W', action: 'Close Active Workspace' },
                  { key: 'Ctrl+Shift+]', action: 'Next Workspace Tab' },
                  { key: 'Ctrl+Shift+[', action: 'Previous Workspace Tab' },
                  { section: 'Terminal' },
                  { key: 'Ctrl+N', action: 'New Terminal Pane' },
                  { key: 'Ctrl+D', action: 'Split Right' },
                  { key: 'Ctrl+Shift+D', action: 'Split Down' },
                  { key: 'Ctrl+]', action: 'Next Pane' },
                  { key: 'Ctrl+[', action: 'Previous Pane' },
                  { key: 'Ctrl+Shift+C', action: 'Copy Selection (in PTY)' },
                  { key: 'Ctrl+Shift+V', action: 'Paste (in PTY)' },
                  { section: 'Browser' },
                  { key: 'Ctrl+L', action: 'Focus URL Bar' },
                  { key: 'Ctrl+R', action: 'Refresh Page' },
                  { key: 'Ctrl+Shift+I', action: 'Toggle DevTools' },
                  { key: 'Ctrl+Shift+T', action: 'Restore Closed Tab' },
                ].map((item, i) => (
                  'section' in item ? (
                    <div key={i} className="pt-3 pb-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent)' }}>{item.section}</div>
                  ) : (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)]">
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.action}</span>
                      <kbd className="px-2 py-0.5 text-[9px] font-mono rounded-md" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{item.key}</kbd>
                    </div>
                  )
                ))}
              </div>
            </SettingsCard>

            {/* Getting Started */}
            <SettingsCard>
              <div className="mb-4 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Getting Started</div>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Set up AI Provider', desc: 'Go to Settings → AI Provider. Choose Anthropic/OpenAI/Google or local Ollama. Enter your API key.' },
                  { step: '2', title: 'Create a workspace', desc: 'Click SloerSpace on Home or press Ctrl+T. Choose your terminal layout (1-16 panes) and working directory.' },
                  { step: '3', title: 'Use AI Chat', desc: 'Press Ctrl+J or click the AI button in the title bar. Ask questions about commands, code, or debugging.' },
                  { step: '4', title: 'Launch a Swarm', desc: 'Click SloerSwarm on Home or press Ctrl+S. Configure your agent fleet, objective, and working directory.' },
                  { step: '5', title: 'Browse the web', desc: 'Click SloerBrowser on Home or press Ctrl+B. Native WebView2 engine — no restrictions.' },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>{s.step}</div>
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SettingsCard>

            {/* Version */}
            <div className="text-center py-4">
              <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>SloerSpace Dev v1.0.0</div>
              <div className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>Built with Tauri 2 + Next.js 14 + Rust</div>
            </div>
          </div>
        )}

        {settingsTab === 'account' && (
          <div className="max-w-[760px] space-y-5">
            <SectionHeader icon={User} title="Account" desc="Manage your profile, billing, and current session." />

            <div className="space-y-5">
              <div>
                <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Profile</div>
                <SettingsCard className="premium-surface-grid">
                  <div className="rounded-[22px] border p-4" style={{ background: 'linear-gradient(180deg, rgba(9,15,24,0.84), rgba(6,10,18,0.92))', borderColor: 'var(--border)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full text-[18px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '2px solid var(--accent)' }}>
                          {userProfile.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.username}</span>
                            <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: 'rgba(46,213,115,0.15)', color: 'var(--success)' }}>● Active</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            <Mail size={10} /> {userProfile.email}
                          </div>
                        </div>
                      </div>

                      <button className="btn-secondary text-[10px] flex items-center gap-1.5">
                        <ExternalLink size={10} /> Edit Profile
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[16px] border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</div>
                        <div className="text-[11px] font-mono break-all" style={{ color: 'var(--text-primary)' }}>{userProfile.email}</div>
                      </div>
                      <div className="rounded-[16px] border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Account ID</div>
                        <div className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{userProfile.accountId.slice(0, 8)}...{userProfile.accountId.slice(-4)}</div>
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              </div>

              <div>
                <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Billing</div>
                <SettingsCard className="premium-surface-grid">
                  <div className="rounded-[22px] border p-4" style={{ background: 'linear-gradient(180deg, rgba(9,15,24,0.84), rgba(6,10,18,0.92))', borderColor: 'var(--border)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: trialActive ? 'rgba(255,191,98,0.12)' : hasPremiumAccess ? 'var(--accent-subtle)' : 'var(--surface-3)', border: `1px solid ${trialActive ? 'rgba(255,191,98,0.2)' : hasPremiumAccess ? 'rgba(79,140,255,0.2)' : 'var(--border)'}` }}>
                          <Bot size={15} style={{ color: trialActive ? 'var(--warning)' : hasPremiumAccess ? 'var(--accent)' : 'var(--text-muted)' }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.plan === 'pro' ? 'Pro Plan' : trialActive ? 'Pro Trial' : 'Community Plan'}</span>
                            <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: trialActive ? 'rgba(255,191,98,0.15)' : hasPremiumAccess ? 'rgba(46,213,115,0.15)' : 'var(--surface-3)', color: trialActive ? 'var(--warning)' : hasPremiumAccess ? 'var(--success)' : 'var(--text-muted)' }}>
                              {userProfile.plan === 'pro' ? 'Active' : trialActive ? 'Trial' : 'Current'}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {userProfile.plan === 'pro'
                              ? 'Full access to all SloerSpace features'
                              : trialActive
                                ? 'Trial access is active across premium operator surfaces'
                                : 'Limited access — upgrade for full features'}
                          </div>
                        </div>
                      </div>

                      <button className="btn-primary text-[10px] flex items-center gap-1.5">
                        <ExternalLink size={10} /> {userProfile.plan === 'pro' ? 'Manage Plan' : trialActive ? 'Review Trial' : 'Upgrade'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <button className="w-full flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-all hover:bg-[var(--surface-2)]" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2.5">
                        <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                        <div>
                          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>View Plans</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Compare plans and pricing</div>
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button className="w-full flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-all hover:bg-[var(--surface-2)]" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2.5">
                        <Key size={14} style={{ color: 'var(--text-muted)' }} />
                        <div>
                          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Payment Methods</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Update cards and billing details</div>
                        </div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                </SettingsCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Session</div>
                  <SettingsCard>
                    <div className="rounded-[18px] border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'var(--accent-subtle)' }}>
                          <Command size={14} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Current Device</span>
                            <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>This Session</span>
                          </div>
                          <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>SloerSpace Desktop · {store.sessionDevice || 'Windows'}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-[16px] border px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                        <div>
                          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign Out</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>End your session on this device</div>
                        </div>
                        <button onClick={() => { store.logout(); store.setView('login') }} className="btn-ghost text-[10px] flex items-center gap-1">
                          <LogOut size={10} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </SettingsCard>
                </div>

                <div>
                  <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Debug</div>
                  <SettingsCard>
                    <div className="space-y-3">
                      <div className="rounded-[18px] border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <Download size={14} style={{ color: 'var(--text-muted)' }} />
                            <div>
                              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Updates</div>
                              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Current version: {appVersion}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (updateInfo?.hasUpdate && updateInfo.installerAvailable) {
                                void handleInstallUpdate()
                                return
                              }
                              void handleCheckForUpdates()
                            }}
                            disabled={isCheckingUpdates || isInstallingUpdate}
                            className="btn-secondary text-[10px] flex items-center gap-1 disabled:opacity-60"
                          >
                            <Download size={10} />
                            {isInstallingUpdate
                              ? 'Installing…'
                              : isCheckingUpdates
                                ? 'Checking…'
                                : updateInfo?.hasUpdate && updateInfo.installerAvailable
                                  ? `Install ${updateInfo.latestVersion}`
                                  : 'Check'}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-[18px] border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2.5">
                          <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                          <div>
                            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Log file</div>
                            <div className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>For debugging auth and API issues.</div>
                          </div>
                        </div>
                        <div className="mt-3 rounded-[14px] border px-3 py-2.5 font-mono text-[9px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                          C:\Users\...\AppData\Local\sloerspace\logs\sloerspace-tauri.log
                        </div>
                      </div>
                    </div>
                  </SettingsCard>
                </div>
              </div>
            </div>
          </div>
        )}

        {settingsTab === 'api-keys' && (
          <div className="max-w-2xl">
            <SectionHeader icon={Key} title="API Keys" desc="Create and manage API keys for MCP and programmatic SloerSpace access." />
            {!hasPremiumAccess ? (
              <SettingsCard className="flex flex-col items-center p-10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(79,140,255,0.15)' }}>
                  <Key size={24} style={{ color: 'var(--accent)' }} />
                </div>
                <h2 className="text-[15px] font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Pro Plan Required</h2>
                <p className="text-[11px] text-center max-w-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                  API keys are available on the Pro plan. Upgrade to create keys for MCP and programmatic SloerSpace access.
                </p>
                <button className="btn-primary flex items-center gap-2 text-[11px]">
                  <Sparkles size={12} /> Upgrade to Pro
                </button>
              </SettingsCard>
            ) : (
              <div className="space-y-4">
                <SettingsCard>
                  <div className="flex items-center justify-between mb-4">
                    <div className="label">Your API Keys</div>
                    <button className="btn-primary flex items-center gap-2 text-[10px]"><Key size={11} /> Generate New Key</button>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <Key size={18} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-2" />
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No API keys created yet. Generate one to get started.</div>
                  </div>
                </SettingsCard>
                <SettingsCard>
                  <div className="label">Usage</div>
                  <div className="text-[10px] leading-6" style={{ color: 'var(--text-muted)' }}>
                    API keys provide programmatic access to SloerSpace MCP endpoints. Keep your keys secure and never share them publicly.
                  </div>
                </SettingsCard>
              </div>
            )}
          </div>
        )}

        {settingsTab === 'siulk-voice' && (
          <div className="max-w-3xl space-y-5">
            <SectionHeader icon={Mic} title="SiulkVoice" desc="Native voice-to-text dictation powered by on-device Whisper — fully offline and private." />

            <SettingsCard className="premium-surface-grid">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Enable SiulkVoice</div>
                  <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>Show the voice dictation widget in the header bar.</div>
                </div>
                <button
                  onClick={() => store.setSiulkVoiceEnabled(!store.siulkVoice.enabled)}
                  className="relative h-7 w-12 rounded-full transition-all duration-300"
                  style={{
                    background: store.siulkVoice.enabled
                      ? 'linear-gradient(135deg, var(--accent), var(--secondary))'
                      : 'var(--surface-3)',
                    boxShadow: store.siulkVoice.enabled ? '0 4px 18px var(--accent-glow)' : 'none',
                  }}
                >
                  <div
                    className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300"
                    style={{ left: store.siulkVoice.enabled ? 'calc(100% - 24px)' : '4px' }}
                  />
                </button>
              </div>
            </SettingsCard>

            <SettingsCard className="premium-surface-grid space-y-5">
              <div className="rounded-[22px] border p-5" style={{ background: 'linear-gradient(180deg, rgba(9,15,24,0.84), rgba(6,10,18,0.92))', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(79,140,255,0.15)' }}>
                      <Mic size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Push-to-Talk</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Hold key to record, release to stop and transcribe.</div>
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: store.siulkVoice.pushToTalkKey ? 'rgba(46,213,115,0.12)' : 'var(--surface-3)', color: store.siulkVoice.pushToTalkKey ? 'var(--success)' : 'var(--text-muted)' }}>
                    {store.siulkVoice.pushToTalkKey ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-[14px] border px-4 py-2.5 font-mono text-[11px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: store.siulkVoice.pushToTalkKey ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {store.siulkVoice.pushToTalkKey || 'Not set'}
                  </div>
                  <button
                    onClick={() => {
                      const handler = (e: KeyboardEvent) => {
                        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
                        e.preventDefault()
                        const parts: string[] = []
                        if (e.ctrlKey) parts.push('Ctrl')
                        if (e.altKey) parts.push('Alt')
                        if (e.shiftKey) parts.push('Shift')
                        if (e.metaKey) parts.push('Meta')
                        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
                        store.setSiulkVoicePushToTalkKey(parts.join('+'))
                        window.removeEventListener('keydown', handler)
                      }
                      window.addEventListener('keydown', handler)
                      addToast('Press a key combination for Push-to-Talk...', 'info', 3000)
                    }}
                    className="btn-secondary text-[10px] px-4 py-2"
                  >
                    Set Key
                  </button>
                </div>
              </div>

              <div className="rounded-[22px] border p-5" style={{ background: 'linear-gradient(180deg, rgba(9,15,24,0.84), rgba(6,10,18,0.92))', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(79,140,255,0.15)' }}>
                      <Radio size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>Toggle Recording</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Press once to start recording, press again to stop.</div>
                    </div>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: store.siulkVoice.toggleRecordingKey ? 'rgba(46,213,115,0.12)' : 'var(--surface-3)', color: store.siulkVoice.toggleRecordingKey ? 'var(--success)' : 'var(--text-muted)' }}>
                    {store.siulkVoice.toggleRecordingKey ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 rounded-[14px] border px-4 py-2.5 font-mono text-[11px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: store.siulkVoice.toggleRecordingKey ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {store.siulkVoice.toggleRecordingKey || 'Not set'}
                  </div>
                  <button
                    onClick={() => {
                      const handler = (e: KeyboardEvent) => {
                        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
                        e.preventDefault()
                        const parts: string[] = []
                        if (e.ctrlKey) parts.push('Ctrl')
                        if (e.altKey) parts.push('Alt')
                        if (e.shiftKey) parts.push('Shift')
                        if (e.metaKey) parts.push('Meta')
                        parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
                        store.setSiulkVoiceToggleRecordingKey(parts.join('+'))
                        window.removeEventListener('keydown', handler)
                      }
                      window.addEventListener('keydown', handler)
                      addToast('Press a key combination for Toggle Recording...', 'info', 3000)
                    }}
                    className="btn-secondary text-[10px] px-4 py-2"
                  >
                    Set Key
                  </button>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard className="premium-surface-grid space-y-5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>AI Model</div>
                <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>Choose the local Whisper tier that balances speed, quality and executive-grade throughput.</div>
              </div>

              {(() => {
                const WHISPER_TIERS: { id: WhisperModel; label: string; speed: string; accuracy: string; size: string; icon: React.ElementType; active: boolean }[] = [
                  { id: 'tiny.en', label: 'Tiny.en', speed: 'Blazing', accuracy: 'Good', size: '75 MB', icon: Zap, active: true },
                  { id: 'base.en', label: 'Base.en', speed: 'Fast', accuracy: 'High', size: '142 MB', icon: Server, active: false },
                  { id: 'large-v3', label: 'Large v3', speed: 'Slow', accuracy: 'SOTA', size: '2.9 GB', icon: Activity, active: false },
                ]
                return (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {WHISPER_TIERS.map((tier) => {
                      const isSelected = store.siulkVoice.whisperModel === tier.id
                      const TierIcon = tier.icon
                      return (
                        <button
                          key={tier.id}
                          onClick={() => store.setWhisperModel(tier.id)}
                          className="relative rounded-[20px] border p-5 text-left transition-all"
                          style={{
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(79,140,255,0.12), rgba(40,231,197,0.06))'
                              : 'var(--surface-1)',
                            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                            boxShadow: isSelected ? '0 12px 36px var(--accent-glow)' : 'none',
                          }}
                        >
                          {isSelected && (
                            <div className="absolute top-4 right-4 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: 'rgba(79,140,255,0.2)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                              Active
                            </div>
                          )}
                          <TierIcon size={20} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }} />
                          <div className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{tier.label}</div>
                          <div className="mt-2 space-y-0.5">
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Speed: {tier.speed}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Accuracy: {tier.accuracy}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{tier.size}</div>
                          </div>
                          {isSelected && (
                            <div className="mt-3 flex items-center gap-1.5">
                              <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>ACTIVE</span>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })()}
            </SettingsCard>

            <SettingsCard className="premium-surface-grid space-y-4">
              {(() => {
                const LANG_OPTIONS: { id: WhisperLanguage; label: string; native: string }[] = [
                  { id: 'en', label: 'English', native: 'English' },
                  { id: 'es', label: 'Spanish', native: 'Español' },
                  { id: 'fr', label: 'French', native: 'Français' },
                  { id: 'de', label: 'German', native: 'Deutsch' },
                  { id: 'ja', label: 'Japanese', native: '日本語' },
                  { id: 'zh', label: 'Chinese', native: '中文' },
                ]
                return (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Whisper Language</div>
                    <div className="relative">
                      <select
                        value={store.siulkVoice.whisperLanguage}
                        onChange={(e) => store.setWhisperLanguage(e.target.value as WhisperLanguage)}
                        className="w-full appearance-none rounded-[14px] border px-4 py-3 text-[12px] font-semibold pr-10 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, rgba(79,140,255,0.08), rgba(40,231,197,0.04))',
                          borderColor: 'var(--accent)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      >
                        {LANG_OPTIONS.map((lang) => (
                          <option key={lang.id} value={lang.id} style={{ background: 'rgb(8,13,22)', color: 'var(--text-primary)' }}>
                            {lang.native}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--accent)' }} />
                    </div>
                  </div>
                )
              })()}
            </SettingsCard>

            <SettingsCard className="premium-surface-grid space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Microphone</div>
                </div>
                <button className="btn-ghost text-[10px] flex items-center gap-1.5" style={{ color: 'var(--accent)' }} onClick={() => addToast('Refreshing microphone list...', 'info', 2000)}>
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => store.setSiulkVoiceSelectedMicrophone(null)}
                  className="w-full flex items-center gap-3 rounded-[16px] border px-4 py-3 text-left transition-all"
                  style={{
                    background: !store.siulkVoice.selectedMicrophone ? 'var(--accent-subtle)' : 'var(--surface-1)',
                    borderColor: !store.siulkVoice.selectedMicrophone ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${!store.siulkVoice.selectedMicrophone ? 'var(--accent)' : 'var(--text-muted)'}` }}>
                    {!store.siulkVoice.selectedMicrophone && <div className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>System Default</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Use the operating system default microphone</div>
                  </div>
                </button>
              </div>
            </SettingsCard>

            <SettingsCard className="premium-surface-grid">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: 'var(--text-muted)' }}>How It Works</div>
              <div className="space-y-3 text-[11px] leading-5" style={{ color: 'var(--text-secondary)' }}>
                <p><span className="font-semibold" style={{ color: 'var(--accent)' }}>Push-to-Talk:</span> Hold the configured shortcut key to record. Release to stop and transcribe automatically.</p>
                <p><span className="font-semibold" style={{ color: 'var(--accent)' }}>Toggle Recording:</span> Press the shortcut key once to start recording. Press it again to stop and transcribe.</p>
                <p><span className="font-semibold" style={{ color: 'var(--accent)' }}>Click:</span> Click the Voice pill in the header to start. Click again or press the stop button to transcribe.</p>
                <div className="mt-3 rounded-[14px] border px-4 py-3 text-[10px]" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  All transcription runs fully on-device using the selected Whisper model — no audio is ever sent to the cloud.
                </div>
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'notifications' && (
          <div className="max-w-2xl space-y-5">
            <SectionHeader icon={Bell} title="Notifications" desc="Configure sounds and system alerts for agent activity." />

            <SettingsCard className="space-y-4">
              {[
                {
                  key: 'sounds' as const,
                  label: 'Notification sounds',
                  desc: 'Play a short tone when an agent completes, errors, or goes idle.',
                },
                {
                  key: 'os' as const,
                  label: 'OS notifications',
                  desc: 'Show a system notification when an agent changes status, even when SloerSpace is in the background.',
                },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4 p-4 rounded-[18px] transition-all"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({ [key]: !notificationSettings[key] })}
                    className="relative shrink-0 h-6 w-11 rounded-full transition-all duration-200"
                    style={{
                      background: notificationSettings[key]
                        ? 'linear-gradient(135deg, var(--accent), var(--secondary))'
                        : 'rgba(255,255,255,0.1)',
                      boxShadow: notificationSettings[key] ? '0 4px 16px var(--accent-glow)' : 'none',
                    }}
                  >
                    <div className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200"
                      style={{ left: notificationSettings[key] ? 'calc(100% - 22px)' : '2px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                  </button>
                </div>
              ))}
            </SettingsCard>

            <SettingsCard>
              <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Notification events</div>
              <div className="space-y-2">
                {[
                  { event: 'Agent completes task', status: notificationSettings.sounds || notificationSettings.os },
                  { event: 'Agent encounters error', status: notificationSettings.sounds || notificationSettings.os },
                  { event: 'Workspace launched', status: notificationSettings.os },
                  { event: 'Swarm mission finished', status: notificationSettings.sounds || notificationSettings.os },
                ].map(({ event, status }) => (
                  <div key={event} className="flex items-center gap-3 py-2 px-3 rounded-[14px]" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: status ? 'var(--success)' : 'var(--text-muted)' }} />
                    <span className="flex-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{event}</span>
                    <span className="text-[9px] font-bold uppercase rounded px-2 py-0.5" style={{
                      background: status ? 'rgba(40,231,197,0.1)' : 'rgba(255,255,255,0.04)',
                      color: status ? 'var(--success)' : 'var(--text-muted)',
                    }}>{status ? 'Active' : 'Muted'}</span>
                  </div>
                ))}
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'cli' && (
          <div className="max-w-3xl space-y-5">
            <SectionHeader icon={MonitorSmartphone} title="CLI" desc="Install and configure the sloerspace command-line interface." />

            <SettingsCard className="premium-surface-grid space-y-5">
              <div className="rounded-[22px] border p-5" style={{ background: 'linear-gradient(180deg, rgba(9,15,24,0.84), rgba(6,10,18,0.92))', borderColor: 'var(--border)' }}>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]" style={{ background: 'var(--accent-subtle)', border: '1px solid rgba(79,140,255,0.15)', boxShadow: '0 12px 28px var(--accent-glow)' }}>
                    <MonitorSmartphone size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>sloerspace CLI</div>
                    <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      Install the <code className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--surface-3)', color: 'var(--accent)' }}>sloerspace</code> command to open projects, manage workspaces, and control the app from any terminal.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Installation</div>
                <div className="rounded-[18px] border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                  <div className="mb-3 text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>PowerShell (Windows)</div>
                  <div className="rounded-[14px] border px-4 py-3 font-mono text-[10px] leading-5" style={{ background: 'var(--terminal-bg)', borderColor: 'var(--border)', color: 'var(--terminal-text)' }}>
                    <span style={{ color: 'var(--accent)' }}>$</span> npm install -g @sloerspace/cli
                  </div>
                </div>

                <div className="rounded-[18px] border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                  <div className="mb-3 text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Verify installation</div>
                  <div className="rounded-[14px] border px-4 py-3 font-mono text-[10px] leading-5" style={{ background: 'var(--terminal-bg)', borderColor: 'var(--border)', color: 'var(--terminal-text)' }}>
                    <span style={{ color: 'var(--accent)' }}>$</span> sloerspace --version
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>Usage</div>
                <div className="rounded-[18px] border overflow-hidden" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
                  {[
                    { cmd: 'sloerspace open .', desc: 'Open the current directory as a workspace' },
                    { cmd: 'sloerspace open /path/to/project', desc: 'Open a specific project directory' },
                    { cmd: 'sloerspace swarm --agents 4', desc: 'Launch a swarm session with 4 agents' },
                    { cmd: 'sloerspace status', desc: 'Show the current app and workspace status' },
                  ].map((item, index) => (
                    <div key={item.cmd} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: index < 3 ? '1px solid var(--border)' : 'none' }}>
                      <code className="shrink-0 rounded-[10px] px-3 py-1.5 font-mono text-[10px]" style={{ background: 'var(--surface-3)', color: 'var(--accent)' }}>{item.cmd}</code>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </SettingsCard>
          </div>
        )}

        {settingsTab === 'terminal' && (
          <div className="max-w-3xl space-y-5">
            <SectionHeader icon={Terminal} title="Terminal" desc="Configure which shell is used for new terminal sessions." />

            <SettingsCard className="premium-surface-grid space-y-5">
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Default Shell</div>
                <div className="mt-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>New terminals will use your selected shell. Override per terminal from the right-click menu.</div>
              </div>

              <div className="space-y-2">
                {([
                  { id: 'auto' as const, label: 'System Default (auto-detect)', desc: 'Automatically select the best available shell', badge: null, path: null },
                  { id: 'powershell' as const, label: 'Windows PowerShell', desc: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', badge: 'powershell', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' },
                  { id: 'command-prompt' as const, label: 'Command Prompt', desc: 'C:\\Windows\\system32\\cmd.exe', badge: 'cmd', path: 'C:\\Windows\\system32\\cmd.exe' },
                  { id: 'git-bash' as const, label: 'Git Bash', desc: 'C:\\Windows\\system32\\bash.exe', badge: 'bash', path: 'C:\\Windows\\system32\\bash.exe' },
                ] as const).map((shell) => {
                  const active = store.terminalSettings.defaultShell === shell.id
                  return (
                    <button
                      key={shell.id}
                      onClick={() => store.setTerminalDefaultShell(shell.id)}
                      className="w-full flex items-center gap-3 rounded-[18px] border px-5 py-4 text-left transition-all"
                      style={{
                        background: active
                          ? 'linear-gradient(135deg, rgba(79,140,255,0.12), rgba(40,231,197,0.06))'
                          : 'var(--surface-1)',
                        borderColor: active ? 'var(--accent)' : 'var(--border)',
                        boxShadow: active ? '0 12px 36px var(--accent-glow)' : 'none',
                      }}
                    >
                      <div className="h-5 w-5 rounded-full flex items-center justify-center shrink-0" style={{ border: `2px solid ${active ? 'var(--accent)' : 'var(--text-muted)'}` }}>
                        {active && <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 4px 12px var(--accent-glow)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{shell.label}</span>
                          {shell.badge && (
                            <span className="rounded-md px-2 py-0.5 text-[9px] font-mono" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{shell.badge}</span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{shell.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SettingsCard>
          </div>
        )}

        {(settingsTab as string) === 'data' && (
          <div className="max-w-2xl">
            <SectionHeader icon={Database} title="Data Management" desc="Export, import, and reset your data" />

            <div className="space-y-4">
              <SettingsCard>
                <div className="label">Export Data</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Download all your workspaces, tasks, agents, prompts and settings as a JSON backup file.
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={handleExport} className="btn-primary flex items-center gap-2 text-[11px]">
                    <Download size={12} /> Export Backup
                  </button>
                  {exportMsg && <span className="text-[11px] font-semibold" style={{ color: 'var(--success)' }}>{exportMsg}</span>}
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="label">Import Data</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Restore from a previously exported JSON backup file. This will replace all current data.
                </p>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                <div className="flex items-center gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary flex items-center gap-2 text-[11px]">
                    <Upload size={12} /> Import Backup
                  </button>
                  {importMsg && <span className="text-[11px] font-semibold" style={{ color: importMsg.includes('Reloading') ? 'var(--success)' : 'var(--error)' }}>{importMsg}</span>}
                </div>
              </SettingsCard>

              <SettingsCard>
                <div className="label" style={{ color: 'var(--error)' }}>Danger Zone</div>
                <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Reset all data to factory defaults. This removes all workspaces, tasks, agents, prompts, and settings.
                </p>
                <button onClick={() => setShowResetConfirm(true)} className="text-[11px] font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2" style={{ background: 'rgba(255,71,87,0.12)', color: 'var(--error)', border: '1px solid rgba(255,71,87,0.2)' }}>
                  <Trash2 size={12} /> Reset All Data
                </button>
              </SettingsCard>
            </div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowResetConfirm(false)}>
            <div className="premium-panel-elevated w-[400px] max-w-[calc(100vw-32px)] p-6 animate-scale-in text-center" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,71,87,0.14)' }}>
                <AlertTriangle size={24} style={{ color: 'var(--error)' }} />
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>Reset All Data?</h2>
              <p className="text-[13px] mb-5" style={{ color: 'var(--text-secondary)' }}>This will permanently delete all your workspaces, tasks, agents, prompts, and settings. This cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="btn-ghost text-[11px]">Cancel</button>
                <button onClick={handleReset} className="text-[11px] font-semibold px-4 py-2 rounded-xl transition-all" style={{ background: 'var(--error)', color: '#fff' }}>Reset Everything</button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}
