# 📚 Digital Library Management System (DLMS)

> A multi-tenant digital library platform with role-based dashboards, seat & time-slot booking, geo-fenced attendance, and gender-routed community chat — supporting up to **50 libraries** under one app.

---

## 📖 Table of Contents

1. [Overview](#-overview)
2. [Core Concept](#-core-concept)
3. [Roles & Permissions](#-roles--permissions)
4. [Key Features](#-key-features)
5. [System Architecture](#-system-architecture)
6. [Database Schema](#-database-schema)
7. [Authentication & Account Flow](#-authentication--account-flow)
8. [Booking System](#-booking-system)
9. [Geo-Fenced Attendance](#-geo-fenced-attendance)
10. [Community Chat Channels](#-community-chat-channels)
11. [API Structure](#-api-structure)
12. [Multi-Tenancy & Security](#-multi-tenancy--security)
13. [Tech Stack Recommendations](#-tech-stack-recommendations)
14. [Edge Cases & Business Rules](#-edge-cases--business-rules)
15. [Build Roadmap](#-build-roadmap)
16. [Open Decisions](#-open-decisions)

---

## 🎯 Overview

The **Digital Library Management System (DLMS)** is a SaaS-style platform that lets multiple digital libraries (up to **50**) operate under a single application. Each library has its own admin, seats, time slots, pricing, students, and community channels — all isolated from one another.

**The core problem it solves:** Students come to a digital library at a specific time, sit on their allotted seat for their allotted duration, and leave. DLMS digitizes the entire flow — from seat booking to physical attendance proof — while giving admins full control and developers global oversight.

---

## 💡 Core Concept

```
Developer (platform owner)
   │
   ├── Library A ── Admin A ── Students A1, A2, A3...
   ├── Library B ── Admin B ── Students B1, B2, B3...
   ├── ...
   └── Library 50 ── Admin 50 ── Students...
```

- **One app, many libraries.** Each library is a tenant.
- **Admins create student accounts** — there is **no public signup**.
- **Developers create admin accounts** and manage libraries.
- **Students book seats** in time slots, **check in via geo-fence**, and **chat** in their library's gender-specific channels.

---

## 👥 Roles & Permissions

| Role | Scope | Can Do |
|------|-------|--------|
| **Developer** | All 50 libraries | Create/manage libraries, assign admins, view global analytics, system settings |
| **Admin** | Only their library | Manage seats, time slots, pricing, students, chat channels, bookings, reports, geofence |
| **Student** | Only their library | Book seats, geo-fenced check-in/out, chat in allowed channels, view history |

**Hard rules:**
- No public registration page anywhere.
- Every account is created by an admin (students) or developer (admins).
- Admin of Library A can **never** access Library B's data.
- Only developers can create other admins.

---

## ✨ Key Features

### Student App
- Forced password reset on first login
- Visual seat map & slot booking
- Geo-fenced check-in / check-out
- View booking & attendance history
- Real-time chat in gender-routed channels
- Extend booking if the next slot is free

### Admin Dashboard
- Live occupancy dashboard
- Seat management (add/remove/maintenance)
- Time-slot & pricing management
- Create students with system-generated passwords
- Auto-add students to correct gender chat channel
- Manual booking & attendance override (audit-logged)
- Map-based geofence setup
- Attendance, no-show & revenue reports
- Chat moderation

### Developer Panel
- Create & manage up to 50 libraries
- Assign admins to libraries
- Global analytics across all libraries
- Enforce 50-library cap
- Suspend / activate libraries

---

## 🏗️ System Architecture

```
   ┌───────────────┐  ┌────────────┐  ┌──────────────┐
   │ Developer     │  │  Admin     │  │ Student App  │
   │ Panel         │  │  Panel     │  │ (Web/Mobile) │
   └───────┬───────┘  └─────┬──────┘  └──────┬───────┘
           │                │                │
           └────────────────┼────────────────┘
                            ▼
                    ┌───────────────┐
                    │  API Server   │
                    │ (NestJS /     │
                    │  Django)      │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  ┌───────────┐      ┌─────────────┐     ┌────────────┐
  │PostgreSQL │      │   Redis     │     │ Socket.io  │
  │(tenants)  │      │(cache/auth) │     │ (chat +    │
  └───────────┘      └─────────────┘     │ live seats)│
                                          └────────────┘
```

---

## 🗄️ Database Schema

### `libraries` (tenants)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(150) | |
| address | TEXT | |
| phone | VARCHAR(20) | |
| created_by | UUID → users | developer |
| status | VARCHAR(20) | active / suspended |
| latitude | NUMERIC(10,8) | geofence center |
| longitude | NUMERIC(11,8) | geofence center |
| radius_meters | INT | default 100 |
| geofence_polygon | JSONB | optional |
| created_at | TIMESTAMP | |

### `users` (all roles)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | VARCHAR(150) | unique |
| phone | VARCHAR(20) | unique |
| password_hash | TEXT | |
| role | VARCHAR(20) | developer / admin / student |
| library_id | UUID → libraries | NULL for developer |
| full_name | VARCHAR(150) | |
| gender | VARCHAR(10) | male / female |
| photo_url | TEXT | |
| must_reset_password | BOOLEAN | default TRUE |
| status | VARCHAR(20) | active / blocked |
| created_by | UUID → users | |
| created_at | TIMESTAMP | |

### `seats`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| library_id | UUID → libraries | |
| seat_number | VARCHAR(20) | unique per library |
| zone | VARCHAR(50) | quiet / group |
| seat_type | VARCHAR(20) | standard / premium |
| status | VARCHAR(20) | available / maintenance |

### `time_slots`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| library_id | UUID → libraries | |
| name | VARCHAR(50) | Morning / Afternoon |
| start_time | TIME | |
| end_time | TIME | |
| price | NUMERIC(10,2) | |
| is_active | BOOLEAN | |

### `bookings`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| library_id | UUID → libraries | |
| student_id | UUID → users | |
| seat_id | UUID → seats | |
| slot_id | UUID → time_slots | |
| booking_date | DATE | |
| check_in_at | TIMESTAMP | |
| check_out_at | TIMESTAMP | |
| status | VARCHAR(20) | booked / checked_in / completed / no_show / cancelled |
| checkin_lat / lng | NUMERIC | geo proof |
| checkin_accuracy | NUMERIC(6,2) | meters |
| checkin_distance | NUMERIC(8,2) | meters |
| checkout_lat / lng | NUMERIC | |
| checkout_distance | NUMERIC(8,2) | |
| is_geofence_valid | BOOLEAN | audit |

> **Double-booking prevention:**
> ```sql
> CREATE UNIQUE INDEX uniq_active_booking
>   ON bookings (seat_id, slot_id, booking_date)
>   WHERE status IN ('booked','checked_in');
> ```

### `chat_channels`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| library_id | UUID → libraries | |
| name | VARCHAR(100) | e.g. "ABC (Male)" |
| gender | VARCHAR(10) | male / female / all |
| created_at | TIMESTAMP | |

### `chat_messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| channel_id | UUID → chat_channels | |
| sender_id | UUID → users | |
| message | TEXT | |
| created_at | TIMESTAMP | |

---

## 🔐 Authentication & Account Flow

### No public signup — accounts are created top-down

**Developer creates an Admin:**
```
1. Developer selects library + fills admin details
2. System generates default password (e.g. "Lib@X7K9P2")
3. User created: role=admin, library_id=chosen, must_reset_password=TRUE
4. Credentials sent via SMS / WhatsApp / Email
5. Admin logs in → forced password reset → dashboard
```

**Admin creates a Student:**
```
1. Admin fills: name, email, phone, gender
2. System generates default password
3. User created: role=student, library_id=admin's library, must_reset_password=TRUE
4. Auto-added to matching gender channel (ABC Male / ABC Female)
5. Credentials sent to student
6. Student logs in → forced password reset → dashboard
```

**Default password generation:**
```js
const pwd = "Lib@" + crypto.randomBytes(3).toString("hex").toUpperCase();
// e.g. "Lib@A7F3C9"
```

**First-login enforcement:** every protected route checks `must_reset_password`. If `true`, only the reset endpoint is allowed until a new password is set.

---

## 🪑 Booking System

### Flow
```
Student opens app
   → Picks date + time slot
   → Sees available seats (visual map)
   → Books a seat
   → Receives confirmation
   → Arrives at library → geo-fenced check-in
   → Session ends → check-out
```

### Rules
| Rule | Behavior |
|------|----------|
| **Double-booking** | Blocked by DB unique index |
| **Late check-in** | Auto-release seat if not checked in within X min (e.g. 15 min) |
| **No-show tracking** | Flag students who repeatedly book but don't show |
| **Waitlist** | If a slot is full, allow waitlisting |
| **Extensions** | Allowed only if next slot is free |
| **Advance booking** | Configurable per library (e.g. 7 days) |
| **Check-in window** | Only ±15 min around slot start |

---

## 📍 Geo-Fenced Attendance

Geo-fencing ensures a student can **only check in if their phone's GPS is physically inside the library boundary** — killing proxy attendance.

### Flow
```
Student taps "Check In"
   → App gets GPS (lat, lng, accuracy)
   → Sends to backend with booking_id
   → Backend computes distance (Haversine)
   → Inside radius? → allow + log proof
   → Outside?       → reject + show distance
```

### Distance Calculation (Haversine)
```js
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

### Geofence Types
- **Circle** (recommended start): center + radius
- **Polygon** (advanced): list of points for irregular buildings

### Anti-Spoofing Layers
| Threat | Mitigation |
|--------|-----------|
| GPS spoofing | Reject `accuracy > 50m`; flag mock-location devices |
| Check-in from parking lot | Tight radius (50m) + **Wi-Fi BSSID** check |
| Screenshot QR | **Rotating QR** on desk tablet (changes every 30s) |
| Device sharing | Bind booking to device fingerprint |
| Indoor GPS drift | Radius 100–150m OR Wi-Fi/BLE beacons |

### Recommended layered check
```
Check-in allowed ONLY IF:
  1. GPS inside radius, AND
  2. (Optional) connected to library Wi-Fi OR scanned rotating QR
  3. accuracy <= 50m
  4. Not mock-location flagged
```

### Admin Geofence Setup
- Map picker (Google Maps / Leaflet + OpenStreetMap)
- Drag pin to library entrance, slide radius (50 / 100 / 150m)
- Live preview circle
- Save → stored on `libraries` table

### Student UX
```
Verifying location...
  ✓ "Checked in! You're at ABC Library (23m)"
  ✗ "You're 340m from ABC Library. Please come closer."
  ⚠ "GPS signal weak. Move near a window."
```

---

## 💬 Community Chat Channels

Each library gets **gender-routed channels** automatically.

### Auto-Creation
When a library "ABC" is created:
```
→ Channel "ABC (Male)"   → gender = male
→ Channel "ABC (Female)" → gender = female
```

### Access Rules (backend-enforced, always)
```
A student can read/post IF:
   channel.library_id == student.library_id
   AND (channel.gender == student.gender OR channel.gender == 'all')
```

So:
- Male student in ABC → sees only **ABC (Male)**
- Female student in ABC → sees only **ABC (Female)**
- Admin → can view/moderate both

### Real-Time
- **Socket.io rooms** keyed by `channel_id`
- On connect → verify JWT → verify channel membership → join room
- Broadcast messages to room

---

## 🔌 API Structure

```
AUTH
  POST  /auth/login              → token + role + must_reset_password
  POST  /auth/reset-password     → forced on first login

DEVELOPER  (role guard: developer)
  POST   /libraries              → create library (auto-creates gender channels)
  GET    /libraries              → all libraries + stats
  PATCH  /libraries/:id          → suspend / activate
  POST   /libraries/:id/admins   → create admin (default password)
  GET    /analytics/global

ADMIN  (role guard: admin, scoped to own library_id)
  GET/POST/PATCH  /seats
  GET/POST/PATCH  /time-slots
  POST   /students
  GET    /students
  PATCH  /students/:id/block
  GET    /bookings
  POST   /bookings/manual
  GET    /channels
  GET    /channels/:id/messages
  GET    /reports/occupancy
  PATCH  /libraries/:id/geofence   → set lat/lng/radius

STUDENT  (role guard: student)
  GET    /seats/available?date=&slot=
  POST   /bookings
  POST   /bookings/:id/check-in    → geo-validated
  POST   /bookings/:id/check-out   → geo-validated
  GET    /my/bookings
  GET    /channels                 → only allowed channels
  POST   /channels/:id/messages
```

### Middleware Stack
```
authenticate()    → verify JWT
authorize('admin')→ role check
tenantScope()     → inject req.library_id, reject mismatches
```

---

## 🛡️ Multi-Tenancy & Security

- **`library_id` on every tenant table** is the backbone.
- **Every admin query filters by `req.user.library_id`** — enforced in `tenantScope()` middleware, not just the UI.
- **Test tenant leakage hard** — a bug here exposes one library's students to another.
- **Soft-delete libraries** — archive, don't hard-delete (keeps bookings + chats).
- **Audit log** every manual admin override (attendance, bookings).
- **Force password reset** on every new account; expire unused default passwords after X days.
- **Blocked students** → can't log in, can't chat, future bookings auto-cancelled.

---

## 🧰 Tech Stack Recommendations

| Layer | Options |
|-------|---------|
| Frontend (web) | Next.js / React |
| Mobile | Flutter or React Native |
| Backend | NestJS (Node) or Django / FastAPI (Python) |
| Database | PostgreSQL |
| Cache / sessions | Redis |
| Realtime chat | Socket.io / Supabase Realtime |
| Auth | JWT |
| Maps / geofence UI | Leaflet + OSM (free) or Google Maps |
| QR / check-in | `qrcode` + scanner library |
| Notifications | Twilio (SMS/WhatsApp), SendGrid (email) |
| Hosting | Vercel (frontend) + Railway/AWS (backend + DB) |
| Payments | Razorpay / Stripe (optional) |

---

## ⚠️ Edge Cases & Business Rules

1. **Tenant leakage** — always filter by `library_id`.
2. **Deleting a library** — soft-delete + archive.
3. **Gender change** — move student to correct channel automatically.
4. **Blocked student** — cannot log in, chat, or retain future bookings.
5. **Unused default password** — expire after X days; admin can regenerate.
6. **Admin creating another admin?** — recommended: **only developer** can.
7. **50-library cap** — enforced on developer create endpoint (`COUNT(libraries) < 50`).
8. **Late check-in auto-release** — seat freed if no check-in within grace period.
9. **Check-in window** — only ±15 min around slot start.
10. **GPS drift** — generous radius or secondary signal (Wi-Fi/QR).
11. **Manual attendance override** — admin allowed, but reason + audit log required.
12. **Checkout geofence** — required too, so students can't free seats remotely.

---

## 🗺️ Build Roadmap

| Phase | Deliverable |
|-------|-------------|
| **1** | Auth + roles + forced password reset + developer creates library & admin |
| **2** | Admin: seats + time slots + pricing + create students |
| **3** | Student: view seats + book + check-in/out (basic) |
| **4** | **Geofence setup (map) + geo-validated check-in/out** |
| **5** | **Chat channels** (auto-created, gender-routed) with real-time |
| **6** | Reports, blocking, analytics, anti-spoof hardening, notifications |
| **7** | Payments (if paid model), mobile app polish |

---

## ❓ Open Decisions

Before coding starts, decide:

1. **Library ownership model** — are all 50 libraries yours (single business), or will each admin be a separate onboarded business? *(Affects billing.)*
2. **Pricing model** — per slot, per day, or monthly membership? Online payment or cash at desk?
3. **Chat scope** — text only, or images/files? Can admin delete/mute? One channel per gender, or multiple topic channels?
4. **Primary attendance signal** — GPS only, GPS + Wi-Fi BSSID, or GPS + rotating QR? *(Recommend GPS + QR.)*
5. **Geofence radius** — 50m (tight) or 100–150m (indoor-friendly)?
6. **Check-in window** — how early/late around slot start? (default ±15 min)
7. **Manual override** — should admins be able to mark attendance if GPS fails? *(Recommend yes, with reason + audit.)*
8. **Tech stack** — Node/NestJS or Python/Django? Web-first or mobile-first?

---

## 📌 Summary

**DLMS** is a multi-tenant digital library platform where:
- **Developers** own up to 50 libraries and create admins.
- **Admins** run their library — seats, slots, pricing, students, chat, geofence.
- **Students** book seats, check in via **GPS geo-fencing**, and chat in **gender-specific channels**.
- **No public signup** — every account is created top-down with a forced password reset.
- **Geofencing** kills proxy attendance with layered checks (GPS + accuracy + Wi-Fi/QR).
- **Tenant isolation** is enforced at the query layer, not just the UI.

Build in 6–7 phases, starting with auth and libraries, then booking, then geofence, then chat.

---

*README version 1.0 — ready for stack selection and starter code generation.*