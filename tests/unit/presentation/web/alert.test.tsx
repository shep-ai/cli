import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

describe('Alert', () => {
  it('renders with default variant', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('renders with destructive variant', () => {
    render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders with description', () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description text here</AlertDescription>
      </Alert>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description text here')).toBeInTheDocument();
  });

  it('supports custom className', () => {
    render(
      <Alert className="custom-alert">
        <AlertTitle>Custom</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('alert')).toHaveClass('custom-alert');
  });
});
