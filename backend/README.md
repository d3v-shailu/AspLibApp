# DLMS Backend (Node.js + TypeScript + Supabase Postgres)

Express API for the Digital Library Management System. Uses Supabase as the
Postgres database (direct connection via session pooler), issues its own JWTs,
and enforces multi-tenancy in middleware.

## Setup

1. Run the database schema in Supabase:
   - Open Supabase Dashboard → SQL Editor → paste & run `../supabase/schema.sql`
2. Configure env:
   ```bash
   cp .env.example .env
   # set DATABASE_URL (Project Settings → Database → Session pooler URI) and JWT_SECRET
   ```
3. Install & run:
   ```bash
   npm install
   npm run dev        # dev with hot reload
   npm run build && npm start   # production
   ```

## Structure

```
src/
  config/       env.ts, db.ts (pg pool over Supabase)
  middleware/   auth.ts (authenticate / authorize / tenantScope), error.ts (+audit)
  routes/       auth, developer, admin, student
  sockets/      chat.ts (Socket.io real-time gender-routed chat)
  jobs/         noShowCron.ts (late check-in auto-release, every 5 min)
  utils/        jwt, password (default "Lib@XXXXXX" + bcrypt), geo (Haversine)
```

## Security hardening

- **helmet** — secure HTTP headers on every response
- **express-rate-limit** — global 300 req/15min per IP; strict 10 req/15min on `/auth/login` and `/auth/reset-password` (brute-force protection)
- **zod validation** — every mutating endpoint validates input (uuid/date/time formats, email, enums, geo bounds) and returns readable 400 messages
- **bcrypt** password hashing, **JWT** auth, deny-all RLS in Supabase

## Roles & route map

| Prefix     | Role      | Key endpoints |
|------------|-----------|---------------|
| `/auth`    | public    | `POST /login`, `POST /reset-password` (forced on first login) |
| `/developer` | developer | create/list/patch libraries (50 cap), create admins, global analytics |
| `/admin`   | admin     | seats, time-slots, students (create/block), bookings (+manual), waitlist view, occupancy report, geofence, chat channels + moderation (delete message) |
| `/student` | student   | available seats, book, **cancel**, **extend to next slot**, geo check-in/out, my bookings, **waitlist join/leave/list**, channels + messages |

## Multi-tenancy

- `tenantScope` middleware injects `req.libraryId` from the JWT — admins and
  students can never read/write another library's data.
- Supabase RLS is enabled deny-all on every table (see schema.sql) so direct
  anon/authenticated client access is blocked; the API is the only door.

## Geo check-in/out

`POST /student/bookings/:id/check-in` with `{ lat, lng, accuracy }`:
- rejects accuracy > 50 m (weak GPS)
- computes Haversine distance vs library center, allows only inside `radius_meters`
- only within ±`checkin_grace_minutes` of slot start
- every attempt (allowed or rejected) is logged in `checkin_attempts`

## Chat (Socket.io)

```js
const socket = io("http://localhost:4000", { auth: { token: "<jwt>" } });
socket.emit("join", { channel_id });
socket.emit("message", { channel_id, message: "hi" });
socket.on("message", (msg) => console.log(msg));
```
Access rule enforced server-side: same library AND (channel gender == user gender OR 'all').

## First-run seeding (manual)

1. Create a developer user directly in SQL (no endpoint creates developers):
   ```sql
   -- generate a bcrypt hash first (e.g. via node -e "console.log(require('bcryptjs').hashSync('YourPass123',10))")
   INSERT INTO users (email, password_hash, role, full_name, must_reset_password)
   VALUES ('dev@example.com', '<bcrypt-hash>', 'developer', 'Platform Owner', false);
   ```
2. Log in → create libraries → create admins → admins create students.
   Each created account returns a `default_password` to hand to the user.
