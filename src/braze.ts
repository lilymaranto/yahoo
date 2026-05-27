// Thin wrapper around the Braze Web SDK loaded via CDN in index.html.
// All Braze calls in the app should go through here.

const sdk = () => (window as any).braze ?? null;

let isInitialized = false;

let latestHomeCards: any[] = [];
let latestInboxCards: any[] = [];
const homeListeners = new Set<(cards: any[]) => void>();
const inboxListeners = new Set<(cards: any[]) => void>();

function applyCardUpdate(cards: any[]) {
  if (!cards || !Array.isArray(cards)) return;
  latestHomeCards = cards.filter(c => String(c?.extras?.location ?? c?.extras?.Location ?? '').toLowerCase() === 'home' && !c.dismissed);
  latestInboxCards = cards.filter(c => String(c?.extras?.location ?? c?.extras?.Location ?? '').toLowerCase() === 'inbox' && !c.dismissed);
  homeListeners.forEach(cb => cb([...latestHomeCards]));
  inboxListeners.forEach(cb => cb([...latestInboxCards]));
}

function setupContentCardsSubscription(braze: any) {
  braze.subscribeToContentCardsUpdates((updates: any) => {
    if (updates && updates.cards) {
      applyCardUpdate(updates.cards);
    }
  });

  if (typeof braze.getCachedContentCards === "function") {
    const cached = braze.getCachedContentCards();
    if (cached?.cards) {
      applyCardUpdate(cached.cards);
    }
  }
}

function forceCleanupIAM() {
  // Aggressively remove any stuck Braze overlays or iframes
  const brazeElements = document.querySelectorAll('.ab-in-app-message-wrapper, iframe[name="braze-iframe"], iframe[src*="appboy"], iframe[src*="braze"]');
  brazeElements.forEach(el => el.remove());
  
  // Reset any scroll locks or pointer-event locks injected by the SDK
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

    // PWA-side safeguard: listen to internal iframe postMessages and force cleanup on dismiss
    window.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Detect Braze 'close' or the custom dismiss event or our manual override
        const isCloseCmd = data?.command === 'closeMessage' || data?.type === 'closeMessage';
        const isDismissEvent = data?.command === 'logCustomEvent' && data?.args?.[0] === 'push_primer_dismissed';
        const isForceClose = data?.type === 'force_close_braze';
        
        if (isCloseCmd || isDismissEvent || isForceClose) {
          // Give the SDK 50ms to gracefully process before we aggressively purge the DOM
          setTimeout(forceCleanupIAM, 50);
        }
      } catch (e) {
        // Ignore unparseable messages
      }
    });

    isInitialized = true;
  }

  braze.changeUser(userId);
  braze.openSession();
  
  latestHomeCards = [];
  latestInboxCards = [];
  homeListeners.forEach(cb => cb([]));
  inboxListeners.forEach(cb => cb([]));
  
  braze.requestContentCardsRefresh();
}

export function brazeLogEvent(eventName: string, properties?: Record<string, unknown>) {
  sdk()?.logCustomEvent(eventName, properties ?? {});
}

export function subscribeToContentCards(location: string, callback: (cards: any[]) => void) {
  if (location === 'home') {
    homeListeners.add(callback);
    callback([...latestHomeCards]);
    return () => { homeListeners.delete(callback); };
  } else if (location === 'inbox') {
    inboxListeners.add(callback);
    callback([...latestInboxCards]);
    return () => { inboxListeners.delete(callback); };
  }
  return () => {};
}

export function dismissContentCard(card: any) {
  const braze = sdk();
  if (!braze) return;
  braze.logContentCardDismissal(card);
  
  // Optimistically remove from UI
  if (String(card?.extras?.location ?? card?.extras?.Location ?? '').toLowerCase() === 'home') {
    latestHomeCards = latestHomeCards.filter(c => c.id !== card.id);
    homeListeners.forEach(cb => cb([...latestHomeCards]));
  } else {
    latestInboxCards = latestInboxCards.filter(c => c.id !== card.id);
    inboxListeners.forEach(cb => cb([...latestInboxCards]));
  }
}

export function logContentCardClick(card: any) {
  sdk()?.logContentCardClick(card);
}

export function logContentCardImpressions(cards: any[]) {
  if (cards.length > 0) {
    sdk()?.logContentCardImpressions(cards);
  }
}
