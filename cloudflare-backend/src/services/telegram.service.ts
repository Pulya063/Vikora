import { Bot, Context, InlineKeyboard } from 'grammy';
import { contactKeySchema, contactSessionSchema, contactValueSchemas, parsePriceValue, priceSessionSchema } from '../bot/validation';
import { advanceSession, allPrices, changeContact, changePrice, contactRows, getSession, isAdmin, priceById, resetLeadDeliveries, saveSession, systemStatus } from '../db/repositories/admin.repository';
import { recentLeads, updateLeadStatus } from '../db/repositories/leads.repository';
import type { Env } from '../types/env';

const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'SPAM'] as const;

function dashboard() {
  return new InlineKeyboard().text('Ціни', 'menu:prices').text('Контакти', 'menu:contacts').row()
    .text('Заявки', 'menu:leads').text('Статус', 'menu:status');
}

function parseData(session: { data_json: string }): Record<string, unknown> {
  try { return JSON.parse(session.data_json) as Record<string, unknown>; } catch { return {}; }
}

export function createAdminBot(env: Env): Bot {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('telegram_not_configured');
  const [botId, username] = [env.TELEGRAM_BOT_TOKEN.split(':', 1)[0], env.TELEGRAM_BOT_USERNAME];
  if (!botId || !/^\d+$/.test(botId) || !username || !/^[A-Za-z0-9_]{5,32}$/.test(username)) throw new Error('telegram_bot_identity_not_configured');
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
    botInfo: {
      id: Number(botId), is_bot: true, first_name: 'VIKORA Admin', username,
      can_join_groups: false, can_read_all_group_messages: false, supports_inline_queries: false,
      can_connect_to_business: false, has_main_web_app: false, has_topics_enabled: false,
      allows_users_to_create_topics: false, can_manage_bots: false, supports_join_request_queries: false,
    },
    client: { timeoutSeconds: 15, fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init) },
  });
  bot.catch(({ error }) => { throw error; });
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== 'private' || !ctx.from || ctx.chat.id !== ctx.from.id || !await isAdmin(env.DB, ctx.from.id)) {
      return;
    }
    await next();
  });

  const showPrices = async (ctx: Context) => {
    const rows = await allPrices(env.DB);
    const keyboard = new InlineKeyboard();
    rows.forEach((row, index) => { keyboard.text(`${row.label}: ${row.value_micros / 1_000_000}`, `price:${row.id}`); if (index % 2 === 1) keyboard.row(); });
    await ctx.reply('Оберіть ціну для зміни:', { reply_markup: keyboard });
  };
  const showContacts = async (ctx: Context) => {
    const rows = await contactRows(env.DB);
    const keyboard = new InlineKeyboard();
    rows.forEach((row) => keyboard.text(`${row.key}: ${row.value ?? '—'}`, `contact:${row.key}`).row());
    await ctx.reply('Оберіть контакт:', { reply_markup: keyboard });
  };
  const showLeads = async (ctx: Context) => {
    const leads = await recentLeads(env.DB, 10);
    if (!leads.length) { await ctx.reply('Заявок ще немає.'); return; }
    const keyboard = new InlineKeyboard();
    leads.forEach((lead) => keyboard.text(`${lead.public_id} · ${lead.status}`, `lead:${lead.id}`).row());
    await ctx.reply(leads.map((lead) => `${lead.public_id} · ${lead.name} · ${lead.phone} · ${lead.status}`).join('\n'), { reply_markup: keyboard });
  };
  const showStatus = async (ctx: Context) => {
    const status = await systemStatus(env.DB);
    await ctx.reply(`Worker: OK\nOutbox pending: ${status.pending ?? 0}\nFailed: ${status.failed ?? 0}\nDead: ${status.dead ?? 0}`);
  };

  bot.command('start', async (ctx) => {
    await saveSession(env.DB, ctx.from!.id, 'menu', {});
    await ctx.reply('VIKORA admin dashboard', { reply_markup: dashboard() });
  });
  bot.command('prices', async (ctx) => { await saveSession(env.DB, ctx.from!.id, 'menu', {}); await showPrices(ctx); });
  bot.command('contacts', async (ctx) => { await saveSession(env.DB, ctx.from!.id, 'menu', {}); await showContacts(ctx); });
  bot.command('leads', async (ctx) => { await saveSession(env.DB, ctx.from!.id, 'menu', {}); await showLeads(ctx); });
  bot.command('status', async (ctx) => { await saveSession(env.DB, ctx.from!.id, 'menu', {}); await showStatus(ctx); });
  bot.command('cancel', async (ctx) => { await saveSession(env.DB, ctx.from!.id, 'menu', {}); await ctx.reply('Дію скасовано.', { reply_markup: dashboard() }); });
  bot.callbackQuery('menu:prices', async (ctx) => { await saveSession(env.DB, ctx.from.id, 'menu', {}); await showPrices(ctx); await ctx.answerCallbackQuery(); });
  bot.callbackQuery('menu:contacts', async (ctx) => { await saveSession(env.DB, ctx.from.id, 'menu', {}); await showContacts(ctx); await ctx.answerCallbackQuery(); });
  bot.callbackQuery('menu:leads', async (ctx) => { await saveSession(env.DB, ctx.from.id, 'menu', {}); await showLeads(ctx); await ctx.answerCallbackQuery(); });
  bot.callbackQuery('menu:status', async (ctx) => { await saveSession(env.DB, ctx.from.id, 'menu', {}); await showStatus(ctx); await ctx.answerCallbackQuery(); });

  bot.callbackQuery(/^price:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    if (!Number.isSafeInteger(id) || id < 1) { await ctx.answerCallbackQuery('Некоректна ціна'); return; }
    const row = await priceById(env.DB, id);
    if (!row) { await ctx.answerCallbackQuery('Ціну не знайдено'); return; }
    const nonce = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
    await saveSession(env.DB, ctx.from.id, 'price_value', { id, version: row.version, old: row.value_micros }, nonce);
    await ctx.reply(`Нове значення для «${row.label}» (зараз ${row.value_micros / 1_000_000}):`);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^contact:(phone|email|address|telegram|viber)$/, async (ctx) => {
    const key = ctx.match[1];
    const row = (await contactRows(env.DB)).find((item) => item.key === key);
    if (!row) { await ctx.answerCallbackQuery('Контакт не знайдено'); return; }
    const nonce = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
    await saveSession(env.DB, ctx.from.id, 'contact_value', { key, version: row.version, old: row.value }, nonce);
    await ctx.reply(`Нове значення для «${key}»${key === 'address' ? ' або — для очищення' : ''}:`);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^lead:([0-9a-f-]{36})$/, async (ctx) => {
    const leadId = ctx.match[1];
    const lead = await env.DB.prepare('SELECT id FROM leads WHERE id=?').bind(leadId).first();
    if (!lead) { await ctx.answerCallbackQuery('Заявку не знайдено'); return; }
    const keyboard = new InlineKeyboard();
    leadStatuses.forEach((status) => keyboard.text(status, `leadstatus:${status}:${leadId}`).row());
    keyboard.text('Повторити CRM sync', `retry:${leadId}`);
    await ctx.reply('Оберіть статус або повтор доставки:', { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^leadstatus:(NEW|CONTACTED|QUALIFIED|CLOSED|SPAM):([0-9a-f-]{36})$/, async (ctx) => {
    const changed = await updateLeadStatus(env.DB, ctx.match[2]!, ctx.match[1]!, String(ctx.from.id));
    await ctx.answerCallbackQuery(changed ? 'Статус оновлено' : 'Заявку не знайдено');
  });

  bot.callbackQuery(/^retry:([0-9a-f-]{36})$/, async (ctx) => {
    const count = await resetLeadDeliveries(env.DB, ctx.match[1]!, ctx.from.id);
    await ctx.answerCallbackQuery(count ? 'Доставку заплановано повторно' : 'Немає безпечних повторів. Неоднозначні доставки потребують перевірки.');
  });

  bot.callbackQuery(/^confirm:(price|contact):([0-9a-f]{12})$/, async (ctx) => {
    const session = await getSession(env.DB, ctx.from.id);
    if (session.nonce !== ctx.match[2] || session.state !== `${ctx.match[1]}_confirm`) { await ctx.answerCallbackQuery('Підтвердження застаріло'); return; }
    const data = parseData(session);
    let changed = false;
    if (ctx.match[1] === 'price') {
      const parsed = priceSessionSchema.safeParse(data);
      if (parsed.success && parsed.data.valueMicros !== undefined) changed = await changePrice(env.DB, parsed.data.id, parsed.data.valueMicros, parsed.data.version, ctx.from.id, ctx.match[2]!);
    } else {
      const parsed = contactSessionSchema.safeParse(data);
      if (parsed.success && parsed.data.value !== undefined) changed = await changeContact(env.DB, parsed.data.key, parsed.data.value, parsed.data.version, ctx.from.id, ctx.match[2]!);
    }
    await ctx.editMessageReplyMarkup();
    await ctx.reply(changed ? 'Зміну збережено й записано в аудит.' : 'Дані вже змінилися. Відкрийте список повторно.', { reply_markup: dashboard() });
    await ctx.answerCallbackQuery();
  });

  bot.on('message:text', async (ctx) => {
    const session = await getSession(env.DB, ctx.from.id);
    const data = parseData(session);
    if (session.state === 'price_value') {
      const sessionData = priceSessionSchema.safeParse(data);
      if (!sessionData.success) { await ctx.reply('Ця дія застаріла. Відкрийте ціну повторно.'); return; }
      const current = await priceById(env.DB, sessionData.data.id);
      if (!current) { await ctx.reply('Ціну не знайдено.'); return; }
      const isCoefficient = current && ['construction', 'profile', 'glass'].includes(current.category);
      const valueMicros = parsePriceValue(ctx.message.text, isCoefficient);
      if (valueMicros === null) { await ctx.reply('Введіть десяткове число в допустимих межах (до 6 знаків після коми).'); return; }
      if (!await advanceSession(env.DB, ctx.from.id, 'price_value', 'price_confirm', { ...data, valueMicros }, session.nonce)) {
        await ctx.reply('Ця дія застаріла. Відкрийте ціну повторно.'); return;
      }
      await ctx.reply(`Підтвердити зміну на ${valueMicros / 1_000_000}?`, { reply_markup: new InlineKeyboard().text('Підтвердити', `confirm:price:${session.nonce}`).text('Скасувати', 'menu:prices') });
      return;
    }
    if (session.state === 'contact_value') {
      const parsedKey = contactKeySchema.safeParse(data.key);
      if (!parsedKey.success) { await ctx.reply('Контакт не знайдено.'); return; }
      const key = parsedKey.data;
      const candidate = key === 'address' && ctx.message.text.trim() === '—' ? null : ctx.message.text.trim();
      const parsed = contactValueSchemas[key]?.safeParse(candidate);
      if (!parsed?.success) { await ctx.reply('Некоректне значення контакту.'); return; }
      if (!await advanceSession(env.DB, ctx.from.id, 'contact_value', 'contact_confirm', { ...data, value: parsed.data }, session.nonce)) {
        await ctx.reply('Ця дія застаріла. Відкрийте контакт повторно.'); return;
      }
      await ctx.reply(`Підтвердити «${parsed.data ?? 'порожньо'}»?`, { reply_markup: new InlineKeyboard().text('Підтвердити', `confirm:contact:${session.nonce}`).text('Скасувати', 'menu:contacts') });
      return;
    }
    await ctx.reply('Скористайтеся /start.');
  });

  bot.on('callback_query:data', (ctx) => ctx.answerCallbackQuery('Ця дія недоступна або застаріла.'));
  return bot;
}

export async function notifyManager(env: Env, lead: { public_id: string; name: string; phone: string; city: string; preferred_contact: string; comment: string; estimated_product_price_uah: number | null }): Promise<string> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_MANAGER_CHAT_ID) throw new Error('telegram_not_configured');
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN, { client: { timeoutSeconds: 15, fetch: (input: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(input, init) } });
  const text = [`НОВА ЗАЯВКА — ${lead.public_id}`, lead.name, lead.phone, lead.city, `Зв’язок: ${lead.preferred_contact}`, lead.estimated_product_price_uah === null ? '' : `Орієнтовно: ${lead.estimated_product_price_uah} грн`, lead.comment].filter(Boolean).join('\n').slice(0, 4000);
  const message = await bot.api.sendMessage(env.TELEGRAM_MANAGER_CHAT_ID, text);
  return String(message.message_id);
}
