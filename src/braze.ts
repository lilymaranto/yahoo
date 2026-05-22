// Thin wrapper around the Braze Web SDK loaded via CDN in index.html.
// All Braze calls in the app should go through here.

const sdk = () => (window as any).braze ?? null;

export function brazeChangeUser(userId: string) {
  sdk()?.changeUser(userId);
  sdk()?.openSession();
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
