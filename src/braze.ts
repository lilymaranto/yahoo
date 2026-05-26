// Thin wrapper around the Braze Web SDK loaded via CDN in index.html.
// All Braze calls in the app should go through here.

const sdk = () => (window as any).braze ?? null;

let isInitialized = false;

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
      minimumIntervalBetweenTriggerActionsInSeconds: 0,
    });
    braze.automaticallyShowInAppMessages();

    // PWA-side safeguard: listen to internal iframe postMessages and force cleanup on dismiss
    window.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Detect Braze 'close' or the custom dismiss event
        const isCloseCmd = data?.command === 'closeMessage' || data?.type === 'closeMessage';
        const isDismissEvent = data?.command === 'logCustomEvent' && data?.args?.[0] === 'push_primer_dismissed';
        
        if (isCloseCmd || isDismissEvent) {
          // Give the SDK 100ms to gracefully process before we aggressively purge the DOM
          setTimeout(forceCleanupIAM, 100);
        }
      } catch (e) {
        // Ignore unparseable messages
      }
    });

    isInitialized = true;
  }

  braze.changeUser(userId);
  braze.openSession();
}

export function brazeLogEvent(eventName: string, properties?: Record<string, unknown>) {
  sdk()?.logCustomEvent(eventName, properties ?? {});
}

export function subscribeToContentCards(location: string, callback: (cards: any[]) => void) {
  const braze = sdk();
  if (!braze) return;

  const handleUpdate = (updates: any) => {
    const filtered = updates.cards.filter((c: any) => {
      const loc = String(c?.extras?.location ?? c?.extras?.Location ?? '').toLowerCase();
      return loc === location && !c.dismissed;
    });
    callback(filtered);
  };

  braze.subscribeToContentCardsUpdates(handleUpdate);

  if (braze.getCachedContentCards) {
    const cached = braze.getCachedContentCards();
    if (cached?.cards) {
      handleUpdate(cached);
    }
  }

  braze.requestContentCardsRefresh();
}

export function dismissContentCard(card: any) {
  sdk()?.logContentCardDismissal(card);
}

export function logContentCardClick(card: any) {
  sdk()?.logContentCardClick(card);
}

export function logContentCardImpressions(cards: any[]) {
  if (cards.length > 0) {
    sdk()?.logContentCardImpressions(cards);
  }
}
