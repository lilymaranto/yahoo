// Thin wrapper around the Braze Web SDK loaded via CDN in index.html.
// All Braze calls in the app should go through here.

import {
  contentCardTitleKey,
  fetchCaboodleCardsForUser,
  normalizeBrazeCards,
  syncNewPayloadCardsToCaboodle,
  type ContentCard,
} from './caboodle';

const sdk = () => (window as any).braze ?? null;

let isInitialized = false;

const homeCardsCache = new Map<string, ContentCard[]>();
const inboxCardsCache = new Map<string, ContentCard[]>();
let currentBrazeUserId = '';
const homeListeners = new Set<(cards: ContentCard[]) => void>();
const inboxListeners = new Set<(cards: ContentCard[]) => void>();

function cardLocation(card: ContentCard): string {
  return String(card?.extras?.location ?? card?.extras?.Location ?? '').toLowerCase();
}

function filterByLocation(cards: ContentCard[], location: 'home' | 'inbox'): ContentCard[] {
  return cards.filter((c) => cardLocation(c) === location && !c.dismissed);
}

function cardTitleSignature(cards: ContentCard[]): string {
  return cards
    .map((c) => contentCardTitleKey(c))
    .filter(Boolean)
    .sort()
    .join('|');
}

function feedChanged(prev: ContentCard[], next: ContentCard[]): boolean {
  return cardTitleSignature(prev) !== cardTitleSignature(next);
}

function mergeByNewTitle(prev: ContentCard[], incoming: ContentCard[]): ContentCard[] {
  const existing = new Set(prev.map((c) => contentCardTitleKey(c)).filter(Boolean));
  const additions = incoming.filter((card) => {
    const key = contentCardTitleKey(card);
    if (!key || existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  return additions.length > 0 ? [...prev, ...additions] : prev;
}

function notifyHome(cards: ContentCard[]) {
  homeListeners.forEach((cb) => cb([...cards]));
}

function notifyInbox(cards: ContentCard[]) {
  inboxListeners.forEach((cb) => cb([...cards]));
}

function updateLocationFeed(
  userId: string,
  location: 'home' | 'inbox',
  nextCards: ContentCard[],
  options?: { force?: boolean; source?: 'braze' | 'caboodle' },
) {
  if (!userId) return;

  const cache = location === 'home' ? homeCardsCache : inboxCardsCache;
  const prev = cache.get(userId) ?? [];
  const computedNext =
    options?.source === 'braze' ? mergeByNewTitle(prev, nextCards) : nextCards;

  if (options?.source === 'braze' && computedNext.length === 0 && prev.length > 0) {
    return;
  }

  if (!options?.force && !feedChanged(prev, computedNext)) {
    return;
  }

  cache.set(userId, computedNext);
  if (userId !== currentBrazeUserId) return;

  if (location === 'home') notifyHome(computedNext);
  else notifyInbox(computedNext);
}

function applyCardUpdate(
  cards: ContentCard[],
  options?: { force?: boolean; source?: 'braze' | 'caboodle' },
) {
  if (!cards || !Array.isArray(cards) || !currentBrazeUserId) return;

  const hCards = filterByLocation(cards, 'home');
  const iCards = filterByLocation(cards, 'inbox');

  updateLocationFeed(currentBrazeUserId, 'home', hCards, options);
  updateLocationFeed(currentBrazeUserId, 'inbox', iCards, options);
}

function pushCachedCardsForUser(userId: string, force = true) {
  const h = homeCardsCache.get(userId) ?? [];
  const i = inboxCardsCache.get(userId) ?? [];
  updateLocationFeed(userId, 'home', h, { force });
  updateLocationFeed(userId, 'inbox', i, { force });
}

function loadCaboodleCards(userId: string) {
  void fetchCaboodleCardsForUser(userId).then((cards) => {
    if (currentBrazeUserId !== userId) return;
    if (cards.length > 0) {
      applyCardUpdate(cards, { source: 'caboodle' });
    }
  });
}

/** Every Braze CC payload path: update UI + POST new titles to Caboodle. */
function handleBrazePayload(rawCards: unknown[], userId: string) {
  const trimmed = String(userId ?? '').trim();
  if (!trimmed || trimmed !== currentBrazeUserId) return;

  const cards = normalizeBrazeCards(rawCards);
  if (cards.length === 0) return;

  applyCardUpdate(cards, { source: 'braze' });
  void syncNewPayloadCardsToCaboodle(trimmed, cards);
}

function setupContentCardsSubscription(braze: any) {
  braze.subscribeToContentCardsUpdates((updates: any) => {
    if (updates?.cards && currentBrazeUserId) {
      handleBrazePayload(updates.cards, currentBrazeUserId);
    }
  });
}

function forceCleanupIAM() {
  const brazeElements = document.querySelectorAll(
    '.ab-in-app-message-wrapper, iframe[name="braze-iframe"], iframe[src*="appboy"], iframe[src*="braze"]',
  );
  brazeElements.forEach((el) => el.remove());

  document.body.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.documentElement.style.overflow = '';
  document.documentElement.style.pointerEvents = '';
}

export function brazeChangeUser(userId: string) {
  const braze = sdk();
  if (!braze) return;

  if (!isInitialized) {
    braze.initialize('7ea48369-1551-4a9e-b054-d09b40648ef1', {
      baseUrl: 'sdk.iad-03.braze.com',
      enableLogging: false,
      allowUserSuppliedJavascript: true,
      minimumIntervalBetweenTriggerActionsInSeconds: 1,
    });
    braze.automaticallyShowInAppMessages();

    setupContentCardsSubscription(braze);

    window.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const isCloseCmd = data?.command === 'closeMessage' || data?.type === 'closeMessage';
        const isDismissEvent =
          data?.command === 'logCustomEvent' && data?.args?.[0] === 'push_primer_dismissed';
        const isForceClose = data?.type === 'force_close_braze';

        if (isCloseCmd || isDismissEvent || isForceClose) {
          setTimeout(forceCleanupIAM, 50);
        }
      } catch {
        /* ignore unparseable messages */
      }
    });

    isInitialized = true;
  }

  currentBrazeUserId = userId;

  pushCachedCardsForUser(userId, true);
  loadCaboodleCards(userId);

  braze.changeUser(userId);
  braze.openSession();

  setTimeout(() => {
    if (currentBrazeUserId !== userId) return;
    if (braze.getCachedContentCards) {
      const cached = braze.getCachedContentCards();
      if (cached?.cards) {
        handleBrazePayload(cached.cards, userId);
      }
    }
  }, 100);

  braze.requestContentCardsRefresh();
}

