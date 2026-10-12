import { APIResponseError, Client, UnknownHTTPResponseError } from '@notionhq/client';
import products from '../../../backend/app/config/products.json';
import type { LeadRow } from '../db/schema';
import { DeliveryError } from '../jobs/delivery-error';
import type { Env } from '../types/env';

function rich(value: unknown) {
  return { rich_text: [{ type: 'text', text: { content: String(value ?? '').slice(0, 1900) } }] };
}

function isHttpResponseError(error: unknown): error is APIResponseError | UnknownHTTPResponseError {
  return APIResponseError.isAPIResponseError(error) || UnknownHTTPResponseError.isUnknownHTTPResponseError(error);
}

export function notionProperties(lead: LeadRow) {
  const configuration = lead.configuration_json ? JSON.parse(lead.configuration_json) as { profile?: string } : null;
  return {
    'Lead ID': rich(lead.public_id),
    Customer: { title: [{ type: 'text', text: { content: lead.name.slice(0, 1900) } }] },
    Phone: { phone_number: lead.phone },
    City: rich(lead.city),
    Product: rich(configuration ? products.find((product) => product.id === configuration.profile)?.name ?? 'Вікно' : 'Консультація'),
    Estimate: { number: lead.estimated_product_price_uah },
    Delivery: { checkbox: Boolean(lead.needs_delivery) },
    Installation: { checkbox: Boolean(lead.needs_installation) },
    Created: { date: { start: lead.created_at } },
    'Preferred Contact': { select: { name: lead.preferred_contact } },
    Status: { status: { name: lead.status } },
  };
}

function retryAfter(error: unknown): number {
  if (!isHttpResponseError(error)) return 0;
  const headers = error.headers;
  const header = headers instanceof Headers ? headers.get('retry-after') : null;
  if (!header) return 0;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : Math.max(0, Math.ceil((Date.parse(header) - Date.now()) / 1000)) || 0;
}

function classify(error: unknown, creating: boolean): DeliveryError {
  if (error instanceof DeliveryError) return error;
  if (isHttpResponseError(error)) {
    const retry = retryAfter(error);
    if (error.status === 429) return new DeliveryError('notion_rate_limited', true, false, retry);
    if (error.status === 409) return new DeliveryError('notion_conflict', true);
    if (error.status >= 400 && error.status < 500) return new DeliveryError('notion_rejected', false);
    return new DeliveryError(creating ? 'notion_ambiguous_delivery' : 'notion_unavailable', true, creating, retry);
  }
  return new DeliveryError(creating ? 'notion_ambiguous_delivery' : 'notion_unavailable', true, creating);
}

function committedPageId(error: unknown): string | null {
  if (!isHttpResponseError(error)) return null;
  try {
    const body = JSON.parse(error.body) as { additional_data?: { committed_resource_id?: unknown } };
    const id = body.additional_data?.committed_resource_id;
    return typeof id === 'string' && /^[0-9a-f-]{32,36}$/i.test(id) ? id : null;
  } catch { return null; }
}

export interface NotionDeliveryOptions {
  /** True after a create request whose outcome is unknown. Never create again. */
  reconcileOnly: boolean;
  /** Persist the write intent under the active lease before issuing POST /pages. */
  beforeCreate: () => Promise<void>;
  beforeUpdate: () => Promise<void>;
}

export async function syncLeadToNotion(env: Env, lead: LeadRow, options: NotionDeliveryOptions): Promise<string> {
  if (!env.NOTION_TOKEN || !env.NOTION_DATA_SOURCE_ID) throw new DeliveryError('notion_not_configured', false);
  // Suppress SDK logs containing upstream error bodies, and abort timed-out fetches.
  const notion = new Client({ auth: env.NOTION_TOKEN, notionVersion: '2025-09-03', timeoutMs: 20_000,
    logger: () => undefined, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }) });
  let pageId = lead.notion_page_id;
  try {
    if (!pageId) {
      const query = await notion.request<{ results: Array<{ id: string }> }>({
        path: `data_sources/${env.NOTION_DATA_SOURCE_ID}/query`, method: 'post',
        body: { filter: { property: 'Lead ID', rich_text: { equals: lead.public_id } }, page_size: 2 },
      });
      if (query.results.length > 1) throw new DeliveryError('notion_duplicate_lead_requires_review', false);
      pageId = query.results[0]?.id ?? null;
    }
    if (pageId) {
      await options.beforeUpdate();
      await notion.request({ path: `pages/${pageId}`, method: 'patch', body: { properties: notionProperties(lead) } });
      return pageId;
    }
  } catch (error) { throw classify(error, false); }
  if (options.reconcileOnly) throw new DeliveryError('notion_ambiguous_delivery', true, true, 300);
  await options.beforeCreate();
  try {
    const page = await notion.request<{ id: string }>({
      path: 'pages', method: 'post', body: {
        parent: { type: 'data_source_id', data_source_id: env.NOTION_DATA_SOURCE_ID },
        properties: notionProperties(lead),
        children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: {
          content: `Lead ${lead.public_id}\n${lead.name}\n${lead.phone}\n${lead.contact_handle}\n${lead.email ?? ''}\n${lead.comment}`.slice(0, 1900),
        } }] } }],
      },
    });
    return page.id;
  } catch (error) {
    // Notion can identify a create committed despite a 503. Do not repeat it.
    const committed = committedPageId(error);
    if (committed) return committed;
    throw classify(error, true);
  }
}
