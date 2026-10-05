# ApparelFlow ERP — AI Usage & Engineering Judgment Live Log

This running log captures real-time architectural scrutiny, AI code audits, detected defects, and human engineering refactors throughout development. It directly feeds into the final `AI_OPTIMIZATION_REPORT.md`.

---

## Log Entry 1: Prisma 7 Schema Datasource URL Deprecation & Driver Adapter Overhead
- **AI Tool / Task:** Scaffolding ORM dependencies for PostgreSQL database modeling.
- **Symptom / Error:** 
  `error: The datasource property 'url' is no longer supported in schema files. Move connection URLs for Migrate to prisma.config.ts and pass either adapter ...`
- **Root Cause:**
  Prisma 7.x completely removed the standard `url` and `directUrl` fields from `datasource db` in `schema.prisma`, requiring new driver adapters (`@prisma/adapter-pg`) or `accelerateUrl`. This adds unnecessary runtime latency and connection pool complexity on serverless Next.js deployments.
- **Human Refactoring:**
  Audited the dependency tree and locked Prisma CLI and `@prisma/client` to `^6.19.3` / `^6.4.1`. This provides rock-solid, production-tested pooled connection handling (`pgbouncer=true` on port 6543) and session-mode migrations (`port 5432`) without fragile experimental adapter configurations.
- **Commit / Phase:** Phase 1 (`feat(db): initial relational schema`)

---

## Log Entry 2: Zero-Tolerance UI Input Contrast & Inverted Dark Mode Defaults
- **AI Tool / Task:** Next.js scaffolding with Tailwind CSS.
- **Symptom / Error:** 
  `@media (prefers-color-scheme: dark)` in `globals.css` defaulted `--background: #0a0a0a` and `--foreground: #ededed`. In UAT testing, form input backgrounds clashed with text tokens, leading to white-on-white text rendering or illegible dropdown selections.
- **Root Cause:**
  Default template styles blindly inherit dark-mode variables without explicit component-level text colors, directly triggering the exact defect highlighted in Section 11 of the engineering specification.
- **Human Refactoring:**
  1. Completely eradicated the dark mode block from `globals.css`.
  2. Enforced `html { color-scheme: light !important; }` and hardcoded high-contrast industrial tokens:
     - Background: Pure White (`#ffffff`)
     - Foreground: Slate-900 (`#0f172a`, `222 47% 11%`)
     - Input borders: Slate-400 / Slate-500 ($\ge 3:1$ contrast)
     - Input text: High-contrast Slate-900
  3. Styled Radix `SelectContent` and `DropdownMenuContent` portals explicitly with solid white backgrounds and dark text to avoid portal token loss.
  4. Added `-webkit-autofill` CSS rules to defeat browser autofill background overrides.
- **Commit / Phase:** Phase 1 (`feat(ui): high-contrast light-only tokens`)

---

## Log Entry 3: Vitest Node 22 Types Peer Dependency Conflict
- **AI Tool / Task:** Test suite scaffolding.
- **Symptom / Error:**
  `npm error ERESOLVE could not resolve peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.3`
- **Root Cause:**
  `create-next-app` initialized with `@types/node@^20` while running under Node v22.14.0, which clashed with Vitest 5's peer resolution.
- **Human Refactoring:**
  Aligned `@types/node` to `@types/node@^22.20.5`, resolving peer dependency trees cleanly without resorting to dangerous `--force` or `--legacy-peer-deps` flags.
- **Commit / Phase:** Phase 1 (`chore: test setup`)
