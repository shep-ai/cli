import type { Meta } from '@storybook/react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Primitives/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

export const Single = {
  args: {
    type: 'single' as const,
    collapsible: true,
    className: 'w-[400px]',
    children: (
      <>
        <AccordionItem value="item-1">
          <AccordionTrigger>Is it accessible?</AccordionTrigger>
          <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Is it styled?</AccordionTrigger>
          <AccordionContent>
            Yes. It comes with default styles that matches the other components&apos; aesthetic.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Is it animated?</AccordionTrigger>
          <AccordionContent>
            Yes. It&apos;s animated by default, but you can disable it if you prefer.
          </AccordionContent>
        </AccordionItem>
      </>
    ),
  },
};

export const Multiple = {
  args: {
    type: 'multiple' as const,
    className: 'w-[400px]',
    children: (
      <>
        <AccordionItem value="item-1">
          <AccordionTrigger>Can I open multiple?</AccordionTrigger>
          <AccordionContent>
            Yes! This accordion allows multiple items to be open at the same time.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>How does it work?</AccordionTrigger>
          <AccordionContent>
            Just click on any trigger to toggle that section. Other sections will remain unchanged.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>What about keyboard?</AccordionTrigger>
          <AccordionContent>
            Full keyboard support is included. Use Tab to navigate and Enter/Space to toggle.
          </AccordionContent>
        </AccordionItem>
      </>
    ),
  },
};

export const DefaultOpen = {
  args: {
    type: 'single' as const,
    collapsible: true,
    defaultValue: 'item-2',
    className: 'w-[400px]',
    children: (
      <>
        <AccordionItem value="item-1">
          <AccordionTrigger>First item</AccordionTrigger>
          <AccordionContent>This is closed by default.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Second item (default open)</AccordionTrigger>
          <AccordionContent>This item is open by default when the page loads.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Third item</AccordionTrigger>
          <AccordionContent>This is also closed by default.</AccordionContent>
        </AccordionItem>
      </>
    ),
  },
};
