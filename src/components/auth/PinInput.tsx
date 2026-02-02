import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function PinInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;
    
    // Only allow digits
    if (digit && !/^\d$/.test(digit)) return;

    const newValue = value.split('');
    newValue[index] = digit;
    const updatedPin = newValue.join('').slice(0, length);
    onChange(updatedPin);

    // Move to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (updatedPin.length === length && onComplete) {
      onComplete(updatedPin);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (value[index]) {
        // Clear current digit
        handleChange(index, '');
      } else if (index > 0) {
        // Move to previous and clear
        inputRefs.current[index - 1]?.focus();
        handleChange(index - 1, '');
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);
    
    if (pastedData.length === length && onComplete) {
      onComplete(pastedData);
    }
    
    // Focus last filled or next empty
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          disabled={disabled}
          className={cn(
            "w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 bg-background",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "transition-all duration-150",
            error 
              ? "border-destructive text-destructive animate-shake" 
              : "border-input",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={`PIN digit ${index + 1}`}
        />
      ))}
    </div>
  );
}

// Numeric keypad for touch devices
interface NumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function NumericKeypad({
  onDigit,
  onBackspace,
  onClear,
  disabled = false
}: NumericKeypadProps) {
  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {digits.map(digit => (
        <button
          key={digit}
          type="button"
          onClick={() => onDigit(digit)}
          disabled={disabled}
          className={cn(
            "h-14 text-2xl font-semibold rounded-lg",
            "bg-muted hover:bg-accent active:scale-95",
            "transition-all duration-100",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {digit}
        </button>
      ))}
      
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className={cn(
            "h-14 text-sm font-medium rounded-lg",
            "bg-muted hover:bg-accent active:scale-95",
            "transition-all duration-100",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          Clear
        </button>
      ) : (
        <div />
      )}
      
      <button
        type="button"
        onClick={() => onDigit('0')}
        disabled={disabled}
        className={cn(
          "h-14 text-2xl font-semibold rounded-lg",
          "bg-muted hover:bg-accent active:scale-95",
          "transition-all duration-100",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        0
      </button>
      
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        className={cn(
          "h-14 text-xl font-medium rounded-lg",
          "bg-muted hover:bg-accent active:scale-95",
          "transition-all duration-100",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Backspace"
      >
        ⌫
      </button>
    </div>
  );
}
