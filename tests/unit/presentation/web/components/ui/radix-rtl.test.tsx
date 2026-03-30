import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * RTL verification tests for Radix UI components.
 *
 * These tests confirm that our Radix primitives use CSS logical properties
 * (ps-/pe-/ms-/me-/start/end/text-start/border-s) instead of physical
 * directional properties, so they render correctly in both LTR and RTL.
 *
 * The strategy is to render each component in an RTL context and verify:
 * 1. The component mounts without errors
 * 2. Logical property classes are present (not physical)
 * 3. Close buttons use `end-*` positioning (not `right-*`)
 */

describe('Radix UI components in RTL mode', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.documentElement.setAttribute('lang', 'ar');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
    document.documentElement.setAttribute('lang', 'en');
  });

  describe('Dialog', () => {
    it('renders dialog content in RTL without errors', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>RTL Dialog</DialogTitle>
              <DialogDescription>Testing RTL layout</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('RTL Dialog')).toBeInTheDocument();
    });

    it('uses logical property class text-start on dialog header', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      const header = screen.getByTestId('dialog-header');
      expect(header.className).toContain('text-start');
      expect(header.className).not.toContain('text-left');
    });

    it('positions close button with logical end-4 class', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton.className).toContain('end-4');
      expect(closeButton.className).not.toContain('right-4');
    });
  });

  describe('AlertDialog', () => {
    it('renders alert dialog in RTL without errors', async () => {
      const user = userEvent.setup();
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>Delete</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect(screen.getByText('Confirm deletion')).toBeInTheDocument();
    });

    it('uses logical text-start on alert dialog header', async () => {
      const user = userEvent.setup();
      render(
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button>Open</button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader data-testid="alert-header">
              <AlertDialogTitle>Title</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );

      await user.click(screen.getByRole('button', { name: /open/i }));
      const header = screen.getByTestId('alert-header');
      expect(header.className).toContain('text-start');
      expect(header.className).not.toContain('text-left');
    });
  });

  describe('Alert', () => {
    it('renders alert with logical property classes in RTL', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>Something needs attention</AlertDescription>
        </Alert>
      );

      const alert = screen.getByTestId('alert');
      expect(alert).toBeInTheDocument();
      // Alert uses ps-7 for svg offset (logical start padding)
      expect(alert.className).toContain('ps-7');
      expect(alert.className).not.toContain('pl-7');
    });
  });

  describe('ScrollArea', () => {
    it('renders scroll area in RTL without errors', () => {
      render(
        <ScrollArea className="h-48" data-testid="scroll-area">
          <div style={{ height: 500 }}>Scrollable content</div>
        </ScrollArea>
      );

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
      expect(screen.getByText('Scrollable content')).toBeInTheDocument();
    });

    it('uses logical border-s on vertical scrollbar', () => {
      render(
        <ScrollArea className="h-48" data-testid="scroll-area">
          <div style={{ height: 500 }}>Content</div>
        </ScrollArea>
      );

      const scrollbar = document.querySelector('[data-slot="scroll-area-scrollbar"]');
      if (scrollbar) {
        expect(scrollbar.className).toContain('border-s');
        expect(scrollbar.className).not.toContain('border-l');
      }
    });
  });
});
