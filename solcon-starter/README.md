## SolCon Starter: Web ↔ Native User Sync

This starter shows the minimal contract a SolCon-built web app should follow so it stays in lockstep with the native container (DemoBrazeAIApp). It is **not** part of the production app—just a reference you can hand to builders or AI tools (v0, etc.).

### Quick prompt to hand to v0/AI
“Load `vercel-config-dashboard/solcon-starter`. Use only `demo_bridge_entry.js` for identity. Call `startWebSession({ userId, configId })` on first paint/config load (reason=default). Call `setUser(newUserId)` on every web user change; it uses `startSession` so web leads a fresh handshake. Call `listenForNative(changeUserFn)` once to handle native→web updates; don’t scatter changeUser. Keep `configId` set via these calls. Where you call `startWebSession`/`setUser`, also call `braze.changeUser(userId)` then `braze.openSession()` (Braze Web SDK) so analytics match. Keep these calls centralized, debounce rapid changes (~200–300ms), and don’t cache/restore users in ways that override sync. Files: demo_bridge_entry.js (exports startWebSession/setUser/listenForNative), CONTRACT.md (rules/message shape), README.md (checklist), persona-map.json (optional personas).”

### Message contract (user-sync/v1)
- Outgoing to native: `DemoBridge.startSession({ userId, configId, reason: "default" })` on load/config change, then also `DemoBridge.startSession({ userId, configId, reason: "manual" })` on user switches so web always leads a fresh session + sync.
- Incoming from native: listen for `nativeUserUpdate` CustomEvent; its `event.detail` mirrors the same fields: `{ type: "syncUser", protocol: "user-sync/v1", sessionId, configId, userId, authority: "native", reason, timestamp }`.
- Required fields: `protocol="user-sync/v1"`, `type="syncUser"`, `sessionId`, `configId`, `userId`, `authority`, `reason`, `timestamp`.
- Authority/reason hints: `authority: web|native`; `reason: default|manual|restore|fallback|admin`.
- Baseline identity comes from the web app on load (no dashboard-level default user field).

### Deterministic precedence (recommended)
1) Newer `sessionId` resets state (config switch or reload).
2) Within a session: `web/default` (handshake) sets the baseline; `web/manual` overrides; `native/manual` overrides until next handshake; `restore/fallback` are lowest priority. Always apply the latest timestamp within the same tier.

### Implementation checklist for SolCons / AI
- On first paint, call `DemoBridge.startSession({ userId: <initial>, configId: <id>, reason: "default" })`.
- When the user changes identity in the web UI, call `DemoBridge.startSession({ userId: newId, configId: <id>, reason: "manual" })` (this forces a new session+handshake and sync).
- Listen for `nativeUserUpdate` and call your app’s `changeUser(detail.userId)`; the starter bridge also triggers `startSession` on incoming native user so web leads that session too.
- If you integrate the Braze Web SDK directly, call `braze.changeUser(userId)` then `braze.openSession()` in the same places you call `startSession` to keep SDK analytics aligned.
- Always include `configId` in outbound messages; the native app ignores mismatched config IDs.
- Keep `sessionId` stable for the life of the web session; regenerate it on full reload or deliberate session restart.
- Avoid local caching that auto-overwrites the user after native/web sync.
- Debounce rapid user changes (e.g., wait 200–300ms).
- Log helpful breadcrumbs to the console: source, reason, sessionId, configId, userId, timestamp.

### What’s in this folder
- `CONTRACT.md` — required files, functions, and placement rules (no scattered changeUser calls).
- `demo_bridge_entry.js` — single entrypoint you import in your app; exposes `startWebSession`, `setUser` (now uses startSession), `listenForNative`.
- `persona-map.json` — optional shared IDs/default user seed so web/native stay aligned.
- (Optional) Create your own page and import `demo_bridge_entry.js`; keep all identity routing there.
