# Auth & Access Control Design

**Date:** 2026-03-22
**Status:** Approved
**Project:** JVA CRM (jvacrmv2.vercel.app)

---

## Overview

Add authentication and role-based access control to the JVA CRM so that only invited JVA members can access the system. Uses Supabase Auth natively to avoid additional libraries and keep auth, database, and RLS in one place.

---

## New Dependencies

```bash
npm install @supabase/ssr
```

Required for HTTP-only cookie-based session management in Next.js App Router.

---

## Authentication Flow

```
Unauthenticated user → jvacrmv2.vercel.app
  ↓ proxy.ts detects no session cookie
  ↓ Redirect to /login

/login → email + password form
  ↓ Supabase Auth authenticates
  ↓ Role fetched from profiles table
  ↓ Session cookie issued (includes role claim)
  ↓ Redirect to / (CRM dashboard)

Logout → session cleared → redirect to /login
```

**Protected routes:** all routes (`/`, `/templates`, `/api/*`, `/admin/*`)
**Public routes:** `/login` only

**Out of scope:** returnTo redirect after login (team is small, not needed)

---

## Role Design

Roles are stored in a `profiles` table in Supabase, linked to `auth.users`.

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  role text not null default 'member', -- 'admin' | 'member'
  created_at timestamptz default now()
);

-- Auto-create profile row on new user signup/invite
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'member');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
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

Initial admin: `sorasasaki140508@gmail.com` (manually set after first login via Supabase dashboard)

---

## Implementation Components

### New Files

| File | Purpose |
|---|---|
| `app/login/page.tsx` | Login page (email + password form) |
| `app/admin/members/page.tsx` | Member management (invite, delete, role change) |
| `proxy.ts` | Route protection (replaces middleware.ts in Next.js 16) |
| `lib/auth.ts` | Auth helper functions (getSession, getRole, requireAdmin) |

### Modified Files

| File | Change |
|---|---|
| `lib/supabase.ts` | Add `createBrowserClient()` and `createServerClient()` using `@supabase/ssr` |
| `app/layout.tsx` | Add logout button to header |
| `app/api/**` | Add session validation to all API routes |

### Supabase Changes

1. Enable Email Auth (Supabase dashboard → Authentication → Providers)
2. Create `profiles` table with trigger (SQL above)
3. RLS policies on `profiles`:
   - Authenticated users can read their own profile
   - Admins can read all profiles (via service role in API routes)
   - Only admins can update roles (enforced in API, not RLS, since service role bypasses RLS)
4. Invitation email: use Supabase default SMTP, default 24-hour link expiry
5. Add `profiles` table + trigger + RLS policies to `supabase/schema.sql` (not just Supabase dashboard)

---

## Role Check Strategy

**proxy.ts** (Node.js runtime — DB checks avoided for performance, runs on every route prefetch):
- Reads session cookie and JWT custom claim only (no DB calls)
- Redirects unauthenticated users to `/login`
- Redirects non-admin users away from `/admin/*` (403 page)
- Note: `config.matcher` excludes `/api/*` — API routes handle their own auth

**API routes** (Node.js runtime — full DB access):
- All API routes call `getServerSession()` from `lib/auth.ts`
- Return 401 if no session, 403 if insufficient role
- Use `createServerClient()` (cookie-based) for user-scoped queries
- Admin-only API routes additionally check `role === 'admin'`

**Setting role in JWT custom claim:**
- Use Supabase **Auth Hook** (`custom_access_token` hook — configured in Supabase dashboard as a DB function)
- The hook reads `profiles.role` and injects it into the JWT `app_metadata` on every token issue/refresh
- This ensures proxy.ts can read the role from the JWT without a DB call, including on first login

---

## Member Invitation Flow

1. Admin opens `/admin/members`
2. Enters invitee's email → calls `/api/admin/invite`
3. API route calls Supabase Admin API to send invitation email
4. Invitee receives email → clicks link → sets password → lands on CRM as `member`
5. `on_auth_user_created` trigger auto-inserts `profiles` row with `role = 'member'`
6. Admin can change role from `/admin/members` if needed

---

## Security Notes

- `/admin/*` routes: role check in `proxy.ts` (reads JWT claim) + server-side double-check in page
- All API routes validate session server-side before processing any request
- `SUPABASE_SERVICE_ROLE_KEY` usage in API routes is protected behind session check
- RLS on `profiles` prevents members from reading other members' data directly
- Role escalation only possible via admin API route (which checks role server-side)
