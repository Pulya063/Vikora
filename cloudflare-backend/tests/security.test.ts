import { describe, expect, it } from 'vitest';
import { timingSafeEqual } from '../src/middleware/security';

describe('security helpers', () => {
  it('compares webhook secrets without accepting prefixes or empty values', () => {
    expect(timingSafeEqual('secret-value', 'secret-value')).toBe(true);
    expect(timingSafeEqual('secret-value', 'secret')).toBe(false);
    expect(timingSafeEqual('', 'secret-value')).toBe(false);
  });
});
