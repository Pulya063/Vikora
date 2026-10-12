import type {Estimate} from './types';

export function quotePayload(
  form: FormData,
  preferred: string,
  estimate?: Estimate | null,
  options: {includeTurnstile?: boolean; allowLocalBypass?: boolean} = {includeTurnstile: true, allowLocalBypass: false},
) {
  const text = (name: string) => {
    const value = form.get(name);
    if (value !== null && typeof value !== 'string') throw new Error('Файли не підтримуються.');
    return (value ?? '').trim();
  };
  const payload = {
    name: text('name'), phone: text('phone'), email: text('email') || null,
    city: text('city'), preferred_contact: preferred, contact_handle: text('contact_handle'),
    comment: text('comment'), needs_delivery: text('delivery') === 'on',
    needs_installation: text('installation') === 'on', consent: text('consent') === 'on',
    website: text('website'), configuration: estimate?.configuration ?? null,
    pricing_version: estimate?.pricing_version ?? null,
  };
  for (const [key, limit] of Object.entries({ name: 100, phone: 40, city: 120, contact_handle: 100, comment: 2000, email: 254, website: 0 })) {
    const value = text(key);
    if (value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ud800-\udfff]/u.test(value)) throw new Error('Перевірте текст у формі.');
  }
  if (payload.name.length < 2) throw new Error('Вкажіть ім’я щонайменше з двох символів.');
  let phone = payload.phone.replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(phone)) phone = `+38${phone}`;
  if (!/^\+380\d{9}$/.test(phone)) throw new Error('Вкажіть український номер +380XXXXXXXXX');
  payload.phone = phone;
  if (!['phone', 'Telegram', 'Viber', 'WhatsApp', 'email'].includes(preferred)) throw new Error('Оберіть спосіб зв’язку.');
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new Error('Вкажіть коректний email.');
  if (preferred === 'email' && !payload.email) throw new Error('Для зв’язку електронною поштою вкажіть email.');
  if (preferred === 'Telegram' && !payload.contact_handle) throw new Error('Для Telegram вкажіть ім’я користувача.');
  if (!payload.consent) throw new Error('Потрібна згода на обробку даних.');
  if (options.includeTurnstile === false) return payload;
  const token = text('cf-turnstile-response');
  if (!token && !options.allowLocalBypass) throw new Error('Захист форми не налаштований або ще не готовий. Оновіть сторінку.');
  return {...payload, turnstile_token: token || 'local-bypass'};
}

export function quoteFingerprint(payload:ReturnType<typeof quotePayload>):string {
  // CAPTCHA tokens are single-use and rotate on retry; they are not lead identity.
  const {turnstile_token: _token,...businessFields}=payload as ReturnType<typeof quotePayload>&{turnstile_token?:string};
  return JSON.stringify(businessFields);
}

export function requireSecureFormTransport() {
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    throw new Error('Для надсилання даних потрібне захищене HTTPS-з’єднання.');
  }
}
