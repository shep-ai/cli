import type { Meta, StoryObj } from '@storybook/react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer';
import { Button } from './button';

const meta = {
  title: 'Primitives/Drawer',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer Title</DrawerTitle>
          <DrawerDescription>
            This is a default bottom drawer with header and footer content.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-muted-foreground text-sm">Drawer body content goes here.</p>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const RightSide: Story = {
  render: () => (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Right Drawer</Button>
      </DrawerTrigger>
      <DrawerContent direction="right">
        <DrawerHeader>
          <DrawerTitle>Right Drawer</DrawerTitle>
          <DrawerDescription>
            This drawer slides in from the right side, commonly used for inspector panels.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">
            Inspector panel content. The drawer is fixed to the right edge of the viewport.
          </p>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const RightNonModal: Story = {
  render: () => (
    <Drawer direction="right" modal={false}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Non-Modal Right Drawer</Button>
      </DrawerTrigger>
      <DrawerContent direction="right">
        <DrawerHeader>
          <DrawerTitle>Non-Modal Drawer</DrawerTitle>
          <DrawerDescription>
            This drawer does not block interaction with the background. No overlay is rendered.
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">
            You can interact with elements behind this drawer while it is open.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

export const LeftSide: Story = {
  render: () => (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Left Drawer</Button>
      </DrawerTrigger>
      <DrawerContent direction="left">
        <DrawerHeader>
          <DrawerTitle>Left Drawer</DrawerTitle>
          <DrawerDescription>This drawer slides in from the left side.</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-muted-foreground text-sm">Navigation panel or sidebar content.</p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

export const TopSide: Story = {
  render: () => (
    <Drawer direction="top">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Top Drawer</Button>
      </DrawerTrigger>
      <DrawerContent direction="top">
        <DrawerHeader>
          <DrawerTitle>Top Drawer</DrawerTitle>
          <DrawerDescription>This drawer slides down from the top.</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-muted-foreground text-sm">Notification bar or alert content.</p>
        </div>
      </DrawerContent>
    </Drawer>
  ),
};

export const WithContent: Story = {
  render: () => (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Detail Panel</Button>
      </DrawerTrigger>
      <DrawerContent direction="right" className="w-96 sm:max-w-96">
        <DrawerHeader>
          <DrawerTitle>Feature Details</DrawerTitle>
          <DrawerDescription>Inspect the selected feature&apos;s properties.</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <p className="text-sm font-medium">Status</p>
            <p className="text-muted-foreground text-sm">Running</p>
          </div>
          <div>
            <p className="text-sm font-medium">Lifecycle</p>
            <p className="text-muted-foreground text-sm">Implementation</p>
          </div>
          <div>
            <p className="text-sm font-medium">Progress</p>
            <div className="bg-muted h-2 rounded-full">
              <div className="h-full w-3/4 rounded-full bg-blue-500" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Description</p>
            <p className="text-muted-foreground text-sm">
              A longer description of the feature that would be truncated on the canvas node but is
              fully visible here in the drawer panel.
            </p>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
