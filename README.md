# Gridline Field Operations

Offline-capable field service management prototype for electric utility crews. Supervisors use the web dashboard to review and assign jobs; technicians use an installable PWA to complete assigned work, capture notes/photos, and queue updates during poor connectivity.

## Submission links

- **Source repository:** [github.com/kuldeepSingh102/Field-Service-Management](https://github.com/kuldeepSingh102/Field-Service-Management)
- **Deployed app:** [field-service-management-eta.vercel.app](https://field-service-management-eta.vercel.app/)
- **Research note:** [RESEARCH_NOTE.md](./RESEARCH_NOTE.md)

The deployed app supports a guest preview. Live company flows require the deployment to be connected to a configured Supabase project with the migrations below applied.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```sh
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no Supabase environment variables, the app runs in demo mode and the guest dashboard remains available. Demo data is illustrative; it is not a utility’s live operational data.

To enable authenticated, company-scoped data:

1. Copy `.env.example` to `.env.local`.
   - PowerShell: `Copy-Item .env.example .env.local`
   - macOS/Linux: `cp .env.example .env.local`
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` using the values from the Supabase project’s Connect panel.
3. Configure the Supabase database and Auth redirect URLs below.
4. Restart the development server after changing environment values.

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or browser code.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run these migrations in timestamp order:
   - `supabase/migrations/20261123000000_gridline_core.sql`
   - `supabase/migrations/20261123010000_role_permissions.sql`
   - `supabase/migrations/20261124000000_signup_approval.sql`
3. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/**` to the redirect URL allow list.
4. For local testing, email confirmation can be disabled in the Email provider settings. For real users, enable confirmation and configure a custom SMTP provider so confirmation emails can be delivered reliably.
5. Start the app and visit `/signup`. The first user creates a company and becomes its admin. The admin shares the company signup code from **Access requests**. A new user requests Technician or Supervisor access; an admin must approve the request before that user can see company data.

The browser uses the Supabase publishable key and the signed-in user’s session. Company and role access is also enforced by PostgreSQL Row Level Security (RLS). The migrations create the private `work-order-attachments` storage bucket and enable work-order realtime updates.

## Roles and preview

| Role | Current behavior |
| --- | --- |
| Guest | Read-only sample dashboard; can explore without an account. |
| Admin | First account that creates a company; can share its signup code and approve/reject Supervisor or Technician access requests. |
| Supervisor | Reviews company operations and creates/assigns work orders to approved company technicians. |
| Dispatcher | Role and database policies exist for operational coordination, but signup does not offer Dispatcher as a self-requested role. |
| Technician | Uses `/field` for assigned work, status updates, checklists, notes, and supported photo/PDF attachments. |

## End-to-end demo flow

1. Open `/` signed out and inspect the guest preview.
2. Create a company/admin account at `/signup` (or use an already configured demo account, if provided separately).
3. From **Access requests**, copy the company signup code.
4. Create a second account requesting Technician access with that code; approve it from the admin account.
5. Sign in as a Supervisor, create a work order, and assign the approved Technician from the live roster.
6. Sign in as that Technician and open `/field`. Start the job, update the checklist, add a note, and select an attachment.
7. To show offline behavior, load the field workspace first, switch the browser offline in DevTools, save a field update, then reconnect while keeping the app open. The app retries queued updates and media.

Do not present the starter checklist content as utility-approved safety instructions. The technician checklists are still sample/local definitions; the dashboard’s inspection-template view reads company templates, but those templates are not yet wired into the field checklist.

## What is implemented

- Guest preview and Supabase email/password sign-in/sign-up.
- Company creation, signup code, and in-app approval for Supervisor/Technician access.
- Company-scoped work orders, approved technician picker by database ID, priority/status handling, CSV export, and work-order realtime refresh.
- Dynamic signed-in views for company crew, assigned-work schedule, assets, inspection templates, districts, and completion trend.
- Technician field view for assigned work, local progress, notes, checklist interaction, and attachment capture/selection.
- IndexedDB queue for field updates and media; local storage for smaller field/order snapshots; reconnect retry while the app is open.
- PWA manifest, service worker, public shell assets, and offline fallback.

## Research, decisions, and trade-offs

The project models work orders as the office-to-field handoff, uses stable technician IDs for assignment, and enforces company boundaries in PostgreSQL RLS. An installable PWA fits the dashboard-plus-phone brief and shares one frontend; IndexedDB can retain queued updates and media. Sync is foreground retry rather than guaranteed background sync. Full conflict resolution, idempotency, asset/template editing, integration with utility GIS/OMS/EAM systems, automatic assignment, live GPS tracking, push notifications, PDF reports, and billing are outside this prototype’s current scope.

See [RESEARCH_NOTE.md](./RESEARCH_NOTE.md) for sources.