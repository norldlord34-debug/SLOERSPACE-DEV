'use client'

import Image from 'next/image'
import { useStore, ThemeId, AgentCli, SettingsTab, CustomThemePreset } from '@/store/useStore'
import { Palette, Keyboard, Bot, User, Key, ExternalLink, LogOut, Download, FileText, Check, Sparkles, ShieldCheck, Command, Upload, Database, Trash2, AlertTriangle, ChevronRight, Mail } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'ai-agents', label: 'AI Agents', icon: Bot },
  { id: 'account', label: 'Account', icon: User },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'data' as SettingsTab, label: 'Data', icon: Database },
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
  const traffic = compact ? 4 : 5
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

      <div className={`grid gap-4 p-4 ${compact ? 'md:grid-cols-[0.78fr_1.22fr]' : 'xl:grid-cols-[220px_1fr]'}`}>
        <div
          className="premium-card-shell rounded-[20px] border p-4"
          style={{
            background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})`,
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-9 w-9 rounded-[14px]"
              style={{
                background: accentSoft,
                border: `1px solid ${accentBorder}`,
                boxShadow: `0 14px 34px ${withAlpha(theme.accent, 0.14)}`,
              }}
            />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Workspace</div>
              <div className="text-[12px] font-semibold" style={{ color: theme.textPrimary }}>Mission control</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {['Overview', 'Threads', 'Agents', 'Console'].slice(0, traffic).map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-[14px] px-3 py-2"
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
            <div className="space-y-2">
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

          <div className={`grid gap-4 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-[1.1fr_0.9fr]'}`}>
            <div
              className="premium-card-shell rounded-[20px] border p-4"
              style={{
                background: `linear-gradient(180deg, ${theme.terminalBg}, ${theme.surface0})`,
                borderColor: theme.border,
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Terminal</div>
                <span className="text-[10px] font-mono" style={{ color: theme.textSecondary }}>PS &gt; ship</span>
              </div>
              <div className="space-y-2 text-[10px] font-mono">
                <div style={{ color: theme.terminalText }}>$ validate theme tokens</div>
                <div style={{ color: theme.secondary }}>✓ contrast baseline passed</div>
                <div style={{ color: theme.accent }}>✓ preview surface rendered</div>
              </div>
            </div>

            <div
              className="premium-card-shell rounded-[20px] border p-4"
              style={{
                background: `linear-gradient(180deg, ${theme.surface1}, ${theme.surface2})`,
                borderColor: theme.border,
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>Signals</div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-[14px] px-3 py-2" style={{ background: accentSoft, color: theme.accent, border: `1px solid ${accentBorder}` }}>Accent channel armed</div>
                <div className="rounded-[14px] px-3 py-2" style={{ background: secondarySoft, color: theme.secondary, border: `1px solid ${secondaryBorder}` }}>Secondary lane synced</div>
                <div className="rounded-[14px] px-3 py-2" style={{ background: theme.surface0, color: theme.textSecondary, border: `1px solid ${theme.border}` }}>Panel contrast stabilized</div>
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

export function SettingsPage() {
  const store = useStore()
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
  } = store
  const [exportMsg, setExportMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [themeActionMsg, setThemeActionMsg] = useState('')
  const [hoverThemeId, setHoverThemeId] = useState<ThemeId | null>(null)
  const [importedThemePreview, setImportedThemePreview] = useState<ThemePreviewDescriptor | null>(null)
  const [showThemeJson, setShowThemeJson] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
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
      className="premium-surface-grid h-full overflow-hidden rounded-[28px] px-5 py-6 lg:px-7 lg:py-7"
      style={{
        background: `radial-gradient(circle at 14% 12%, ${withAlpha(activeThemeDescriptor.accent, 0.08)}, transparent 24%), radial-gradient(circle at 84% 10%, ${withAlpha(activeThemeDescriptor.secondary, 0.08)}, transparent 20%), radial-gradient(circle at 82% 84%, ${withAlpha(activeThemeDescriptor.accent, 0.06)}, transparent 18%), linear-gradient(180deg, ${activeThemeDescriptor.surface0}, ${activeThemeDescriptor.surface1})`,
      }}
    >
      <div className="grid h-full gap-5 xl:grid-cols-[290px_1fr]">
        <aside
          className="premium-panel-elevated min-h-0 p-4 md:p-5"
          style={{
            background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))',
            borderColor: 'var(--border)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.18)',
          }}
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="h-11 w-11 overflow-hidden rounded-[18px] border border-white/10 shadow-[0_16px_34px_rgba(79,140,255,0.14)]">
              <Image src="/LOGO.png" alt="SloerSpace" width={44} height={44} className="h-full w-full object-cover" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--text-muted)' }}>Executive Settings</div>
              <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>SloerSpace Control</div>
            </div>
          </div>

          <div className="premium-panel mb-4 p-4" style={{ background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))', borderColor: 'var(--border)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Operator</div>
                <div className="mt-1 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.username}</div>
              </div>
              <div className="premium-chip" style={{ color: 'var(--success)' }}>
                <ShieldCheck size={12} />
                {userProfile.plan.toUpperCase()}
              </div>
            </div>
            <div className="text-[11px] font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{userProfile.email}</div>
          </div>

          <div className="space-y-1.5">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon
              const active = settingsTab === tab.id

              return (
                <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-[20px] text-[12px] font-semibold transition-all relative"
                  style={{
                    background: active ? 'linear-gradient(135deg, rgba(79,140,255,0.16), rgba(40,231,197,0.08))' : 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'rgba(163,209,255,0.18)' : 'transparent'}`,
                  }}
                >
                  {active && <div className="absolute inset-y-3 left-0 w-[3px] rounded-r-full" style={{ background: 'linear-gradient(180deg, var(--accent), var(--secondary))' }} />}
                  <div className="flex h-9 w-9 items-center justify-center rounded-[16px]" style={{ background: active ? 'rgba(79,140,255,0.12)' : 'rgba(9,15,24,0.72)', color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                    <Icon size={15} />
                  </div>
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="premium-panel mt-4 p-4" style={{ background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))', borderColor: 'var(--border)' }}>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
              <Command size={12} style={{ color: 'var(--accent)' }} />
              Quick key
            </div>
            <div className="premium-kbd inline-flex">Ctrl + ,</div>
          </div>
        </aside>

        <div
          className="premium-panel-elevated min-h-0 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, var(--surface-glass-strong), var(--surface-glass))',
            borderColor: 'var(--border)',
            boxShadow: '0 28px 90px rgba(0,0,0,0.2)',
          }}
        >
          <div className="border-b border-[var(--border)] px-6 py-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="premium-chip" style={{ color: 'var(--warning)' }}>
                <Sparkles size={12} />
                Premium Console
              </div>
              <div className="premium-chip">
                <ShieldCheck size={12} style={{ color: 'var(--success)' }} />
                Live preferences
              </div>
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}>
              Settings & personalization
            </div>
            <div className="mt-2 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              Tune the shell, agents, account settings and shortcuts from a single elevated control surface.
            </div>
          </div>

          <div className="h-[calc(100%-120px)] overflow-y-auto p-6">
        {settingsTab === 'appearance' && (
          <div className="max-w-6xl space-y-5">
            <input ref={themeJsonInputRef} type="file" accept=".json" className="hidden" onChange={handleThemeImport} />
            <SectionHeader icon={Palette} title="Appearance" desc="Theme studio, live previews, and surface-quality control." />

            <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
              <SettingsCard className="premium-surface-grid space-y-5">
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

                <div className="grid gap-3 md:grid-cols-4">
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

        {settingsTab === 'account' && (
          <div className="max-w-2xl">
            <SectionHeader icon={User} title="Account" desc="Manage your profile, billing, and current session." />

            <div className="space-y-4">
              {/* PROFILE */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--text-muted)' }}>Profile</div>
              <SettingsCard>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)', border: '2px solid var(--accent)' }}>
                    {userProfile.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.username}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(46,213,115,0.15)', color: 'var(--success)' }}>● Active</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <Mail size={10} /> {userProfile.email}
                    </div>
                  </div>
                </div>
                <button className="btn-secondary text-[10px] flex items-center gap-1.5 mb-4">
                  <ExternalLink size={10} /> Edit Profile
                </button>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Email</div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{userProfile.email}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Account ID</div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{userProfile.accountId.slice(0, 8)}...{userProfile.accountId.slice(-4)}</div>
                  </div>
                </div>
              </SettingsCard>

              {/* BILLING */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-6 mb-2" style={{ color: 'var(--text-muted)' }}>Billing</div>
              <SettingsCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: userProfile.plan === 'pro' ? 'var(--accent-subtle)' : 'var(--surface-3)', border: `1px solid ${userProfile.plan === 'pro' ? 'rgba(79,140,255,0.2)' : 'var(--border)'}` }}>
                      <Bot size={16} style={{ color: userProfile.plan === 'pro' ? 'var(--accent)' : 'var(--text-muted)' }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{userProfile.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</span>
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: userProfile.plan === 'pro' ? 'rgba(46,213,115,0.15)' : 'var(--surface-3)', color: userProfile.plan === 'pro' ? 'var(--success)' : 'var(--text-muted)' }}>
                          {userProfile.plan === 'pro' ? 'Active' : 'Current'}
                        </span>
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {userProfile.plan === 'pro' ? 'Full access to all SloerSpace features' : 'Limited access — upgrade for full features'}
                      </div>
                    </div>
                  </div>
                  <button className="btn-primary text-[10px] flex items-center gap-1">
                    <ExternalLink size={10} /> {userProfile.plan === 'pro' ? 'Manage Plan' : 'Upgrade'}
                  </button>
                </div>

                <div className="space-y-1">
                  <button className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[var(--surface-2)]" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                      <div className="text-left">
                        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>View Plans</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Compare plans and pricing</div>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[var(--surface-2)]" style={{ border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5">
                      <Key size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="text-left">
                        <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Payment Methods</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Update cards and billing details</div>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={12} /> Payments are handled securely through Stripe and open in your browser.
                </div>
              </SettingsCard>

              {/* SESSION */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-6 mb-2" style={{ color: 'var(--text-muted)' }}>Session</div>
              <SettingsCard>
                <div className="flex items-center gap-3 p-3 rounded-xl mb-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)' }}>
                    <Command size={14} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Current Device</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>This Session</span>
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SloerSpace Desktop · {store.sessionDevice || 'Windows'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl" style={{ border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <LogOut size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Sign Out</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>End your session on this device</div>
                    </div>
                  </div>
                  <button onClick={() => { store.logout(); store.setView('login') }} className="btn-ghost text-[10px] flex items-center gap-1">
                    <LogOut size={10} /> Sign Out
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-[10px]" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={12} /> Your session is encrypted. Sign out when using shared devices.
                </div>
              </SettingsCard>

              {/* DEBUG */}
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-6 mb-2" style={{ color: 'var(--text-muted)' }}>Debug</div>
              <SettingsCard>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Download size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Updates</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Current version: 0.1.0</div>
                    </div>
                  </div>
                  <button className="btn-secondary text-[10px] flex items-center gap-1"><Download size={10} /> Check for Updates</button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Log file</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>For debugging auth and API issues.</div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 p-2.5 rounded-lg font-mono text-[9px] flex items-center justify-between" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <span>C:\Users\...\AppData\Local\sloerspace\logs\sloerspace-tauri.log</span>
                  <button className="btn-ghost text-[8px] px-2 py-1">Show in Explorer</button>
                </div>
              </SettingsCard>
            </div>
          </div>
        )}

        {settingsTab === 'api-keys' && (
          <div className="max-w-2xl">
            <SectionHeader icon={Key} title="API Keys" desc="Create and manage API keys for MCP and programmatic SloerSpace access." />
            {userProfile.plan === 'free' ? (
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
