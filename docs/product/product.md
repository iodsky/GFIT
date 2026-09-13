# GFIT — Product Brief

## Overview

GFIT is a multi-tenant SaaS that digitizes the coaching-session confirmation workflow. Instead of a client signing a paper form after a session, the coach starts a session and the system generates a QR code; the client scans it on their own phone (no app, no account), reviews the session details, types their name and taps to confirm. The session is then recorded as completed with an electronic confirmation record.

- **Tenant = Gym.** Everything lives under a gym boundary from day one.
- **Serves:** gyms and independent personal trainers (a trainer is a gym with one coach).
- **MVP:** no client accounts — clients are gym-managed roster records who confirm anonymously at session time.

## Actors and Permissions

| Actor                          | Auth                        | MVP Permissions                                                                                                                                          |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Platform Admin**             | Supabase Auth (global role) | Cross-tenant. Create gyms and designate gym admins; enable/disable features per gym; soft-archive gyms; fallback coach invite/deactivation (escalation). |
| **Gym Admin**                  | Supabase Auth (magic link)  | Scoped to their gym. Send coach signup invites; deactivate coaches; manage the client roster.                                                            |
| **Coach**                      | Supabase Auth (magic link)  | Many-to-many gym membership with a gym switcher. Pick roster clients; start/end/close/cancel sessions; regenerate QR; view session history.              |
| **Client**                     | None                        | Open a tokenized confirmation URL; view session info; type name + tap confirm. No login, no persistent identity.                                         |
| **Client accounts** _(future)_ | —                           | Persistent profiles, workout/progress history, session packages. Out of MVP.                                                                             |

### Role model

- **Global roles** (`platform_admin`) live on the user and are not bound to a tenant.
- **Membership roles** (`coach`, `gym_admin`) are per-tenant via the `membership` join table.
- Future roles: `client`.

## MVP Scope

### In scope

- Platform Admin console: gym add (create), designate gym admins, per-gym feature flags, soft-archive.
- Gym Admin: send coach signup invites, deactivate coaches, and manage the gym's client roster (Name/Phone/Email) for their gym.
- Coach console: gym switcher, session lifecycle (pick roster clients → start → one QR → per-client confirm → coach closes), session history.
- Client confirmation page (public, mobile web): session info, pick-your-name + phone verification, typed-name + tap-to-confirm.
- QR token generation and mid-session regeneration (30-minute TTL).
- Multi-tenancy (RLS) + feature-entitlement scaffolding from day one.

### Deliberately out of scope

Payments, session packages, reporting, full gym-admin powers (gym settings, reporting), client accounts, workout/progress tracking, white-label branding, offline signing, notifications, multi-location gyms, formal legal/compliance work.

## User Journeys

### J1 — Platform Admin adds a gym, Gym Admin invites coaches

1. Admin logs in → "Gyms" → "Add gym" (name, address) → designates the gym admin (email → magic-link invite).
2. Gym Admin logs in → invites coaches by email → magic link → coach activates.
3. Admin confirms feature flags (defaults on).
4. Gym Admin can deactivate coaches; Admin can soft-archive the gym later.

### J2 — Gym Admin maintains the roster; Coach picks a client

1. Gym Admin creates and manages client records (Name, Phone, Email) for the gym.
2. Coach logs in (magic link) → gym switcher → selects active gym.
3. Coach picks any client from the gym roster when starting a session. No coach assignment — the roster is shared.

### J3 — Coach starts a session, solo or group (core loop)

1. Coach picks one or more clients from the gym roster → "Start session" (binds coach + clients).
2. System creates a session (`active`) with one `session_client` slot per client, plus a short-lived opaque token.
3. Coach shows the single QR on their phone/tablet.
4. Each client scans with their own phone, simultaneously.

### J4 — Each client verifies and signs (core loop)

