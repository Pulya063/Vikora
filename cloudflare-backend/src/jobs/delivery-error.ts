/** Codes are deliberately fixed: upstream errors can contain tokens or customer data. */
export class DeliveryError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    readonly ambiguous = false,
    readonly retryAfterSeconds = 0,
  ) { super(code); }
}

export function retryDelay(attempt: number, retryAfterSeconds = 0): number {
  const backoff = Math.min(3600, 30 * 2 ** Math.min(attempt, 7));
  return Math.max(backoff + Math.floor(Math.random() * 15), Math.min(86400, retryAfterSeconds));
}

export function classifyTelegramError(error: unknown): DeliveryError {
  if (error instanceof DeliveryError) return error;
  if (error instanceof Error && error.message === 'telegram_not_configured') return new DeliveryError('telegram_not_configured', false);
  if (error && typeof error === 'object' && 'error_code' in error) {
    const status = Number(error.error_code);
    if (status === 429) {
      const parameters = 'parameters' in error ? error.parameters as { retry_after?: number } : undefined;
      return new DeliveryError('telegram_rate_limited', true, false, Number(parameters?.retry_after) || 0);
    }
    if (status >= 400 && status < 500) return new DeliveryError('telegram_rejected', false);
  }
  // Telegram has no sendMessage idempotency key or sent-message lookup. A timeout
  // (including a 5xx) may already have sent the message: require operator review.
  return new DeliveryError('telegram_ambiguous_delivery', false, true);
}
