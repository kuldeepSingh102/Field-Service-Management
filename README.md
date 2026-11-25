# Gridline Field Operations


Offline-capable utility field service workspace built with Next.js App Router, React, TypeScript, Tailwind CSS, shadcn-style UI primitives, and Supabase.

## Start locally

Use Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. With no Supabase environment variables, the app runs with local demo data. Work-order changes and field submissions are stored on the device in IndexedDB/local storage. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local` to turn on cookie-based Supabase Auth, database writes, attachment uploads, and realtime work-order updates.

Copy `.env.example` to `.env.local` and fill the values from the Supabase project's Connect panel.

### Roles and guest preview

The dashboard is available to guests as a read-only sample workspace. The **Sign in** link opens login, and the login page links to self-signup. New users can create a company (becoming its first admin) or join a company with its signup code and request Supervisor or Technician access. Join requests remain blocked from company data until an admin approves them in-app. Authenticated users are routed by role:

| Role         | Intended access                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`      | Company-wide access; review access requests and manage crew, customers, assets, inspection templates, work, and schedules. The first account that creates a company becomes its admin. |
| `supervisor` | View company operations and manage work orders and schedules.                                                                                                                          |
                                                      |
| `technician` | Field workspace with assigned jobs; update job status and submit assigned-job field updates and attachments.                                                                           |

The migrations enforce company, approval, and role access in PostgreSQL Row Level Security, not only in the interface. The signup RPC never grants a requested Supervisor or Technician role; an approved admin makes that change. Approval also creates the technician record when the approved role is Technician.

## Included workflows

- Supervisor dashboard, priority work orders, status filters, schedule, asset list, inspection library, and CSV export.
- Create and assign work orders to approved company technicians by database ID; the roster refreshes automatically, and offline assignments sync when reconnected.
- Signed-in crew, assigned-work schedule, asset register, inspection templates, district breakdowns, and completion trend load from the current company database. Guest preview data stays illustrative and read-only.
- Technician workspace with assigned jobs, structured checklists, field notes, camera/photo attachments, and completion updates.
- IndexedDB queue for offline work updates and photo files, with retry on reconnect.
- PWA manifest and service worker for install metadata, static app assets, and offline fallback.
- Realtime work-order refresh through Supabase Realtime.

## Industry-informed workflow choices

The workflow reflects utility field-work patterns such as planned maintenance, service calls, outage/restoration dispatch, technician assignment, structured inspection and defect capture, map/location context, and offline job execution. References: [Oracle Utilities mobile workforce process](https://docs.oracle.com/cd/E29302_01/5.3%20Connect%20Products%20and%20Services/5.3.2_MWMv2.0.1_Manage_Fieldwork.pdf), [Esri electric utility field operations](https://www.esri.com/en-us/industries/electric/initiatives/field-operations), and [ServiceNow field service mobile documentation](https://downloads.docs.servicenow.com/pdf/enus/servicenow-xanadu-field-service-management-enus.pdf).

This is a product prototype, not a substitute for approved switching instructions, safety permits, or a utility's authoritative GIS/OMS/EAM systems. Live technician location tracking is intentionally not enabled.

The original static prototype is kept in [`prototype-static/`](./prototype-static/) as a reference snapshot.
