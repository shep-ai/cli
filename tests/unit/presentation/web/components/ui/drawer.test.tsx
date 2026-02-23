import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Drawer, DrawerOverlay, DrawerContent } from '@/components/ui/drawer';

describe('DrawerOverlay', () => {
  it('includes pointer-events-none class', () => {
    const { container } = render(
      <Drawer open>
        <DrawerOverlay />
      </Drawer>
    );
    const overlay = container.ownerDocument.querySelector('[data-slot="drawer-overlay"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('preserves consumer className override', () => {
    const { container } = render(
      <Drawer open>
        <DrawerOverlay className="custom-overlay" />
      </Drawer>
    );
    const overlay = container.ownerDocument.querySelector('[data-slot="drawer-overlay"]');
    expect(overlay).toHaveClass('pointer-events-none');
    expect(overlay).toHaveClass('custom-overlay');
  });
});

describe('DrawerContent', () => {
  it('includes pointer-events-auto class', () => {
    const { container } = render(
      <Drawer open>
        <DrawerContent>
          <p>Content</p>
        </DrawerContent>
      </Drawer>
    );
    const content = container.ownerDocument.querySelector('[data-slot="drawer-content"]');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('pointer-events-auto');
  });

  it('preserves consumer className override', () => {
    const { container } = render(
      <Drawer open>
        <DrawerContent className="custom-content">
          <p>Content</p>
        </DrawerContent>
      </Drawer>
    );
    const content = container.ownerDocument.querySelector('[data-slot="drawer-content"]');
    expect(content).toHaveClass('pointer-events-auto');
    expect(content).toHaveClass('custom-content');
  });
});
