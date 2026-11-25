# Gridline Research Note
# ( Field Service Management )

## What I Studied

To understand how utility tasks move from a central office to crews in the field, I reviewed both utility workflow guides and modern web documentation:

**Field Operations (Esri & ServiceNow):** Highlighted how technicians handle asset inspections, storm damage reports, and daily schedules—especially when working in areas with poor cell reception.

**Offline & Security Patterns (MDN & Supabase):** Covered how Progressive Web Apps (PWAs) store offline work using Service Workers and IndexedDB, and how PostgreSQL Row Level Security (RLS) isolates company data at the database level.

## How This Shaped the Design

**Work-Order-Centric Model:** The work order serves as the core record tying a job together. For example, a single work order links a pole’s location and priority level to an assigned technician, their checklist progress, and uploaded field photos.

**One PWA for Office and Field:** Rather than maintaining separate desktop and mobile apps, Gridline uses a single web codebase. A supervisor can dispatch a job from an office browser while a technician completes it on a phone in a signal dead zone—saving quick state snapshots in localStorage and queuing photos in IndexedDB until the connection returns.

**Company-Level Security:** Anyone can explore the interface via a public guest dashboard, while live operational data is protected by Supabase Auth and database RLS policies. For instance, crew members from Company A can only view and update their own organization's work orders, and uploaded attachments stay locked inside private storage buckets.

## Trade-Offs and Limitations

**Foreground Sync Only:** Offline updates and photos upload automatically once connectivity returns while the app is open, rather than syncing in the background after the browser closes. It also lacks conflict resolution if two people edit the same offline record simultaneously.

**Prototype Boundaries:** Live work orders and technician rosters are separated by company, but inspection checklists still run on local sample items instead of a dynamic database template. External integrations—such as GIS mapping, outage management (OMS), and automated scheduling—are also left out.

**Privacy & Safety Rules:** Continuous background GPS tracking was intentionally excluded until clear policies exist around crew consent and data retention. Furthermore, digital checklists help organize field work, but they cannot replace a utility's official safety permits or high-voltage switching procedures.

### Sources

- [Esri — Field Operations for Electric Utilities](https://www.esri.com/en-us/industries/electric/initiatives/field-operations)
- [ServiceNow — Field Service Management mobile experience](https://downloads.docs.servicenow.com/pdf/enus/servicenow-xanadu-field-service-management-enus.pdf)
- [MDN — Offline and background operation for PWAs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [MDN — IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [Supabase — PostgreSQL Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

### AI note
**Where AI helped**: AI was used as a coding assistant to break down project requirements, set up the basic UI/TypeScript structure, and draft initial SQL queries and app code.

**How I verified everything**: Instead of blindly trusting the AI, I manually checked that the code matched your actual routes, components, and database files. I also cross-checked the research notes against the real links and ran code-quality checks (TypeScript, ESLint, and git diff --check).

**Real-world testing disclaimer**: I acknowledge that passing local code checks doesn't guarantee everything works live—real testing on the deployed Supabase database is still necessary.

**Rejecting a bad AI idea**: AI suggested adding live GPS tracking for technicians, but I intentionally said "no" because tracking people's real-time location requires strict privacy rules, user consent, and data retention policies first.
