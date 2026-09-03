# Kumbuka

**Your records, in your language.** A voice/text activity tracker for mining-site operators in Tanzania — and an agent-native web app built for the [WebMCP Challenge](https://openai.com/webmcp-challenge).

## The problem

Small-scale mining site operators in Tanzania track payments, deliveries, and daily activity by memory or scraps of paper — "nimempa John elfu tano kwa dizeli" said once, then forgotten. Kumbuka lets them **say or type one sentence, in Swahili or English**, and turns it into a structured record: who, what, how much. No forms, no menus.

## Why WebMCP

Kumbuka's records aren't just for the human operator. Through [WebMCP](https://github.com/webmachinelearning/webmcp), the app exposes the exact same activity log as a set of structured tools an AI agent sharing the browser tab can call directly — instead of guessing at buttons or scraping the page. A site owner's assistant agent can ask "how much did we spend this week" or "add a record for the fuel delivery" and get a reliable answer, using the same data the human sees in the app.

### Registered WebMCP tools (`src/lib/webmcp-register.ts`)

| Tool | Purpose |
|---|---|
| `add_activity_record` | Create a new expense / income / activity record |
| `list_activity_records` | List records, filterable by type, person, or date range |
| `search_activity_records` | Keyword search across person, item, note, and original text |
| `get_summary_report` | Totals in/out, balance, and breakdowns for day/week/month |
| `delete_activity_record` | Remove a record by id |

These tools read and write the same [Dexie](https://dexie.org/) (IndexedDB) store the UI uses, so a human confirming a voice entry and an agent querying totals are always looking at the same data — no separate API, no sync step.

## How it works

1. **Record** — tap the mic (or type) and say one sentence in any language: *"Nimempa John 5000 kwa diesel"*.
2. Kumbuka's lightweight bilingual parser (`src/lib/parse.ts`) extracts type (expense/income/activity), person, amount, item, and unit — with word-number support for Swahili (`elfu`, `laki`, `milioni`) and shorthand like `5k`.
3. **Review before saving** — a confirm sheet shows exactly what was understood, editable, before anything is written.
4. **Records / Reports / Ask** — browse, filter, see day/week/month summaries, or search past entries in plain language.
5. Everything also happens automatically for an agent through the WebMCP tools above.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Dexie (IndexedDB) · react-router-dom · Web Speech API · WebMCP (`navigator.modelContext`)

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run test      # run the test suite (vitest)
```

WebMCP itself is an experimental, origin-trial browser API (Chrome). If `navigator.modelContext` isn't available in your browser, Kumbuka still works fully as a normal app — the status pill in the Record page shows whether WebMCP tools are currently registered.

## Testing

The test suite (`src/test/`) covers three layers:

- **`parse.test.ts`** — unit tests for the sentence parser (amounts, currency shorthand, Swahili number words, keyword-based type detection).
- **`webmcp-register.test.ts`** — registers the real tools against a mocked `navigator.modelContext` and exercises every tool's `execute()` against a fake IndexedDB, verifying an agent can add, list, search, summarize, and delete records correctly.
- **`app.test.tsx`** — renders the full app and drives an actual user flow: type an entry → review parsed fields → confirm → verify it's saved and shown on the Records page.

Run everything with `npm run test`.

## Project structure

```
src/
  lib/
    types.ts             # ActivityRecord / ParsedDraft types
    db.ts                 # Dexie schema + CRUD helpers
    parse.ts              # Bilingual sentence -> structured draft parser
    webmcp.ts              # WebMCP availability check
    webmcp-register.ts     # Registers the 5 WebMCP tools
    i18n.ts / lang.tsx     # EN/SW translations + language context
    dates.ts / money.ts    # Date-range and TSh formatting helpers
  hooks/
    useRecords.ts          # Live-query wrapper over the records table
    useSpeech.ts            # Web Speech API wrapper (sw-TZ)
  pages/
    RecordPage.tsx          # Voice/text capture + confirm sheet
    RecordsPage.tsx          # Filterable record list
    ReportsPage.tsx          # Day/week/month summaries
    AskPage.tsx               # Keyword search over records
  components/
    ui/                        # Button, Card, Sheet, Badge
    shell/Nav.tsx               # Sidebar + bottom nav
```
