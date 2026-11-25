# Gridline Field Operations

A utility field service management PWA prototype for supervisor dispatch and technician work execution.

## Run locally

Service workers require localhost or HTTPS. From this folder, run:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`. Use the **Open field mode** card to switch to the technician experience. The connection badge can toggle a demo offline state. Browser connectivity changes are detected too.

## What works

- Supervisor overview with open work, crew activity, SLA and district summaries.
- Priority work order table, status filters, CSV export, and local work order creation/assignment.
- Technician assignments with start, checklist, field notes, camera/photo input, and completion actions.
- Checklist progress, field updates, and attached image blobs are stored locally. Work orders and the pending sync queue use local storage; image files use IndexedDB.
- PWA install metadata and a service worker that caches the app shell. The pending queue syncs when connectivity returns.
- Data is seeded demo content. There is no server, authentication, shared database, push delivery, or real dispatch integration yet.

## Industry references

The product structure reflects common utility field workflows: work orders span planned maintenance, asset inspections, service calls, and restoration; dispatch needs assignment and status visibility; field teams need map/location context, structured checklists, and offline access; completed work and inspection findings need to flow back to the office. These patterns appear in [Oracle Utilities’ fieldwork process](https://docs.oracle.com/cd/E29302_01/5.3%20Connect%20Products%20and%20Services/5.3.2_MWMv2.0.1_Manage_Fieldwork.pdf), [Esri’s electric utility field operations guidance](https://www.esri.com/en-us/industries/electric/initiatives/field-operations), and [ServiceNow’s FSM mobile documentation](https://downloads.docs.servicenow.com/pdf/enus/servicenow-xanadu-field-service-management-enus.pdf). The prototype uses these as workflow references, not as a substitute for a utility’s approved safety procedures or systems of record.