export function brazeLogEvent(eventName: string, properties?: Record<string, unknown>) {
  sdk()?.logCustomEvent(eventName, properties ?? {});
}

export function subscribeToContentCards(
  location: string,
  callback: (cards: ContentCard[]) => void,
) {
  if (location === 'home') {
    homeListeners.add(callback);
    callback([...(homeCardsCache.get(currentBrazeUserId) || [])]);
    return () => {
      homeListeners.delete(callback);
    };
  }
  if (location === 'inbox') {
    inboxListeners.add(callback);
    callback([...(inboxCardsCache.get(currentBrazeUserId) || [])]);
    return () => {
      inboxListeners.delete(callback);
    };
  }
  return () => {};
}

export function dismissContentCard(card: ContentCard) {
  const braze = sdk();
  if (!braze || !currentBrazeUserId) return;

  if (typeof braze.logContentCardDismissal === 'function') {
    braze.logContentCardDismissal(card);
  }

  const loc = cardLocation(card);
  if (loc === 'home') {
    const updated = (homeCardsCache.get(currentBrazeUserId) ?? []).filter((c) => c.id !== card.id);
    homeCardsCache.set(currentBrazeUserId, updated);
    notifyHome(updated);
  } else {
    const updated = (inboxCardsCache.get(currentBrazeUserId) ?? []).filter((c) => c.id !== card.id);
    inboxCardsCache.set(currentBrazeUserId, updated);
    notifyInbox(updated);
  }
}

export function logContentCardClick(card: ContentCard) {
  sdk()?.logContentCardClick(card);
}

export function logContentCardImpressions(cards: ContentCard[]) {
  if (cards.length > 0) {
    sdk()?.logContentCardImpressions(cards);
  }
}
