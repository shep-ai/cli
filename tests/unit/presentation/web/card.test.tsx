import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <div>Card content</div>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with CardHeader', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders with CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>Test description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders with CardContent', () => {
    render(
      <Card>
        <CardContent>
          <p>Content paragraph</p>
        </CardContent>
      </Card>
    );
    expect(screen.getByText('Content paragraph')).toBeInTheDocument();
  });

  it('renders with CardFooter', () => {
    render(
      <Card>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders full card composition', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Full Card</CardTitle>
          <CardDescription>This is a full card example</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content here</p>
        </CardContent>
        <CardFooter>
          <span>Footer content</span>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Full Card')).toBeInTheDocument();
    expect(screen.getByText('This is a full card example')).toBeInTheDocument();
    expect(screen.getByText('Main content here')).toBeInTheDocument();
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('supports custom className', () => {
    render(
      <Card className="custom-card" data-testid="test-card">
        <CardContent>Test content</CardContent>
      </Card>
    );
    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass('custom-card');
  });
});
