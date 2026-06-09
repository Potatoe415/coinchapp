# AGENTS

Purpose: Canonical operating protocol for all agents and humans.
Status: Source of truth. All other agent files route here.
Scope: Entire repository.

---

## 1. Startup Protocol

Load files on a strict need-to-know basis.

| Condition | Load |
|---|---|
| Always | `STATE.md` |
| Task touches scope, users, features, UX, or acceptance criteria | `docs/PRODUCT.md` |
| Task touches stack, DB, security, infra, or code structure | `docs/TECH.md` |
| Task touches data model, entities, fields, tables, collections, relationships, indexes, constraints, migrations, queries, or permissions | `docs/DATA_MODEL.md` |
| Task touches planning or prioritisation | `docs/BACKLOG.md` |
| About to reverse or modify a prior decision | `docs/DECISIONS.md` |
| Task contains or implies: run / command / script / setup / start / test / check / lint / build / deploy / migrate / seed / install | `docs/RUNBOOK.md` |
| Resuming after time away (> 1 day) | `docs/DECISIONS.md` + Recent_Changes in `STATE.md` |

Do not load `docs/DECISIONS.md`, `docs/DATA_MODEL.md`, or `docs/RUNBOOK.md` by default.

---

## 2. Execution Protocol

- Make the smallest coherent change.
- Do not silently choose a stack, framework, DB, hosting, auth, or payment provider.
- Flag conflicts with `docs/PRODUCT.md` or `docs/TECH.md` immediately.
- Ask for explicit user confirmation before modifying `docs/PRODUCT.md` or `docs/TECH.md`.
- Prefer boring, maintainable solutions. No speculative architecture.
- No placeholder production logic unless marked `# TEMP` with a reason.
- No secrets in committed files. Never read, print, or summarise `.env` values.

---

## 3. Update Protocol

Run after every meaningful unit of work.

### Always update
- `STATE.md`: replace Current_Goal, Last_Action, Next_Actions. Append one line to Recent_Changes (keep max 5).

### Update when tasks change
- `docs/BACKLOG.md`: move items between Now / Next / Later / Done / Blocked.

### Update when data structure changes
- `docs/DATA_MODEL.md`: update entities, fields, relationships, constraints, and access rules.

### Update with user confirmation
- `docs/PRODUCT.md`: when core features, user roles, objectives, or constraints change.
- `docs/TECH.md`: when stack, conventions, or architecture principles change.
- Do not update for implementation details, style choices, or local config.
- Always ask the user before modifying these files. Never edit them autonomously.

### Append when a non-trivial decision is made
- `docs/DECISIONS.md`: use the standard template (see file).

**Decision threshold** - log if any of these is true:
- Locks in a technology, library, or vendor.
- Changes the data model, persistence structure, ownership rules, or access model.
- Changes ownership or structure of a file or module.
- Cannot be reversed in under 30 minutes.
- Contradicts a previous entry in `docs/DECISIONS.md`.

If unsure: add an Open_Question to `STATE.md`, not a decision entry.

---

## 4. Token Discipline

- Start every task with `STATE.md` only.
- Load additional files only when the Startup Protocol table matches.
- Do not read the whole repository by default.
- Do not load generated files, dependencies, build outputs, logs, raw data, or lockfiles unless explicitly needed.
- Prefer targeted file reads over broad scans.
- If a file is large, read only the relevant section first.

---

## 5. Language Rules

- Code, filenames, comments, commits, docs: English.
- User-facing copy: language defined by the product.
- No corporate filler. No vague summaries.
- Use concrete facts, paths, commands, and decisions.

---

## 6. Code Discipline

### Simplicity first
- Do not write code that is not needed right now. (YAGNI)
- The simplest solution that works is always preferred. (KISS)
- No speculative abstractions, no future-proofing unless explicitly requested.

### Before writing anything
- Search the codebase for existing logic that does the same thing.
- Reuse before creating. Extend before duplicating.
- If similar code exists in 2+ places, extract it before adding a third. (DRY)

### Surgical changes
- Touch only what the task requires. Do not improve adjacent code, comments, or formatting.
- Match existing style, even if you would do it differently.
- Do not refactor things that are not broken.
- If you notice unrelated dead code, mention it - do not delete it.
- Remove imports, variables, or functions that YOUR changes made unused. Do not remove pre-existing dead code unless asked.
- Every changed line must trace directly to the user's request.

### Size limits
- Max lines per file: 300 (excluding comments and blank lines). Use judgment - split earlier if the file has mixed responsibilities.
- Max lines per function: 30.
- If a file exceeds 300 lines: split by responsibility, not by size.
- If a function exceeds 30 lines: extract named sub-functions.
- Exception: generated files, migrations, and test fixtures are exempt.

### Modularity
- One file = one responsibility. (SRP)
- One function = one action, clearly named after what it does.
- A function name should make its body almost unnecessary to read.
- Dependencies flow one way. No circular imports.

### When not to code
- Configuration over code when possible.
- If a library already does it well, use the library.
- Delete code that is no longer used. Dead code is not harmless.

### Frontend - LLM-addressable UI
- Every meaningful UI element must have a stable `data-id` attribute.
- "Meaningful" means: any element an agent or developer might need to debug, test, modify, or reference - buttons, forms, inputs, modals, sections, cards, navigation items, error states.
- Use `data-id`, not `id` (avoids CSS/JS conflicts and keeps it agent-specific).
- Values must be kebab-case, descriptive, and unique within the page: `data-id="checkout-submit-button"`, `data-id="user-profile-avatar"`, `data-id="error-banner-auth"`.
- Do not use positional or generic names: `data-id="button-1"` or `data-id="div-main"` are invalid.
- `data-id` values must not change unless the element's purpose changes. Treat them like a public API.
- When modifying an existing element, preserve its `data-id` unless the element's role has changed.

---

## 7. Before Acting

### State assumptions first
- Before implementing, state your assumptions explicitly.
- If multiple interpretations exist, present them - do not pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what is confusing. Ask.

### Define success criteria
Transform every task into verifiable goals before starting:
- "Add validation" -> "Write tests for invalid inputs, then make them pass."
- "Fix the bug" -> "Write a test that reproduces it, then make it pass."
- "Refactor X" -> "Ensure tests pass before and after."

For multi-step tasks, state a brief plan before acting:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Weak criteria ("make it work") require constant clarification. Strong criteria let you loop independently.

---

## 8. File Ownership

| File | Rule |
|---|---|
| `AGENTS.md` | Edit only to improve agent workflow. |
| `STATE.md` | Replace on every update. Never append history here. Max 60 lines. |
| `docs/PRODUCT.md` | Living document. Never edit autonomously - confirm with user first. |
| `docs/TECH.md` | Living document. Never edit autonomously - confirm with user first. |
| `docs/DATA_MODEL.md` | Living document. Update whenever persisted data structure changes. |
| `docs/BACKLOG.md` | Living document. Always current. |
| `docs/DECISIONS.md` | Append-only. Never edit past entries. |
| `docs/RUNBOOK.md` | Update when commands or steps change. |
