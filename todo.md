# Ficha Técnica — Project TODO

## Database Schema
- [x] fichasTecnicas table (id, title, eventName, date, location, status, createdBy, createdAt, updatedAt)
- [x] scheduleItems table (id, fichaId, time, activity, order)
- [x] professionals table (id, fichaId, name, role, order)
- [x] Generate migration SQL and apply via webdev_execute_sql

## Backend (tRPC)
- [x] ficha.list — list all fichas (admin sees all, user sees all)
- [x] ficha.getById — get single ficha with schedule + professionals
- [x] ficha.create — admin only
- [x] ficha.update — admin only (update identification + schedule + professionals)
- [x] ficha.delete — admin only
- [x] adminProcedure middleware for role gating

## Frontend — Design System
- [x] Editorial CSS variables (cream background, Didone serif, high-contrast typography)
- [x] Google Fonts: Playfair Display (Didone serif) + Cormorant Garamond + Inter (sans-serif)
- [x] Global index.css with editorial tokens

## Frontend — Pages
- [x] Login page (Manus OAuth, editorial cover aesthetic)
- [x] Dashboard page (list of Fichas Técnicas, create/edit/delete actions)
- [x] Ficha Técnica form page (create/edit)
- [x] Ficha Técnica view page (read-only for users)

## Frontend — Components
- [x] DashboardLayout with sidebar navigation (inline header nav)
- [x] FichaCard component for dashboard listing
- [x] ScheduleTable component (editable rows: time + activity)
- [x] ProfessionalsList component (dynamic rows: name + role)
- [x] Role-based action buttons (admin vs user)

## Auth & Access Control
- [x] Manus OAuth login flow
- [x] Role-based route protection (admin vs user)
- [x] useAuth hook integration throughout

## Tests
- [x] ficha.create procedure test
- [x] ficha.list procedure test
- [x] adminProcedure access control test

## Quality
- [x] Responsive design (mobile-first)
- [x] Loading and empty states
- [x] Error handling with toast notifications
