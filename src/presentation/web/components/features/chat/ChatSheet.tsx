'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageSquare, X, Bot, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChatTab } from './ChatTab';
import { ChatDotIndicator } from './ChatDotIndicator';
import { useTurnStatus } from '@/hooks/turn-statuses-provider';

// ── Persistent global chat popup (draggable + resizable) ──────────────────

const DEFAULT_W = 520;
const DEFAULT_H_VH = 70; // percentage of viewport height
const MIN_W = 360;
const MIN_H = 300;

interface Position {
  x: number;
  y: number;
}

interface Size {
  w: number;
  h: number;
}

const STORAGE_KEY = 'shep-global-chat';

function loadPersistedState(): { pos: Position | null; size: Size | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pos: null, size: null };
    const parsed = JSON.parse(raw);
    return {
      pos: parsed.pos ?? null,
      size: parsed.size ?? null,
    };
  } catch {
    return { pos: null, size: null };
  }
}

function persistState(pos: Position | null, size: Size | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pos, size }));
  } catch {
    // Storage full or unavailable — ignore
  }
}

export function GlobalChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const globalChatTurnStatus = useTurnStatus('global');

  // Position/size — initialized from localStorage
  // eslint-disable-next-line react/hook-use-state -- wrapped setters below
  const [pos, setPosRaw] = useState<Position | null>(() => loadPersistedState().pos);
  // eslint-disable-next-line react/hook-use-state -- wrapped setters below
  const [size, setSizeRaw] = useState<Size | null>(() => loadPersistedState().size);

  // Wrapped setters that also persist
  const setPos = useCallback(
    (v: Position | null | ((prev: Position | null) => Position | null)) => {
      setPosRaw((prev) => {
        const next = typeof v === 'function' ? v(prev) : v;
        // Defer persist to avoid doing it on every mousemove frame
        return next;
      });
    },
    []
  );

  const setSize = useCallback((v: Size | null | ((prev: Size | null) => Size | null)) => {
    setSizeRaw((prev) => {
      const next = typeof v === 'function' ? v(prev) : v;
      return next;
    });
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setHasOpened(true);
      return !prev;
    });
  }, []);

  // Store pre-maximize pos/size so we can restore
  const preMaxRef = useRef<{ pos: Position | null; size: Size | null }>({ pos: null, size: null });

  const toggleMaximize = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      setHasOpened(true);
    }
    setIsMaximized((prev) => {
      if (!prev) {
        // Entering maximize — save current state
        preMaxRef.current = { pos, size };
      } else {
        // Leaving maximize — restore previous state
        setPos(preMaxRef.current.pos);
        setSize(preMaxRef.current.size);
      }
      return !prev;
    });
  }, [isOpen, pos, size, setPos, setSize]);

  // Keyboard shortcuts: Cmd/Ctrl+Shift+K = toggle, Cmd/Ctrl+Shift+M = maximize
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (isMaximized) setIsMaximized(false);
        toggle();
        // Focus the composer input after panel opens
        requestAnimationFrame(() => {
          setTimeout(() => {
            const input = panelRef.current?.querySelector<HTMLTextAreaElement>('textarea');
            input?.focus();
          }, 100);
        });
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        toggleMaximize();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggle, toggleMaximize, isMaximized]);

  // Persist position/size to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => persistState(pos, size), 300);
    return () => clearTimeout(timer);
  }, [pos, size]);

  // ── Drag handling ──────────────────────────────────────────────────────
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const panel = panelRef.current;
      if (!panel) return;

      // If no custom position yet, compute from current DOM position
      const rect = panel.getBoundingClientRect();
      const currentX = pos?.x ?? rect.left;
      const currentY = pos?.y ?? rect.top;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosX: currentX,
        startPosY: currentY,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        setPos({
          x: dragRef.current.startPosX + dx,
          y: dragRef.current.startPosY + dy,
        });
      };

      const onUp = () => {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [pos, setPos]
  );

  // ── Resize handling (from top-right corner) ────────────────────────────
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = panelRef.current;
      if (!panel) return;

      const rect = panel.getBoundingClientRect();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: size?.w ?? rect.width,
        startH: size?.h ?? rect.height,
      };

      // Also capture position if not set yet
      if (!pos) {
        setPos({ x: rect.left, y: rect.top });
      }

      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const dx = ev.clientX - resizeRef.current.startX;
        const dy = ev.clientY - resizeRef.current.startY;
        setSize({
          w: Math.max(MIN_W, resizeRef.current.startW + dx),
          h: Math.max(MIN_H, resizeRef.current.startH - dy),
        });
        // Move top edge up as height increases
        if (pos) {
          setPos((prev) => (prev ? { ...prev, y: (prev.y ?? 0) + dy } : prev));
        }
      };

      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [size, pos, setPos, setSize]
  );

  // Reset position/size on close for clean reopen
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsMaximized(false);
  }, []);

  // Compute panel style — maximized overrides everything
  const panelStyle: React.CSSProperties = isMaximized
    ? {}
    : pos
      ? {
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: size?.w ?? DEFAULT_W,
          height: size?.h ?? `${DEFAULT_H_VH}vh`,
        }
      : {
          width: size?.w ?? DEFAULT_W,
          height: size?.h ?? `${DEFAULT_H_VH}vh`,
        };

  return (
    <>
      {/* Chat panel */}
      {hasOpened ? (
        <div
          ref={panelRef}
          className={cn(
            isMaximized
              ? 'bg-background absolute inset-0 z-30 flex flex-col overflow-hidden dark:bg-neutral-900'
              : cn(
                  !pos && 'absolute bottom-24 left-4',
                  'z-30 flex flex-col overflow-hidden rounded-lg',
                  'border-border/60 border dark:border-white/10',
                  'bg-background dark:bg-neutral-900',
                  'shadow-[0_8px_40px_-8px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]'
                ),
            'transition-opacity duration-300 ease-out',
            isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          )}
          style={panelStyle}
        >
          {/* Violet accent strip at top */}
          {!isMaximized ? (
            <div className="h-[2px] shrink-0 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          ) : null}

          {/* Resize handle — top-right corner (hidden when maximized) */}
          {!isMaximized ? (
            <div
              onMouseDown={onResizeStart}
              className="absolute top-0 right-0 z-10 h-4 w-4 cursor-ne-resize"
            />
          ) : null}

          {/* Header — draggable when not maximized */}
          <div
            onMouseDown={isMaximized ? undefined : onDragStart}
            className={cn(
              'relative flex h-11 shrink-0 items-center gap-2.5 border-b border-black/[0.06] px-3.5 dark:border-white/[0.06]',
              !isMaximized && 'cursor-grab active:cursor-grabbing'
            )}
          >
            <div className="from-foreground/[0.02] to-foreground/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-r via-transparent" />
            {!isMaximized ? (
              <GripVertical className="text-foreground/15 relative h-3.5 w-3.5 shrink-0" />
            ) : null}
            <div className="relative flex h-5 w-5 items-center justify-center">
              <Bot className="text-foreground/50 h-4 w-4" />
            </div>
            <div className="relative flex items-baseline gap-2">
              <span className="text-foreground/90 text-base font-bold tracking-tight">Shep</span>
              <span className="text-foreground/30 text-xs font-medium tracking-widest uppercase">
                global
              </span>
            </div>
            <div className="relative ml-auto flex items-center gap-0.5">
              <button
                type="button"
                onClick={toggleMaximize}
                className="text-foreground/30 hover:text-foreground/60 rounded-md p-1 transition-colors"
                title={isMaximized ? 'Restore (⌘⇧M)' : 'Maximize (⌘⇧M)'}
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-foreground/30 hover:text-foreground/60 rounded-md p-1 transition-colors"
                title="Close (⌘⇧K)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Chat content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatTab featureId="global" />
          </div>

          {/* Resize handle — bottom-right corner (hidden when maximized) */}
          {!isMaximized ? (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const panel = panelRef.current;
                if (!panel) return;
                const rect = panel.getBoundingClientRect();
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = size?.w ?? rect.width;
                const startH = size?.h ?? rect.height;
                if (!pos) setPos({ x: rect.left, y: rect.top });

                const onMove = (ev: MouseEvent) => {
                  setSize({
                    w: Math.max(MIN_W, startW + (ev.clientX - startX)),
                    h: Math.max(MIN_H, startH + (ev.clientY - startY)),
                  });
                };
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
              className="absolute right-0 bottom-0 z-10 h-4 w-4 cursor-se-resize"
            />
          ) : null}
        </div>
      ) : null}

      {/* Floating chat button — hidden when maximized */}
      <div
        className={cn(
          'group/fab absolute bottom-4 left-4 z-30 flex items-center',
          isMaximized && 'hidden'
        )}
      >
        <Button
          size="icon"
          onClick={toggle}
          className={cn(
            'relative h-14 w-14 rounded-full shadow-lg',
            'transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95',
            isOpen
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-violet-500 text-white hover:bg-violet-400 dark:bg-violet-500 dark:hover:bg-violet-400'
          )}
        >
          <MessageSquare
            className={cn(
              'absolute h-7 w-7 stroke-[2.5] transition-all duration-200',
              isOpen ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
            )}
          />
          <X
            className={cn(
              'absolute h-6 w-6 stroke-[2.5] transition-all duration-200',
              isOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
            )}
          />
          {!isOpen && <ChatDotIndicator status={globalChatTurnStatus} className="top-0 right-0" />}
        </Button>
        {/* Tooltip — slides in from left on hover */}
        <div className="pointer-events-none ml-3 flex translate-x-[-4px] items-center gap-2 opacity-0 transition-all duration-200 group-hover/fab:translate-x-0 group-hover/fab:opacity-100">
          <div className="bg-foreground rounded-lg px-3 py-1.5 shadow-lg">
            <p className="text-background text-xs font-medium">Shep Chat</p>
            <p className="text-background/50 mt-0.5 flex items-center gap-1 text-[10px]">
              <kbd className="bg-background/15 rounded px-1 py-px font-mono">⌘</kbd>
              <kbd className="bg-background/15 rounded px-1 py-px font-mono">⇧</kbd>
              <kbd className="bg-background/15 rounded px-1 py-px font-mono">K</kbd>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
