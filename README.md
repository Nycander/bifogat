# Bifogat 🐝

> **Offline-first Beekeeping Management System & Apiary Journal**
>
> *Bifogat* (Swedish for *"Attached / Enclosed"*) is a modern, mobile-first Progressive Web Application (PWA) designed for beekeepers. It provides effortless hive logging, harvest tracking, jar inventory, and apiary accounting — built to work reliably right out in the field without cellular service.

---

## 🌟 What Problem Bifogat Solves

Beekeeping happens in the field — often in remote apiaries where mobile reception is weak or non-existent, and where hands are covered in propolis or wearing thick gloves. Traditional paper logbooks get wet or misplaced, while cloud-only farm management apps fail when offline or lock your data into proprietary walled gardens.

**Bifogat solves this by providing:**

1. **True Offline-First Reliability**: Every inspection, harvest, task, and transaction is saved instantly to local browser storage (`IndexedDB`). You can log visits in the middle of a forest without an internet connection.
2. **Effortless In-Field Logging**: Designed for fast, thumb-friendly navigation with high-contrast UI, drag handles, quick-observation tags, and automatic visit title generation so you spend less time tapping on a screen and more time with your bees.
3. **End-to-End Honey Yield & Inventory Tracking**: Connects raw honey extraction (slungning) with gradual jar bottling, tracking water content percentages, jar sizes, and remaining bucket volumes across seasons.
4. **Smart Apiary Accounting**: Easily record honey sales, parse Swish mobile payment screenshots using local OCR, map customer aliases, and track expenses for wax, frames, and sugar syrup.
5. **Data Ownership via Google Sheets**: You own 100% of your data. Optionally sync your local database with your own Google Spreadsheet on Google Drive — completely transparent, accessible, and exportable at any time.

---

## ✨ Key Features

### 🐝 Hive Journal & Inspection Log
- **Multi-Hive Apiary Management**: Track active, inactive, merged, or archived colonies.
- **3-Step Visit Wizard**: Quick hive selector, date picker, action type classification (Inspection, Feeding, Treatment, Super Addition, Queen Check, Other), and single-field observation notes.
- **Quick-Tag Observation Cloud**: Add common observations (*"Queen seen"*, *"Eggs in all stages"*, *"Plenty of stores"*, *"Calm temperament"*) with a single tap without closing the soft keyboard.
- **Smart Title Derivation**: Automatically generates descriptive visit summaries from your notes without losing raw details.
- **Hive History**: Review past inspections, colony trends, and notes per hive.

### 🍯 Honey Harvest & Jar Bottling System
- **Two-Stage Harvest Workflow**:
  1. **Extraction Day (Slungning)**: Create harvest batches (*Spring Harvest 2026*, *Summer Harvest 2026*), record total scale weight, refractor water content percentage (%), and quality warnings (< 18% excellent, > 20% risk of fermentation).
  2. **Jar Bottling (Tappning)**: Record bottling events over time (e.g. 500g, 350g, 250g, 700g jars) against a batch, automatically deducting from the remaining honey in settling tanks.
- **Automatic Forage Period Calculation**: Automatically computes forage dates based on the previous extraction date or the start of the spring flow.
- **Honey Preparation Types**: Track liquid fresh honey (*nyslungad*) vs. churned/crystallized honey (*rörd/ympad*).
- **Apiary Harvest Statistics**: Year-over-year yield comparisons, average yield per colony, and record season tracking.

### 📋 Task & Action Planning
- **Apiary & Hive-Specific To-Dos**: Schedule tasks for specific hives (*"Add second super"*, *"Treat with oxalic acid"*) or general apiary maintenance.
- **Integrated Inspection Checklists**: Check off pending tasks directly inside the hive visit wizard while inspecting.
- **Overdue Task Indicators**: Clear visual alerts for overdue colony chores.

### 💰 Apiary Economy & Swish OCR Inbox
- **Income & Expense Tracking**: Log honey sales and equipment expenses with running balance calculation and annual P&L summaries.
- **Swish Screenshot OCR Inbox**: Upload Swish mobile payment screenshots. Local optical character recognition (OCR) parses payer names, amounts, and dates directly on your device.
- **Smart Customer Alias Mapping**: Automatically resolves Swish payer names to customer profiles and remembers past purchase habits.
- **CSV & Text Import**: Import historical banking CSVs and unstructured notes.

### ☁️ Offline Sync & Google Sheets Integration
- **Outbox Pattern**: Local changes queue safely in IndexedDB and synchronize asynchronously when online.
- **Google Sheets as Database**: Uses your personal Google Sheet as the cloud backend via Google Drive.
- **Read-Only Dry-Run Mode**: Optional manual confirmation safeguard allowing you to inspect changes before writing to Google Sheets.
- **Conflict Resolution**: Smart timestamp conflict detection with visual side-by-side resolution.

### 📱 Mobile-First UX & Animation System
- **Progressive Web App (PWA)**: Installable on iOS and Android with offline caching via Service Worker.
- **Gesture Navigation**: Two-way horizontal swipe transitions between tabs with scroll position memory.
- **Touch & Glove Friendly**: Touch-optimized steppers, buttons, and custom accessible checkboxes.
- **Continuous Bee Flight Physics**: Smooth, procedural bee flight path animations reflecting navigation state and user interactions.

---

## 🛠️ Technology Stack

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Server**: [Vite](https://vitejs.dev/)
- **Styling**: Pure CSS with semantic tokens (CSS Custom Properties), custom dark/light theme, and [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Local Database & Storage**: IndexedDB (via custom repository pattern)
- **Local OCR Engine**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Authentication & Cloud Sync**: Firebase Auth (Google Sign-In) + Google Sheets API v4
- **Testing & Verification**: Node.js native test runner (`node:test`), [Playwright](https://playwright.dev/) for animation and visual inspection
- **Package Manager**: [pnpm](https://pnpm.io/)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v24.0.0 or higher
- **pnpm**: v9 or higher

### Local Development

```bash
# Install dependencies
pnpm install

# Start local dev server (port 3000)
pnpm dev

# Run full test suite & linter
pnpm check

# Build production PWA bundle
pnpm build
```

---

## 📄 License

Open-source software released under the [MIT License](LICENSE).
