'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/* ---------------------------------------------------------------------------
 * Context
 * ------------------------------------------------------------------------- */

interface DrawerCloseGuardContextValue {
  /** Register a drawer's dirty state and reset callback. Pass `null` to unregister. */
  setGuard: (guard: { isDirty: boolean; onReset: () => void } | null) => void;
  /** Navigate only if no dirty drawer is registered; otherwise show confirmation. */
  guardedNavigate: (navigate: () => void) => void;
}

const DrawerCloseGuardContext = createContext<DrawerCloseGuardContextValue | null>(null);

/* ---------------------------------------------------------------------------
 * Provider — renders the shared confirmation dialog
 * ------------------------------------------------------------------------- */

export function DrawerCloseGuardProvider({ children }: { children: ReactNode }) {
  // Use a ref so guard updates (on every keystroke) don't re-render the provider tree.
  const guardRef = useRef<{ isDirty: boolean; onReset: () => void } | null>(null);
  const pendingNavigateRef = useRef<(() => void) | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const setGuard = useCallback((guard: { isDirty: boolean; onReset: () => void } | null) => {
    guardRef.current = guard;
  }, []);

  const guardedNavigate = useCallback((navigate: () => void) => {
    if (guardRef.current?.isDirty) {
      pendingNavigateRef.current = navigate;
      setShowConfirmation(true);
      return;
    }
    navigate();
  }, []);

  const confirmDiscard = useCallback(() => {
    setShowConfirmation(false);
    guardRef.current?.onReset();
    guardRef.current = null;
    pendingNavigateRef.current?.();
    pendingNavigateRef.current = null;
  }, []);

  const cancelDiscard = useCallback(() => {
    setShowConfirmation(false);
    pendingNavigateRef.current = null;
  }, []);

  return (
    <DrawerCloseGuardContext value={{ setGuard, guardedNavigate }}>
      {children}

      <AlertDialog open={showConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="destructive" onClick={confirmDiscard}>
              Discard
            </AlertDialogAction>
            <AlertDialogCancel onClick={cancelDiscard}>Keep editing</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DrawerCloseGuardContext>
  );
}

/* ---------------------------------------------------------------------------
 * Hook — access the guard from any child component
 * ------------------------------------------------------------------------- */

export function useDrawerCloseGuard() {
  const ctx = useContext(DrawerCloseGuardContext);
  if (!ctx) throw new Error('useDrawerCloseGuard must be used within DrawerCloseGuardProvider');
  return ctx;
}

/* ---------------------------------------------------------------------------
 * Convenience hook for drawer components
 *
 * Registers dirty state + reset callback with the guard, and returns an
 * `attemptClose` function that goes through the guard before closing.
 * ------------------------------------------------------------------------- */

export function useGuardedDrawerClose({
  open,
  isDirty,
  onClose,
  onReset,
}: {
  open: boolean;
  isDirty: boolean;
  onClose: () => void;
  onReset: () => void;
}) {
  const { setGuard, guardedNavigate } = useDrawerCloseGuard();

  // Keep the guard in sync with dirty state. Because setGuard writes to a ref,
  // this doesn't trigger re-renders in the provider.
  useEffect(() => {
    if (open) {
      setGuard({ isDirty, onReset });
    } else {
      setGuard(null);
    }
    return () => setGuard(null);
  }, [open, isDirty, onReset, setGuard]);

  const attemptClose = useCallback(() => {
    guardedNavigate(() => {
      onReset();
      onClose();
    });
  }, [guardedNavigate, onClose, onReset]);

  return { attemptClose };
}
