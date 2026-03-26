import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { InteractionBubble } from './InteractionBubble';
import type { InteractionData } from './InteractionBubble';

const meta = {
  title: 'Features/Chat/InteractionBubble',
  component: InteractionBubble,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="bg-background mx-auto max-w-xl rounded-lg border p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InteractionBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

const colorInteraction: InteractionData = {
  toolCallId: 'toolu_color_1',
  questions: [
    {
      question: 'What is your favorite color?',
      header: 'Color',
      multiSelect: false,
      options: [
        { label: 'Red', description: 'The color red' },
        { label: 'Blue', description: 'The color blue' },
        { label: 'Green', description: 'The color green' },
        { label: 'Yellow', description: 'The color yellow' },
      ],
    },
  ],
};

const multiSelectInteraction: InteractionData = {
  toolCallId: 'toolu_features_1',
  questions: [
    {
      question: 'Which features do you want to enable?',
      header: 'Features',
      multiSelect: true,
      options: [
        { label: 'Dark mode', description: 'Enable dark theme support' },
        { label: 'Notifications', description: 'Push notifications for updates' },
        { label: 'Analytics', description: 'Usage analytics and reporting' },
      ],
    },
  ],
};

const multiQuestionInteraction: InteractionData = {
  toolCallId: 'toolu_setup_1',
  questions: [
    {
      question: "What's your preferred coding environment?",
      header: 'IDE',
      multiSelect: false,
      options: [
        { label: 'VS Code', description: "Microsoft's popular editor with rich extension ecosystem." },
        { label: 'Neovim', description: 'Terminal-based, highly customizable.' },
        { label: 'JetBrains', description: 'Full-featured IDEs with deep language intelligence.' },
        { label: 'Cursor', description: 'AI-first fork of VS Code.' },
      ],
    },
    {
      question: 'Which of these technologies do you actively use? (pick all that apply)',
      header: 'Tech Stack',
      multiSelect: true,
      options: [
        { label: 'TypeScript', description: 'Statically typed JavaScript.' },
        { label: 'Python', description: 'Scripting, data science, ML, or backend.' },
        { label: 'Go', description: 'Fast, compiled, cloud-native tooling.' },
        { label: 'Rust', description: 'Systems programming with memory safety.' },
      ],
    },
    {
      question: 'How would you describe your experience level?',
      header: 'Level',
      multiSelect: false,
      options: [
        { label: 'Junior', description: 'Less than 2 years of experience.' },
        { label: 'Mid-level', description: '2-5 years of experience.' },
        { label: 'Senior', description: '5+ years of experience.' },
      ],
    },
  ],
};

// ── Interactive wrapper ─────────────────────────────────────────────────

function InteractiveBubble({ interaction }: { interaction: InteractionData }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return <p className="text-muted-foreground px-4 text-xs">Submitted!</p>;
  return (
    <InteractionBubble
      interaction={interaction}
      onSubmit={() => setSubmitted(true)}
    />
  );
}

const noop = (): void => undefined;

export const SingleSelect: Story = {
  args: { interaction: colorInteraction, onSubmit: noop },
  render: () => <InteractiveBubble interaction={colorInteraction} />,
};

export const MultiSelect: Story = {
  args: { interaction: multiSelectInteraction, onSubmit: noop },
  render: () => <InteractiveBubble interaction={multiSelectInteraction} />,
};

export const TabbedMultiQuestion: Story = {
  args: { interaction: multiQuestionInteraction, onSubmit: noop },
  render: () => <InteractiveBubble interaction={multiQuestionInteraction} />,
};

export const Submitted: Story = {
  args: { interaction: colorInteraction, onSubmit: noop },
  render: () => <InteractiveBubble interaction={colorInteraction} />,
};
