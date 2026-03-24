import type { Meta, StoryObj } from '@storybook/react';
import { OrbitingCircles } from './orbiting-circles';

const meta: Meta<typeof OrbitingCircles> = {
  title: 'Primitives/OrbitingCircles',
  component: OrbitingCircles,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    radius: {
      control: { type: 'range', min: 50, max: 300, step: 10 },
    },
    iconSize: {
      control: { type: 'range', min: 20, max: 80, step: 5 },
    },
    speed: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
    },
    duration: {
      control: { type: 'range', min: 5, max: 60, step: 5 },
    },
    reverse: {
      control: 'boolean',
    },
    path: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div className="relative flex h-[600px] w-[600px] items-center justify-center overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

// ─── Tool Icons ────────────────────────────────────────────────────────────────

const Icons = {
  webstorm: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ws-a" x1="43.9%" y1="1.8%" x2="66%" y2="95.5%">
          <stop offset="0%" stopColor="#07C3F2" />
          <stop offset="100%" stopColor="#087CFA" />
        </linearGradient>
        <linearGradient id="ws-b" x1="33.3%" y1="10%" x2="71.7%" y2="98.7%">
          <stop offset="0%" stopColor="#FCF84A" />
          <stop offset="100%" stopColor="#07C3F2" />
        </linearGradient>
      </defs>
      <path fill="url(#ws-a)" d="M59.3 0L0 35.7l21.3 188.4L128 256l98.7-44.2L256 55.8z" />
      <path
        fill="url(#ws-b)"
        d="M195.1 56.3L128 0 59.3 0 41.7 104.5 87 156 128 103.2 169 156l45.3-51.5z"
      />
      <path fill="#000" d="M48 48h160v160H48z" />
      <path
        fill="#FFF"
        d="M65.4 176h60v10h-60zm3.6-112l12.5 48.9L96 64h12l14.5 48.9L135 64h13.5L127 144h-12L100.5 95 86 144H74L52.5 64zm82 0h20c17.5 0 29 11 29 29v.2c0 18-11.5 29.2-29 29.2h-7.5V144H151zm19 47.6c9.5 0 16-6.2 16-17.3v-.2c0-11.2-6.3-17.2-16-17.2h-6.5v34.7z"
      />
    </svg>
  ),
  vscode: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M180.6 246.2l68.5-32.6a14.3 14.3 0 008.4-13.1V55.5a14.3 14.3 0 00-8.4-13.1L180.6 9.8a14.3 14.3 0 00-16.4 3.1L70.2 99.8 29 68.5a9.5 9.5 0 00-12.2 0L2.5 81.6a9.6 9.6 0 000 14.3L38.2 128 2.5 160.1a9.6 9.6 0 000 14.3l14.3 13.1a9.5 9.5 0 0012.2 0l41.2-31.3 94 86.9a14.3 14.3 0 0016.4 3.1zM180.6 72.5L107.8 128l72.8 55.5z"
        fill="#007ACC"
      />
    </svg>
  ),
  sublimeText: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="st-a" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FF9800" />
          <stop offset="100%" stopColor="#F44336" />
        </linearGradient>
      </defs>
      <path
        fill="url(#st-a)"
        d="M28 106l200-65v75L28 181zm0 69l200-65v75L28 250zM228 6L28 71v75l200-65z"
      />
    </svg>
  ),
  iterm2: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="45" fill="#000" />
      <rect x="24" y="24" width="208" height="208" rx="8" fill="#1d1d1d" />
      <rect x="24" y="24" width="208" height="40" rx="8" fill="#3d3d3d" />
      <circle cx="48" cy="44" r="7" fill="#ff5f56" />
      <circle cx="68" cy="44" r="7" fill="#ffbd2e" />
      <circle cx="88" cy="44" r="7" fill="#27c93f" />
      <text x="40" y="110" fontFamily="monospace" fontSize="20" fill="#27c93f">
        $
      </text>
      <rect x="58" y="96" width="10" height="20" fill="#27c93f" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0;0.8" dur="1s" repeatCount="indefinite" />
      </rect>
    </svg>
  ),
  warp: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="warp-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#01A4FF" />
          <stop offset="100%" stopColor="#6C47FF" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="56" fill="url(#warp-g)" />
      <path d="M80 64l48 64-48 64h32l48-64-48-64zm16 0l48 64-48 64h32l48-64-48-64z" fill="#FFF" />
    </svg>
  ),
  ohmyzsh: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <circle cx="128" cy="128" r="128" fill="#1A1A2E" />
      <text
        x="128"
        y="98"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="60"
        fill="#47E60A"
      >
        Oh
      </text>
      <text
        x="128"
        y="155"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="40"
        fill="#47E60A"
      >
        My
      </text>
      <text
        x="128"
        y="200"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="50"
        fill="#FFF"
      >
        Zsh
      </text>
    </svg>
  ),
  gitkraken: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gk-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#169287" />
          <stop offset="100%" stopColor="#2ACF6C" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="128" r="128" fill="url(#gk-g)" />
      <circle cx="96" cy="100" r="18" fill="#FFF" />
      <circle cx="160" cy="100" r="18" fill="#FFF" />
      <circle cx="96" cy="100" r="10" fill="#1A1A2E" />
      <circle cx="160" cy="100" r="10" fill="#1A1A2E" />
      <path
        d="M88 150 q40 40 80 0"
        stroke="#FFF"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M70 70 q-20-30 0-50" stroke="#FFF" strokeWidth="5" fill="none" />
      <path d="M186 70 q20-30 0-50" stroke="#FFF" strokeWidth="5" fill="none" />
    </svg>
  ),
  lens: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lens-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3D90CE" />
          <stop offset="100%" stopColor="#326DE6" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="56" fill="url(#lens-g)" />
      <circle cx="128" cy="128" r="60" fill="none" stroke="#FFF" strokeWidth="14" />
      <circle cx="128" cy="128" r="20" fill="#FFF" />
      <line
        x1="172"
        y1="172"
        x2="216"
        y2="216"
        stroke="#FFF"
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  ),
  tmux: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="20" fill="#1BB91F" />
      <text
        x="128"
        y="150"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="64"
        fill="#FFF"
      >
        tmux
      </text>
    </svg>
  ),
  cmux: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="20" fill="#4A4A4A" />
      <text
        x="128"
        y="150"
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize="64"
        fill="#00BCD4"
      >
        cmux
      </text>
    </svg>
  ),
  claude: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="56" fill="#D97757" />
      <path d="M148.9 86.5l-27 82.7h-.4l-27-82.7H75.8L115 194.3h17.6L172.2 86.5z" fill="#FFF" />
    </svg>
  ),
  cursor: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" rx="56" fill="#000" />
      <path d="M64 64 L192 128 L128 148 L148 192 L120 200 L100 156 L64 192 Z" fill="#FFF" />
    </svg>
  ),
  gemini: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gem-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A73E8" />
          <stop offset="50%" stopColor="#6C47FF" />
          <stop offset="100%" stopColor="#E040FB" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="128" r="128" fill="#FFF" />
      <path
        d="M128 20 C128 128 128 128 128 128 C128 128 236 128 236 128 C236 128 128 128 128 128 C128 128 128 236 128 236 C128 236 128 128 128 128 C128 128 20 128 20 128 C20 128 128 128 128 128 C128 128 128 20 128 20Z"
        fill="url(#gem-g)"
      />
      <ellipse cx="128" cy="128" rx="108" ry="108" fill="none" />
      <path
        d="M128 20 Q190 60 236 128 Q190 196 128 236 Q66 196 20 128 Q66 60 128 20Z"
        fill="url(#gem-g)"
        opacity="0.9"
      />
    </svg>
  ),
  openai: () => (
    <svg width="100" height="100" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#000" />
      <path
        d="M18.7 8.3a4.5 4.5 0 00-.4-3.7A4.5 4.5 0 0013.4 2.5 4.5 4.5 0 009.8 3.5a4.5 4.5 0 00-3 2.2 4.5 4.5 0 00.6 5.3 4.5 4.5 0 00.4 3.7 4.5 4.5 0 004.9 2.1 4.5 4.5 0 003.4 1.5 4.5 4.5 0 004.3-3.2 4.5 4.5 0 003-2.2 4.5 4.5 0 00-.6-5.3zM14.2 19.5a3.4 3.4 0 01-2.2-.8l.1-.1 3.6-2.1a.6.6 0 00.3-.5v-5.1l1.5.9v4.2a3.4 3.4 0 01-3.4 3.4zm-7.3-3.1a3.4 3.4 0 01-.4-2.3l.1.1 3.6 2.1a.6.6 0 00.6 0l4.4-2.5v1.8l-3.6 2.1a3.4 3.4 0 01-4.6-1.2zM5.6 9a3.4 3.4 0 011.8-1.5V12a.6.6 0 00.3.5l4.4 2.5-1.5.9-3.6-2.1A3.4 3.4 0 015.6 9zm12.5 2.9l-4.4-2.5 1.5-.9 3.6 2.1a3.4 3.4 0 01-.5 6.1v-4.4a.6.6 0 00-.3-.5zM15.6 9l-.1-.1-3.6-2.1a.6.6 0 00-.6 0L6.9 9.3V7.5l3.6-2.1a3.4 3.4 0 015 3.5zm-6 3.1L8 11.2V7.6l.1-.1 3.6-2.1a.6.6 0 00.6 0l3.6 2.1v3.6l-3.6 2.1a.6.6 0 01-.3.1z"
        fill="#FFF"
        transform="scale(0.75) translate(4, 4)"
      />
    </svg>
  ),
  shepai: () => (
    <svg width="100" height="100" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shep-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="56" fill="url(#shep-g)" />
      <text
        x="128"
        y="105"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="bold"
        fontSize="56"
        fill="#FFF"
      >
        shep
      </text>
      <text
        x="128"
        y="160"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="300"
        fontSize="40"
        fill="#FFF"
        opacity="0.85"
      >
        AI CLI
      </text>
    </svg>
  ),
};

