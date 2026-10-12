export const OUTBOX_DESTINATIONS = ['telegram', 'notion'] as const;
export type OutboxDestination = (typeof OUTBOX_DESTINATIONS)[number];

export interface PriceRow {
  id: number;
  category: string;
  key: string;
  label: string;
  value_micros: number;
  unit: string;
  active: number;
  version: number;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  public_id: string;
  idempotency_key: string;
  request_hash: string;
  name: string;
  phone: string;
  email: string | null;
  city: string;
  preferred_contact: string;
  contact_handle: string;
  comment: string;
  configuration_json: string | null;
  estimated_product_price_uah: number | null;
  needs_delivery: number;
  needs_installation: number;
  status: string;
  notion_page_id: string | null;
  created_at: string;
  updated_at: string;
}
