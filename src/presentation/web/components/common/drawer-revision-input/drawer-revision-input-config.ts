export interface DrawerRevisionInputProps {
  /** Callback when user submits revision text */
  onSubmit: (text: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Accessible label for the input */
  ariaLabel?: string;
  /** Whether the input should be disabled */
  disabled?: boolean;
}
