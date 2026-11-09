# Hospital System frontend

The staff app for the Hospital System API: reception, patients, the doctor's
day and the admin screens, in React, TypeScript and Vite. Setup, testing and
deployment are described in the [root README](../README.md); this page covers
the design and how the code is laid out.

## Run it

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` and calls the API at
`http://localhost:5272/api` unless `VITE_API_URL` is set. A production build
needs `VITE_API_URL`:

```bash
VITE_API_URL=http://localhost:5272/api npm run build
```

The build adds the Content-Security-Policy `<meta>` tag and `404.html`
(`vite.config.ts`). Fonts are bundled with the app, so the policy allows only
the app's own origin and the API.

## Check it

```bash
npm run lint
npm test
VITE_API_URL=http://localhost:5272/api npm run build
npm run e2e
```

`npm run e2e` needs `HOSPITALSYSTEM_TEST_POSTGRES`; see Testing in the root
README. `src/api-schema.ts` is generated from `openapi.json`; after the API
changes, run `npm run generate:api`.

## The design

- **Type.** Newsreader for headings and figures, with Literata standing in
  for Cyrillic letters; Onest for text and controls; IBM Plex Mono for times
  and phone numbers. All three cover Bulgarian names.
- **Colour.** Warm paper and ink with one deep green for anything that can be
  booked or acted on, amber for things that need attention (no-shows, visits
  not marked yet, time off), and red for cancellations, failed sign-ins and the
  current time. Departments get one of eight muted marks so they can be told
  apart at a glance.
- **Light and dark.** Both are first-class. The app follows the system setting
  until someone picks one in the sidebar.
- **Clinic time.** Every date and time is on the clinic's clock, whatever zone
  the computer is in. The sidebar clock says which zone, and turns amber when
  the computer's zone differs.

## What the redesign changed

Reception

- The week is a timetable: booked slots show the patient's name, breaks,
  days off and time off are hatched with the reason, today is tinted, and a
  line marks the current time.
- Booking looks patients up while you type a name or phone number, and books
  for the patient on file by id, so fewer duplicates and fewer "partly
  matches" questions.
- The side pane shows the week at a glance when nothing is selected: how full
  it is, the next open slot, a key and the shortcuts. A booking you just made
  is selected straight away.
- Past visits nobody marked are flagged "Not marked" in the timetable, the
  patient's history and the doctor's day.
- Cancelling offers common reasons to pick from.
- The doctor list shows each doctor's hours today, or when they are back.
- Keyboard: arrow keys move between slots, ← and → change week, T returns to
  this week, Esc stops a move or clears the selected booking.
- On a phone, the week becomes one day at a time.

Everywhere

- A command palette (Ctrl K or ⌘ K) jumps to any screen, opens a doctor's
  week, finds a patient by name or phone, and switches theme or signs out.
- Patient records lead with age, visit counts, no-shows and upcoming visits,
  and each upcoming visit opens at its slot in reception.
- The doctor's day has a week strip with patient counts, a "next patient"
  countdown, and Seen / No-show buttons once a visit has started.
- Schedules are cards with a 24-hour ruler. Editing happens in a side sheet
  that previews the hours and checks the slot length, days and break the way
  the API does, before saving.
- Departments open to show their doctors and combined hours. Doctors move
  between departments and are switched on and off from one table.
- The audit log is grouped by day and written in plain words, with failed
  sign-ins and lockouts marked.
- Demo accounts see every screen they can read, with changes visibly locked,
  and a note on the screens that are hidden from them.
- Lists keep the previous page on screen while the next one loads, and every
  screen refreshes when the window gets focus again.
- Bulgarian phone numbers are shown grouped (`+359 88 812 3456`); other
  formats are shown exactly as stored.
- If the API can't be reached, screens say so and offer to try again, instead
  of looking empty.

The browser-only "Recent activity" list on the old admin screen is gone; the
audit log covers it.

## Layout

```text
src/
├── api/          # API client and session storage
├── app/          # Session, routing, workspace (data, actions, refresh), resources
├── components/   # Dialogs shared across screens
├── lib/          # Clinic time, dates, names, schedule slots, validation (+ tests)
├── screens/      # signin, reception, patients, myday, admin, misc
├── shell/        # Sidebar, command palette, screen loading
├── styles/       # Design tokens and base styles
├── test/         # Component test setup and helpers
├── ui/           # Buttons, fields, dialogs, toasts, page parts, icons
└── api-schema.ts # Generated from openapi.json; do not edit
```