// ─── Stories ────────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => (
    <>
      <span className="text-foreground pointer-events-none text-center text-lg leading-none font-semibold whitespace-pre">
        Dev Tools
      </span>
      <OrbitingCircles iconSize={40} radius={100} speed={1.5}>
        <Icons.vscode />
        <Icons.webstorm />
        <Icons.sublimeText />
        <Icons.cursor />
        <Icons.shepai />
      </OrbitingCircles>
      <OrbitingCircles iconSize={35} radius={180} reverse speed={1}>
        <Icons.iterm2 />
        <Icons.warp />
        <Icons.ohmyzsh />
        <Icons.tmux />
        <Icons.gitkraken />
        <Icons.lens />
        <Icons.cmux />
      </OrbitingCircles>
      <OrbitingCircles iconSize={30} radius={250} speed={0.8}>
        <Icons.claude />
        <Icons.gemini />
        <Icons.openai />
      </OrbitingCircles>
    </>
  ),
};

export const IDEsAndEditors: Story = {
  name: 'IDEs & Editors',
  render: () => (
    <>
      <span className="text-muted-foreground pointer-events-none text-center text-sm font-medium">
        IDEs & Editors
      </span>
      <OrbitingCircles iconSize={45} radius={120}>
        <Icons.vscode />
        <Icons.webstorm />
        <Icons.sublimeText />
        <Icons.cursor />
      </OrbitingCircles>
    </>
  ),
};

