import type { InputHTMLAttributes } from 'react';
import VoiceInputButton from './VoiceInputButton';

interface VoiceTextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChangeText: (value: string) => void;
  voiceTransform?: (value: string) => string;
  wrapperClassName?: string;
  voiceLabel?: string;
}

export default function VoiceTextInput({
  value,
  onChangeText,
  voiceTransform,
  wrapperClassName = '',
  voiceLabel,
  className = '',
  ...inputProps
}: VoiceTextInputProps) {
  const applyVoiceText = (text: string) => {
    const next = voiceTransform ? voiceTransform(text) : text;
    onChangeText(next);
  };

  return (
    <div className={`flex items-center gap-3 ${wrapperClassName}`}>
      <input
        {...inputProps}
        value={value}
        onChange={(event) => onChangeText(event.target.value)}
        className={`flex-1 min-w-0 ${className}`}
      />
      <VoiceInputButton onResult={applyVoiceText} label={voiceLabel} />
    </div>
  );
}
