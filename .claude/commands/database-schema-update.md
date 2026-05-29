---
name: database-schema-update
description: Workflow command scaffold for database-schema-update in DOM.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /database-schema-update

Use this workflow when working on **database-schema-update** in `DOM`.

## Goal

Modifies the database schema, often to add, remove, or update columns/tables, sometimes with related backend changes.

## Common Files

- `drizzle/schema.ts`
- `server/db.ts`
- `scratch/seed_cities.ts`
- `scratch/update_cities_rj.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit drizzle/schema.ts to update schema definitions
- Optionally edit server/db.ts for logic changes
- Optionally update or add seed/migration scripts

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.