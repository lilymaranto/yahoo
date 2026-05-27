/**
 * Caboodle sheet cache for Yahoo content cards (demo — hardcoded, no env vars).
 * Endpoint: https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1/0bQsV2En
 */

export const CABOODLE_CARDS_URL =
  'https://soleng-caboodle-sheets-e2eca0cb7cdb.herokuapp.com/api/v1/0bQsV2En';

/** Set from Caboodle config edit page if GET becomes protected. Public GET works without it today. */
export const CABOODLE_API_KEY = '';

export const YAHOO_CONFIG_ID = 'yahoo2';

export type CaboodleRow = Record<string, unknown>;

export type ContentCard = {
  id: string;
  title: string;
  description: string;
  url: string;
  linkText: string;
  imageUrl: string;
  dismissed: boolean;
  extras: Record<string, unknown>;
};

function rowTimestamp(row: CaboodleRow): number {
  const raw = row.updated_at ?? row.cached_at ?? '';
  const t = new Date(String(raw)).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isDismissed(row: CaboodleRow): boolean {
  const v = row.dismissed;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
}

function isExpired(row: CaboodleRow): boolean {
  if (!row.expires_at) return false;
  const t = new Date(String(row.expires_at)).getTime();
  return Number.isFinite(t) && t <= Date.now();
}

/** Newest row wins per card_id (fallback: title). */
export function dedupeCaboodleRows(rows: CaboodleRow[]): CaboodleRow[] {
  const byKey = new Map<string, CaboodleRow>();

  for (const row of rows) {
    const key = String(row.card_id ?? row.id ?? row.title ?? '')
      .trim()
      .toLowerCase();
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing || rowTimestamp(row) >= rowTimestamp(existing)) {
      byKey.set(key, row);
    }
  }

  return [...byKey.values()];
}

export function rowToContentCard(row: CaboodleRow): ContentCard | null {
  let extras: Record<string, unknown> = {};
  if (typeof row.extras === 'string' && row.extras) {
    try {
      extras = JSON.parse(row.extras) as Record<string, unknown>;
    } catch {
      extras = {};
    }
  } else if (row.extras && typeof row.extras === 'object') {
    extras = row.extras as Record<string, unknown>;
  }

  const location = String(row.location ?? extras.location ?? extras.Location ?? '')
    .trim()
    .toLowerCase();
  if (!location) return null;

  const id = String(row.card_id ?? row.id ?? '').trim();
  if (!id) return null;

  return {
    id,
    title: String(row.title ?? extras.title ?? ''),
    description: String(row.description ?? ''),
    url: String(row.url ?? extras.url ?? ''),
    linkText: String(row.link_text ?? extras.linkText ?? extras.link_text ?? ''),
    imageUrl: String(row.image_url ?? extras.image ?? ''),
    dismissed: isDismissed(row),
    extras: { ...extras, location },
  };
}

function buildFilter(userId: string): string {
  const uid = encodeURIComponent(userId);
  const cfg = encodeURIComponent(YAHOO_CONFIG_ID);
  return `(config_id[eq]${cfg}) AND (user_id[eq]${uid})`;
}

export async function fetchCaboodleCardsForUser(userId: string): Promise<ContentCard[]> {
  const trimmed = String(userId ?? '').trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    filter: buildFilter(trimmed),
    sort: 'sort[desc]updated_at',
  });

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (CABOODLE_API_KEY) {
    headers['X-API-Key'] = CABOODLE_API_KEY;
  }

  try {
    const res = await fetch(`${CABOODLE_CARDS_URL}?${params.toString()}`, {
      headers,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[yahoo] Caboodle fetch failed:', res.status);
      return [];
    }

    const rows = (await res.json()) as CaboodleRow[];
    if (!Array.isArray(rows)) return [];

    return dedupeCaboodleRows(rows)
      .filter((r) => {
        const rowUser = String(r.user_id ?? '').trim();
        const rowConfig = String(r.config_id ?? '').trim();
        return (
          rowUser === trimmed &&
          rowConfig === YAHOO_CONFIG_ID &&
          !isDismissed(r) &&
          !isExpired(r)
        );
      })
      .map(rowToContentCard)
      .filter((c): c is ContentCard => c !== null && !c.dismissed);
  } catch (err) {
    console.warn('[yahoo] Caboodle fetch error:', err);
    return [];
  }
}
