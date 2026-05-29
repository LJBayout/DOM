```markdown
# DOM Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches the core development patterns and workflows for the DOM repository, a TypeScript project using the Vite framework. The codebase is organized into client and server components, supporting features like event sheet ("ficha") management, dashboard/admin UI, file storage, and database schema evolution. The repository follows clear coding conventions and structured commit patterns, enabling efficient feature development, UI enhancements, storage updates, and database migrations.

## Coding Conventions

**File Naming:**
- Use camelCase for file names.
  - Example: `fichaForm.tsx`, `storageProxy.ts`

**Import Style:**
- Mixed usage of default and named imports.
  - Example:
    ```typescript
    import React from "react";
    import { useState } from "react";
    import * as storage from "../server/storage";
    ```

**Export Style:**
- Prefer named exports.
  - Example:
    ```typescript
    export function uploadFile(file: File) { ... }
    export const MAX_SIZE = 10 * 1024 * 1024;
    ```

**Commit Patterns:**
- Conventional commits with prefixes: `feat`, `fix`, `style`
- Example: `feat: add GPS auto-fill to FichaForm (closes #42)`

## Workflows

### Feature Development: FichaForm & FichaView
**Trigger:** When adding or enhancing ficha (event sheet) functionality, such as auto-fill, export, GPS, or layout.
**Command:** `/feature-ficha`

1. Edit `client/src/pages/FichaForm.tsx` to add or enhance form features.
2. Edit `client/src/pages/FichaView.tsx` to update ficha viewing/export features.
3. Optionally, update backend/AI support in `server/ai.ts` or `server/routers.ts`.
4. Optionally, update UI in `client/index.html` or `client/src/index.css`.
5. Optionally, update storage/export logic in `server/storage.ts`.

**Example:**
```typescript
// client/src/pages/FichaForm.tsx
export function FichaForm() {
  // Add new auto-fill field
  const [gps, setGps] = useState("");
  // ...
}
```

---

### Database Schema Update
**Trigger:** When changing the structure of the database (e.g., add/remove columns, implement soft delete).
**Command:** `/update-schema`

1. Edit `drizzle/schema.ts` to update schema definitions.
2. Optionally, update logic in `server/db.ts`.
3. Optionally, update or add seed/migration scripts (e.g., `scratch/seed_cities.ts`).

**Example:**
```typescript
// drizzle/schema.ts
export const ficha = pgTable("ficha", {
  id: serial("id").primaryKey(),
  deletedAt: timestamp("deleted_at").nullable(), // Soft delete
});
```

---

### Dashboard or AdminPanel UI Enhancement
**Trigger:** When adding new UI features or polishing the Dashboard/AdminPanel experience.
**Command:** `/ui-dashboard`

1. Edit `client/src/pages/Dashboard.tsx` or `client/src/pages/AdminPanel.tsx` for UI elements.
2. Optionally, update `client/src/pages/FichaView.tsx` for related UI changes.
3. Optionally, update styles in `client/src/index.css`.

**Example:**
```typescript
// client/src/pages/Dashboard.tsx
export function Dashboard() {
  return (
    <button className="primary">Export All Fichas</button>
  );
}
```

---

### Storage or Upload Feature Update
**Trigger:** When adding, fixing, or enhancing file upload or storage proxy capabilities.
**Command:** `/storage-update`

1. Edit `server/_core/storageProxy.ts` or `server/storage.ts` for backend storage logic.
2. Edit `client/src/pages/FichaForm.tsx` for upload UI/logic.
3. Optionally, update `package.json` and `pnpm-lock.yaml` for dependency changes.

**Example:**
```typescript
// server/storage.ts
export function saveFile(file: Buffer, filename: string) {
  // Enforce file size limit
  if (file.length > MAX_SIZE) throw new Error("File too large");
  // ...
}
```

## Testing Patterns

- Test files follow the pattern `*.test.*` (e.g., `fichaForm.test.tsx`).
- Testing framework is unspecified; look for test files alongside source files.
- Example test file:
  ```typescript
  // fichaForm.test.tsx
  import { render } from "@testing-library/react";
  import { FichaForm } from "./fichaForm";

  test("renders FichaForm", () => {
    render(<FichaForm />);
    // assertions...
  });
  ```

## Commands

| Command          | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| /feature-ficha   | Start or enhance ficha (event sheet) features                  |
| /update-schema   | Update the database schema and related backend logic           |
| /ui-dashboard    | Add or improve Dashboard/AdminPanel UI features                |
| /storage-update  | Implement or fix file upload/storage proxy features            |
```
