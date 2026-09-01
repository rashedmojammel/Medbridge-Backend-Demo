# Medbridge Backend (RHCP)

Rural Healthcare Consultation Platform — chat-based telemedicine backend.
NestJS 11 · TypeScript · PostgreSQL · TypeORM · JWT · Socket.IO

This backend has been built and verified end-to-end: builds clean, boots against
PostgreSQL, and the full demo flow (register -> login -> CHW registers patient ->
triage -> CRITICAL alert -> doctor+admin notified -> live chat -> prescription
issued & immutable -> low-stock alert -> RBAC enforced) has been tested live.

## Quick start

```bash
npm install
cp .env.example .env      # fill in your local Postgres password
# create the database:  psql -c "CREATE DATABASE medbridge;"
npm run seed               # creates demo users, patients, medicines, a pre-staged critical patient
npm run start:dev
```

API runs on http://localhost:3001
Swagger docs: http://localhost:3001/api/docs

## Seeded demo logins (password: `password123` for all)

| Role | Email |
|---|---|
| Admin | admin@medbridge.com |
| Doctor | doctor1@medbridge.com (Dr. Sarah Miller, Cardiology) |
| CHW | chw1@medbridge.com (Mary Johnson, Block A) |
| Pharmacist | pharmacist1@medbridge.com |

A pre-staged CRITICAL patient (Momtaz Hossain, MRN P-2026-000050, id 50) is seeded so
you can demo the emergency-alert flow live: POST /triage/vitals then POST /triage/symptoms
with triageStatus "CRITICAL" for patientId 50 - watch the doctor's and admin's
/notifications light up.

## Module map

auth . users (+ public directory) . patients . triage . consultations (+ chat.gateway.ts
Socket.IO) . prescriptions (+ treatment-plans) . medicines (+ inventory + alternatives)
. appointments . notifications (shared service, injected everywhere)

## Chat (Socket.IO)

Namespace: `/chat`. Connect with `{ auth: { token: JWT } }`.
Events: joinRoom, sendMessage, typing (client to server); newMessage, userJoined,
userLeft, consultationEnded (server to client).

## Verified behaviors (tested live against a real Postgres instance)

- Clean `nest build` with zero TypeScript errors; all 9 modules wire up with no DI errors
- MRN auto-generation (P-YYYY-NNNNNN), unique, transactional - confirmed sequential
- Rule-based triage suggestion + CRITICAL alert fired to doctor AND all admins in one transaction
- Prescriptions immutable once issued (no PATCH route exists - confirmed 404; cancel endpoint works)
- Real-time chat: two live socket clients, joinRoom, presence broadcast, message
  persisted then broadcast, chat locked after consultation completion - all confirmed
- Low-stock alert fires exactly when stock crosses below threshold; stock floor at 0 enforced (400)
- RBAC: role + ownership checks confirmed (CHW blocked from prescribing -> 403 verified live)
- Public directory returns zero private fields (no email/phone/password) - verified live

## Team ownership

| Member | Modules |
|---|---|
| 1 | auth, users, config, seeds |
| 2 | patients, triage |
| 3 | consultations (incl. chat gateway), prescriptions |
| 4 | medicines, appointments, notifications |

See the project's ARCHITECTURE.md / PRD.md / API_ENDPOINTS.md docs for full design detail.
