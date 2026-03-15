import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Slider } from './slider';

const meta: Meta<typeof Slider> = {
  title: 'UI/Slider',
  component: Slider,
};

export default meta;
type Story = StoryObj<typeof Slider>;

function SliderDemo() {
  const [value, setValue] = useState([50]);
  return (
    <div style={{ width: 300 }}>
      <Slider value={value} onValueChange={setValue} min={0} max={100} step={1} />
      <p style={{ marginTop: 8, fontSize: 12 }}>Value: {value[0]}</p>
    </div>
  );
}

export const Default: Story = {
  render: () => <SliderDemo />,
};
