# Auth & Access Control Design

**Date:** 2026-03-22
**Status:** Approved
**Project:** JVA CRM (jvacrmv2.vercel.app)

---

## Overview

Add authentication and role-based access control to the JVA CRM so that only invited JVA members can access the system. Uses Supabase Auth natively to avoid additional libraries and keep auth, database, and RLS in one place.

---

## Authentication Flow

```
Unauthenticated user → jvacrmv2.vercel.app
  ↓ Vercel Middleware detects no session
  ↓ Redirect to /login

/login → email + password form
  ↓ Supabase Auth authenticates
  ↓ Session cookie issued
  ↓ Redirect to / (CRM dashboard)

Logout → session cleared → redirect to /login
```

**Protected routes:** all routes (`/`, `/templates`, `/api/*`, `/admin/*`)
**Public routes:** `/login` only

---

## Role Design

Roles are stored in a `profiles` table in Supabase, linked to `auth.users`.

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  role text not null default 'member', -- 'admin' | 'member'
  created_at timestamptz default now()
);
```

### Permission Matrix

| Feature | Member | Admin |
|---|---|---|
| View company list & search | ✅ | ✅ |
| Add / edit companies | ✅ | ✅ |
| Change contact status | ✅ | ✅ |
| Execute outreach | ✅ | ✅ |
| Invite / remove members | ❌ | ✅ |
| Change member roles | ❌ | ✅ |

Initial admin: `sorasasaki140508@gmail.com` (set manually after first login)

---

## Implementation Components

### New Files

| File | Purpose |
|---|---|
| `app/login/page.tsx` | Login page (email + password form) |
| `app/admin/members/page.tsx` | Member management (invite, delete, role change) |
| `middleware.ts` | Route protection via Vercel Middleware |
| `lib/auth.ts` | Auth helper functions (getSession, getRole, requireAdmin) |

### Modified Files

| File | Change |
|---|---|
| `lib/supabase.ts` | Add server-side and browser Supabase client helpers |
| `app/layout.tsx` | Add logout button to header |
| `app/api/**` | Add auth checks to all API routes |

### Supabase Changes

1. Enable Email Auth (likely already enabled)
2. Create `profiles` table with RLS
3. RLS policies:
   - All authenticated users can read their own profile
   - Only admins can read all profiles
   - Only admins can update roles
4. Configure SMTP for invitation emails (or use Supabase's default)

---

## Member Invitation Flow

1. Admin opens `/admin/members`
2. Enters invitee's email address
3. Supabase sends invitation email with magic signup link
4. Invitee clicks link → sets password → lands on CRM
5. Admin can change their role from default `member` to `admin` if needed

---

## Security Notes

- `/admin/*` routes return 403 for non-admin users (checked in Middleware)
- All API routes validate session server-side using `SUPABASE_SERVICE_ROLE_KEY`
- RLS on `profiles` table prevents members from escalating their own role
- Session managed via HTTP-only cookies (Supabase SSR client)
