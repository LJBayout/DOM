---
name: feature-development-fichaform-fichaview
description: Workflow command scaffold for feature-development-fichaform-fichaview in DOM.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-development-fichaform-fichaview

Use this workflow when working on **feature-development-fichaform-fichaview** in `DOM`.

## Goal

Implements or enhances features related to FichaForm and FichaView, often with supporting server logic and AI integration.

## Common Files

- `client/src/pages/FichaForm.tsx`
- `client/src/pages/FichaView.tsx`
- `server/ai.ts`
- `server/routers.ts`
- `client/index.html`
- `client/src/index.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit client/src/pages/FichaForm.tsx to add or enhance form features
- Edit client/src/pages/FichaView.tsx to update ficha viewing/export features
- Optionally edit server/ai.ts or server/routers.ts for backend/AI support
- Optionally update client/index.html or client/src/index.css for UI changes
- Optionally update server/storage.ts or related backend files for storage/export

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.