export const TerminalTools: Story = {
  name: 'Terminal Tools',
  render: () => (
    <>
      <span className="text-muted-foreground pointer-events-none text-center text-sm font-medium">
        Terminals & Shells
      </span>
      <OrbitingCircles iconSize={40} radius={100} speed={2}>
        <Icons.iterm2 />
        <Icons.warp />
        <Icons.tmux />
      </OrbitingCircles>
      <OrbitingCircles iconSize={35} radius={170} reverse>
        <Icons.ohmyzsh />
        <Icons.cmux />
      </OrbitingCircles>
    </>
  ),
};

export const AIModels: Story = {
  name: 'AI Models',
  render: () => (
    <>
      <span className="text-muted-foreground pointer-events-none text-center text-sm font-medium">
        AI Assistants
      </span>
      <OrbitingCircles iconSize={45} radius={120} speed={1.5}>
        <Icons.claude />
        <Icons.gemini />
        <Icons.openai />
        <Icons.cursor />
        <Icons.shepai />
      </OrbitingCircles>
    </>
  ),
};

export const DevOpsTools: Story = {
  name: 'DevOps Tools',
  render: () => (
    <>
      <span className="text-muted-foreground pointer-events-none text-center text-sm font-medium">
        DevOps & Git
      </span>
      <OrbitingCircles iconSize={45} radius={120}>
        <Icons.gitkraken />
        <Icons.lens />
      </OrbitingCircles>
    </>
  ),
};

export const Reversed: Story = {
  render: () => (
    <>
      <span className="text-muted-foreground pointer-events-none text-center text-sm font-medium">
        Reversed
      </span>
      <OrbitingCircles iconSize={40} radius={130} reverse>
        <Icons.vscode />
        <Icons.claude />
        <Icons.warp />
        <Icons.shepai />
      </OrbitingCircles>
    </>
  ),
};

export const NoPath: Story = {
  render: () => (
    <>
      <span className="text-muted-foreground pointer-events-none text-center text-sm font-medium">
        No Orbit Path
      </span>
      <OrbitingCircles iconSize={40} radius={130} path={false}>
        <Icons.vscode />
        <Icons.claude />
        <Icons.warp />
        <Icons.shepai />
      </OrbitingCircles>
    </>
  ),
};

export const OnDarkBackground: Story = {
  render: () => (
    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-zinc-900">
      <div className="relative flex h-[500px] w-[500px] items-center justify-center">
        <span className="pointer-events-none text-center text-lg font-semibold text-white">
          Dev Toolbox
        </span>
        <OrbitingCircles iconSize={40} radius={100} speed={1.5}>
          <Icons.vscode />
          <Icons.webstorm />
          <Icons.sublimeText />
          <Icons.cursor />
          <Icons.shepai />
        </OrbitingCircles>
        <OrbitingCircles iconSize={35} radius={180} reverse speed={1}>
          <Icons.iterm2 />
          <Icons.warp />
          <Icons.ohmyzsh />
          <Icons.tmux />
          <Icons.gitkraken />
          <Icons.lens />
          <Icons.cmux />
        </OrbitingCircles>
        <OrbitingCircles iconSize={30} radius={230} speed={0.8}>
          <Icons.claude />
          <Icons.gemini />
          <Icons.openai />
        </OrbitingCircles>
      </div>
    </div>
  ),
};
