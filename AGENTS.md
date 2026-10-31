# AGENTS.md — AI Agent Instructions & Guardrails for Bifogat 🐝

This file defines guardrails, UX principles, and quality control protocols for AI agents (Claude, Gemini, Cursor, Copilot, etc.) working on the **Bifogat** codebase.

---

## 1. Mandatory Hard Verification Loop

Before completing any code modification or pull request, the AI agent **MUST** run the following command and verify that all steps pass with zero errors or warnings:

```bash
npm run check
```

This command executes in sequence:
1. `npm run lint`: `oxlint` with strict rules (`no-unused-vars`, `no-duplicate-case`, `no-dupe-keys`, `no-loss-of-precision`, etc.).
2. `npm run test`: Node.js test runner covering domain logic, migrations, swipe navigation, keyboard dismissal, and bee flight physics.

---

## 2. Soft Guardrails & UX Principles

### 📱 Mobile-First & Soft Keyboard Discipline
- **No Automatic `autoFocus` in Modals/Bottom Sheets**: Modal form fields must never use `autoFocus` on opening, as it automatically triggers the software keyboard and hides screen context/overview.
- **`autoComplete="off"` as Default**: All single-line input fields must specify `autoComplete="off"` (along with `autoCorrect="off"` and `spellCheck={false}` where appropriate) to prevent intrusive mobile suggestions.
- **Upper-Half Placement in Modals**: Key text inputs must be positioned in the upper half of modal cards so they remain fully visible above the software keyboard.
- **Enter Dismisses Keyboard**: Single-line text, date, and number inputs release focus (`blur()`) on pressing `Enter` to easily dismiss the software keyboard. Multiline `<textarea>` fields retain line breaks.

### 🎨 Clean Typography & Zero Emojis on Quick Action Buttons
- **Use Icons, Not Emojis**: Use **Lucide SVG icons** (`<Search />`, `<Droplet />`, `<Shield />`, `<Layers />`, `<Sparkles />`, etc.) for buttons, chips, and navigation surfaces. Do not use emoji characters on UI buttons or interactive chips.
- **Single Observation Field**: In forms like *Log Apiary Visit*, prefer a single combined notes field where the title/summary is derived automatically using `deriveEventTitle` (without any data loss).

### 🔄 State & Navigation Memory
- **Scroll Memory Per Tab**: When switching navigation tabs, save the vertical scroll position (`window.scrollY`) per `NavTab` in `App.tsx` and restore it upon return.
- **Swipe Navigation**: Preserve two-way synchronized slide transitions and horizontal swipe gestures between tabs.

### 📹 Visual & Animation Testing with Playwright
- **Frame-by-Frame Recording**: When modifying tab transitions, bottom sheet gestures, software keyboard layouts, or flight animations, follow [PLAYWRIGHT_ANIMATION_INSPECTION.md](./PLAYWRIGHT_ANIMATION_INSPECTION.md) to record and inspect micro-interactions.

---

## 3. Code Architecture & Guidelines
- **Local-First (Offline)**: All data is saved first to IndexedDB (`hiveRepository`, `eventRepository`, `taskRepository`, `harvestRepository`, `transactionRepository`).
- **Google Sheets Sync (Outbox Pattern)**: Synchronization occurs asynchronously via the outbox pattern (`outboxRepository`). Storage changes must never block user UI interactions.
- **Type Safety**: New domain fields must first be declared in `src/domain/types.ts` and validated in `src/domain/validation.ts`.

---

## 4. Pre-Commit / PR Checklist
- [ ] Executed `npm run check` with 0 lint warnings and 0 test failures.
- [ ] No new `autoFocus` attributes in modal dialogues.
- [ ] Zero emojis on new buttons or chips.
- [ ] New domain or utility features covered by unit tests in `src/**/*.test.ts`.
