## Quick Validation Script (manual, 60 seconds)

Use this checklist to prove a new v0/vibe-coded site obeys the contract.

1) Load web in the native container (or any WebView with DemoBridge injected):
   - On first paint, call `startWebSession({ userId: X, configId: CFG, reason: "default" })`.
   - Expect native event log: `web_session_started user=X session=... config=CFG`.
   - Expect banner to move from “Syncing” to “Identity Mirrored: X”.
2) Web → Native manual swap:
   - Trigger your UI to change user to `Y` via `setUser("Y", "manual")`.
   - Expect native log: `synced_user user=Y source=web reason=manual ...`.
   - Expect Braze native user becomes `Y`.
3) Native → Web manual swap:
   - In native persona field, set user to `Z`.
   - Expect web receives `nativeUserUpdate` and calls your `changeUser(Z)`.
   - Expect web console log from your handler, and Braze Web SDK user becomes `Z`.
4) Timeout handling:
   - Simulate no handshake (comment out `startWebSession`), reload.
   - After 8s, native shows a warning banner (“Handshake not received”) and waits; there is no auto-fallback user.

If any step fails, verify:
- Outbound payload includes `protocol="user-sync/v1"`, `configId`, `sessionId`, `userId`, `authority`, `reason`, `timestamp`.
- You only call `setUser`/`startWebSession` from `demo_bridge_entry.js`.
- You listen once for `nativeUserUpdate` and forward to a single `changeUser`.
