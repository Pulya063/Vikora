import type {Estimate} from './types';

export function quotePayload(form: FormData, preferred: string, estimate?: Estimate | null) {
  const text = (name: string) => {
    const value = form.get(name);
    if (value !== null && typeof value !== 'string') throw new Error('Файли не підтримуються.');
    return value ?? '';
  };
  return {
    name: text('name'), phone: text('phone'), email: text('email') || null,
    city: text('city'), preferred_contact: preferred, contact_handle: text('contact_handle'),
    comment: text('comment'), needs_delivery: text('delivery') === 'on',
    needs_installation: text('installation') === 'on', consent: text('consent') === 'on',
    website: text('website'), configuration: estimate?.configuration ?? null,
    pricing_version: estimate?.pricing_version ?? null,
  };
}

export function requireSecureFormTransport() {
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    throw new Error('Для надсилання даних потрібне захищене HTTPS-з’єднання.');
  }
}
