## SolCon Contract: Where and how to wire user sync

This folder is a reference package for SolCons/AI builders. It is NOT shipped to production; it documents the required file names, functions, and data shapes so your web app can sync identities with the native container.

### Required files (names/paths)
- `demo_bridge_entry.js` — your single entry for identity sync. All `changeUser` calls must flow through here (not scattered across the app).
- `persona-map.json` — optional starter for persona definitions; keeps IDs consistent across web/native.

### Required functions (exported in `demo_bridge_entry.js`)
- `startWebSession({ userId, configId })` — call once on first paint/config load. Internally calls `DemoBridge.startSession({ userId, configId, reason: "default" })`.
- `setUser(userId, reason = "manual")` — call whenever the web app changes identity (buttons, menus, feature flows). Internally calls `DemoBridge.startSession({ userId, configId, reason })` so web leads a new session/handshake on every changeUser.
- `listenForNative()` — sets up the `nativeUserUpdate` listener; when native sends an update, you must call your app’s `changeUser` once here, not elsewhere. The bridge also calls `startSession` for native-origin user changes so web leads that session.

### Message shape (user-sync/v1)
All outbound messages must include:
- `type: "syncUser"`
- `protocol: "user-sync/v1"`
- `sessionId: string` (stable per web session; refreshed on reload/config swap)
- `configId: string`
- `userId: string`
- `authority: "web"` for outbound; native uses `"native"`
- `reason: "default" | "manual" | "restore" | "fallback" | "admin"`
- `timestamp: number` (ms)

- ### Placement rules
- Do NOT sprinkle `DemoBridge.syncToNative` around the codebase. Centralize calls through `demo_bridge_entry.js` and re-export helpers your app uses.
- Trigger `startWebSession` on your root mount (e.g., `_app.tsx`, `layout.tsx`, or the top-level React/Vue/Svelte entry), after you know `configId` and initial `userId`.
- When the UI changes users, call `setUser(newId)` from your handlers; do not call `braze.changeUser` directly elsewhere. Let the native side mirror it; the bridge will also start a session for you.
- Listen for `nativeUserUpdate` once (in `listenForNative`) and funnel it to your single `changeUser` implementation; the bridge will start a session on these too.

### Braze SDK alignment (recommended)
- Web: where you call `startWebSession` or `setUser`, also call `braze.changeUser(userId)` then `braze.openSession()` so analytics/session tracking matches the bridge traffic.
- Native: ensure the Swift side mirrors the same user ID before logging events; session starts are already logged in the native Event Log.

### Persona data (optional)
- Keep persona seeds in `persona-map.json` so web and native share stable IDs.
