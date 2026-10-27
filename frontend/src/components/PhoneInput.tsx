'use client';
import { useCallback, useRef, useState } from 'react';

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function formatSuffix(digits: string): string {
  // Format up to 9 digits as "XX XXX XX XX"
  const d = digits.slice(0, 9);
  let out = '';
  for (let i = 0; i < d.length; i++) {
    if (i === 2 || i === 5 || i === 7) out += ' ';
    out += d[i];
  }
  return out;
}

export default function PhoneInput({ id }: { id?: string }) {
  const [suffix, setSuffix] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const rawDigits = digitsOnly(suffix);
  // Value submitted to backend — backend strips [\s()-] so spaces are fine,
  // but send compact form to be explicit
  const hiddenValue = rawDigits.length > 0 ? `+380${rawDigits}` : '';

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Handle autocomplete / paste of full number forms:
    // "+380XXXXXXXXX", "380XXXXXXXXX", "0XXXXXXXXX", or just 9 digits
    let digits: string;
    if (raw.startsWith('+380')) {
      digits = digitsOnly(raw.slice(4));
    } else if (raw.startsWith('380')) {
      digits = digitsOnly(raw.slice(3));
    } else if (raw.startsWith('0')) {
      digits = digitsOnly(raw.slice(1));
    } else {
      digits = digitsOnly(raw);
    }
    setSuffix(formatSuffix(digits));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block non-digit keys except navigation/control
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
    }
  }, []);

  return (
    <div className="phone-wrap">
      <span className="phone-prefix" aria-hidden="true">+380</span>
      <input
        ref={inputRef}
        id={id}
        type="tel"
        autoComplete="tel"
        inputMode="numeric"
        value={suffix}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="XX XXX XX XX"
        maxLength={11} // "XX XXX XX XX" = 11 chars
        aria-label="Номер телефону (після +380)"
        required
        pattern="\d{2} \d{3} \d{2} \d{2}"
        title="Введіть 9 цифр після +380"
      />
      <input
        type="hidden"
        name="phone"
        value={hiddenValue}
      />
    </div>
  );
}