1. Client opens the confirmation URL (same QR for the whole group; solo sessions skip the name picker).
2. Sees session info: gym name, coach name, session date/time, session type — plus a masked, session-scoped name list (first name + last initial).
3. Picks their own name, then enters the phone number on file for verification (email fallback where no phone is on file).
4. Types their name and taps "Confirm" → their slot becomes `confirmed`.
5. Rejected cases: picking an already-confirmed slot ("already confirmed — see your coach"); 5 failed phone attempts locks the slot (coach can reopen it).
6. Coach screen updates on manual refresh; coach taps "End session" to close it — outstanding slots become `unconfirmed`.

### J5 — Coach reviews history

1. Coach opens session history.
2. Filters by gym / client / date; views completed sessions with per-client status (`confirmed` / `unconfirmed`) and confirmation records.

### Edge journeys

- QR token expired → friendly "code expired, ask your coach for a new code" page.
- Client never signs → slot stays `pending` until the coach ends the session, then becomes `unconfirmed`.
- Coach cancels a session → void; no confirmations accepted afterward.
- Duplicate pick or locked slot → blocked with a "see your coach" message.

## Domain Model

```
user (auth.users)

tenant (gym): id, name, address, status(active|archived), created_at

membership: id, user_id, tenant_id, role(coach|gym_admin), status      # M:N coach↔gym, gym admins per gym

client: id, tenant_id, name, phone, email, created_by, archived_at   # gym-managed roster, no coach assignment

session: id, tenant_id, coach_id,
         status(active|completed|cancelled|abandoned),
         confirmation_token(opaque, 30min, regenerable),
         started_at, ended_at

session_client: id, session_id, client_id,
                status(pending|confirmed|unconfirmed)   # one slot per client per session

confirmation: id, session_client_id(unique), typed_name, phone_verified, consented,
              signed_at, signed_ip, signed_user_agent, content_hash   # write-once

tenant_feature: tenant_id, feature_key, enabled    # entitlement scaffolding
```

**Invariants**

- A `session` binds coach + N clients at session start via `session_client` slots; the confirm step never re-selects the coach and only claims an unconfirmed slot.
- A `session_client` slot has at most one `confirmation` (duplicate picks rejected).
- Claiming a name requires phone-on-file verification; 5 failed attempts lock the slot.
- `confirmation` is append-only (write-once; updates rejected).
- Every tenant-scoped row carries `tenant_id`; RLS enforces it.

## Resolved Product Decisions

1. **Signature** = typed name + tap-to-confirm (electronic acknowledgment). No drawn signature, no image storage.
2. **Coach↔gym** = many-to-many; a gym can have multiple coaches and a coach can work in multiple gyms.
3. **Client** = per-gym scoped record (Name/Phone/Email) in a gym-managed roster (created by the Gym Admin). Same person at two gyms = two records.
4. **No coach assignment** = coaches pick any clients from the shared gym roster; coach + clients bind at session start and each client only confirms their own slot.
5. **QR token** = 30-minute TTL, regenerable mid-session (new token invalidates prior); expired scan shows a friendly retry page (coach push-notification deferred).
6. **Completion** = coach-closed: ending a session marks outstanding slots `unconfirmed` (auditable, shown as "without signature"). Supersedes the earlier session-level `by_coach` flag — status is now per-client.
7. **Feature flags** = core session + signature flow always-on; the flag system ships as scaffolding for future features.
8. **Coach screen** = manual refresh (no realtime subscriptions in MVP).
9. **Gym archival** = soft-delete; data retained.
10. **Coach invite** = magic link.
11. **Gym Admin in MVP** = scoped to coach signup invites + deactivation for their gym (designated by Platform Admin at gym creation). Platform Admin retains fallback invite/deactivation ability.
12. **Group sessions in MVP** = one session, one QR, per-client confirm via `session_client` slots (solo = group of one).
13. **Anti-impersonation** = masked session-scoped name list (first name + last initial) + phone-on-file verification (email fallback) + one-confirm-per-slot + 5-attempt slot lockout. The public page never exposes the gym roster.

## Future Vision (deferred)

- Full Gym Admin powers (gym settings, reporting, billing).
- Client accounts.
- Workout tracking.
- Progress tracking.
- Session packages.
- PayMongo (payments).
- Reporting / analytics.
- Multi-location gyms, multi-gym coach membership refinements, notifications.
- Formal legal / compliance / retention review (revisit at monetization).
