'use client';
import { useCallback, useRef, useState } from 'react';

const PREFIX = '+380';

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function formatDisplay(suffix: string): string {
  const d = suffix.slice(0, 9);
  if (!d) return PREFIX;
  let out = PREFIX + ' ';
  for (let i = 0; i < d.length; i++) {
    if (i === 2 || i === 5 || i === 7) out += ' ';
    out += d[i];
  }
  return out;
}

export default function PhoneInput({ id }: { id?: string }) {
  const [suffix, setSuffix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = formatDisplay(suffix);
  const hiddenValue = suffix.length > 0 ? `+380${suffix}` : '';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const allDigits = digitsOnly(raw);
    // The prefix "380" is always at the start — extract suffix after it
    let newSuffix: string;
    if (allDigits.startsWith('380')) {
      newSuffix = allDigits.slice(3, 12);
    } else {
      // Prefix was partially deleted — keep only what digits remain as suffix
      newSuffix = allDigits.slice(0, 9);
    }
    setSuffix(newSuffix);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;
    const { selectionStart, selectionEnd, value } = input;

    // Block Backspace/Delete if it would remove part of the "+380" prefix
    if (e.key === 'Backspace') {
      const atMinimum = value === PREFIX || value === PREFIX + ' ';
      const cursorAtPrefix = selectionStart !== null && selectionStart <= PREFIX.length && selectionStart === selectionEnd;
      if (atMinimum || cursorAtPrefix) {
        e.preventDefault();
        return;
      }
    }
    if (e.key === 'Delete') {
      if (selectionStart !== null && selectionStart < PREFIX.length) {
        e.preventDefault();
        return;
      }
    }

    // Block non-digit, non-control keys
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }, []);

  const handleFocus = useCallback(() => {
    // Move cursor to end of value on focus
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input) input.setSelectionRange(input.value.length, input.value.length);
    });
  }, []);

  const handleClick = useCallback(() => {
    // If click lands inside the "+380" prefix, nudge cursor to just after it
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input && input.selectionStart !== null && input.selectionStart < PREFIX.length) {
        input.setSelectionRange(PREFIX.length, PREFIX.length);
      }
    });
  }, []);

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="tel"
        autoComplete="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onClick={handleClick}
        placeholder="+380 XX XXX XX XX"
        maxLength={17}
        aria-label="Номер телефону"
        pattern="\+380 \d{2} \d{3} \d{2} \d{2}"
        title="Введіть 9 цифр після +380"
      />
      <input type="hidden" name="phone" value={hiddenValue} />
    </>
  );
}
