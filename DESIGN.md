# ApparelFlow Cutting Gate — Design System

The visual and interaction spec for the Cutting Operations & Gatekeeper Verification Terminal. It is the single source of truth for color, type, layout, components, copy and accessibility. Build from the tokens in this file; do not substitute framework defaults.

Companion file: `SKILL.md` (how an AI coding assistant must apply this document).

**Contents**
1. [Brief](#1-brief)
2. [Concept: the cut ticket and the gate](#2-concept-the-cut-ticket-and-the-gate)
3. [Plan review: what was rejected and why](#3-plan-review-what-was-rejected-and-why)
4. [Color](#4-color)
5. [Typography](#5-typography)
6. [Layout and spacing](#6-layout-and-spacing)
7. [Shape, borders and elevation](#7-shape-borders-and-elevation)
8. [Signature elements](#8-signature-elements)
9. [Components](#9-components)
10. [Screens](#10-screens)
11. [Iconography](#11-iconography)
12. [Motion](#12-motion)
13. [Voice and copy](#13-voice-and-copy)
14. [Accessibility and contrast contract](#14-accessibility-and-contrast-contract)
15. [Tells to avoid](#15-tells-to-avoid)
16. [Implementation tokens](#16-implementation-tokens)
17. [Design review checklist](#17-design-review-checklist)

---

## 1. Brief

| | |
|---|---|
| **Subject** | A garment factory's cutting room: the checkpoint between cut fabric bundles and the sewing floor |
| **Audience** | Three roles. Cutting supervisors prepare orders. Cutting verifiers count physical pieces and decide. Sewing supervisors receive only verified batches |
| **Primary job** | Make the right decision quickly and be sure of it: is every component present, and may this batch pass? |
| **Conditions** | Shared tablets and desktop monitors on a factory floor, glare, quick glances, sometimes gloved or rushed taps, a long shift. The evaluator will also click every input and dropdown on a laptop |
| **Hard constraints** | Light theme only. Dark legible text on light fields in every state (zero-tolerance contrast rule). Traffic-light statuses GREEN, YELLOW, RED are mandated by the spec. Button names "Approve Batch", "Reject Batch" and "Start Sewing Assembly" appear verbatim |
| **Tone** | A calm instrument panel. Plain, exact, never cute |

The product is a gate. The design should feel like something that can say "no" clearly and "yes" with evidence.

---

## 2. Concept: the cut ticket and the gate

### 2.1 Where the look comes from

Every bundle leaving a cutting table carries a **cut ticket**: a paper slip with order number, size, count and a stub that is torn off at the next station. The pattern-maker's vocabulary adds **notches** (small V cuts that mark alignment), **tape measures**, and **chalk marks**. The interface borrows structure from these, not decoration.

| Source in the cutting room | What it becomes in the UI |
|---|---|
| Cut ticket and tear-off stub | The audit panel on a verified batch: a bordered slip with a notched corner and a stub area for verifier and time |
| Notch mark | One small V notch on the Gate strip and the audit stub. Nowhere else |
| Tape measure | The wastage scale: fabric used against the recipe cap, with a tick at the cap |
| Turnstile or boom gate | The **Gate strip** on the Verification Terminal, the one memorable element |
| Indigo-dyed cloth | The single brand color, used for the header band, primary actions, selection and focus |
| Pattern paper | The cool grey page background; white "paper" for working surfaces and every input |

### 2.2 The one memorable element: the Gate strip

A full-width band at the top of the Verification Terminal that states the gate's state in a sentence. It is the largest, boldest thing on that screen. Everything else is quiet.

```
Gate closed. Sleeve Cuffs is short by 2.        3 of 5 counted
Gate open.   All 5 components counted. None short.
```

Detail in [8.1](#81-gate-strip). Boldness is spent here and nowhere else: the rest of the app is neutral, flat and tabular.

### 2.3 Principles

1. **Status is a sentence first, a color second.** Every status has words and a shape. Color confirms it.
2. **Brand color never competes with status color.** The brand is indigo. Green, amber and red mean item status only.
3. **Structure carries information.** Borders, rules and notches mark real boundaries (a column, a decision, a stub), never ornament.
4. **Numbers are the interface.** Counts, variances and percentages get the best type and alignment on the page.
5. **Quiet by default.** No shadows on resting surfaces, no gradients, no entrance animation, no hover lift.
6. **The server decides; the UI shows it.** Approve is enabled only when the server-confirmed summary allows it. The design never implies the UI is the safeguard.

---

## 3. Plan review: what was rejected and why

The first-instinct palette and layout for a manufacturing ERP were tested against the brief and replaced where they read as defaults rather than choices.

| First instinct | Why it was dropped | Replacement |
|---|---|---|
| Neutral zinc/slate theme with black primary buttons (the stock shadcn look) | Reads as the unmodified template | Cool "chalk" page, white paper surfaces, **indigo vat** primary |
| Warm cream background, serif display, terracotta accent | A common generated palette, and unrelated to the subject | Cool grey page and indigo; no serif |
| Near-black background with one acid accent | Violates the light-theme contrast rule and signals "dashboard template" | Light only |
| Green as brand color ("manufacturing, go") | Collides with the mandated GREEN status | Brand is indigo; green means "match" only |
| Grid of identical rounded cards with soft shadows | The SaaS card kit | Tables, ledgers and bordered slips with different radii by role |
| Uppercase tracked eyebrow labels over every heading | Template chrome | Plain sentence-case headings and definition lists |
| Monospace for IDs and small labels | Another template tell | Atkinson Hyperlegible with tabular figures; it separates 0/O and 1/l/I by design, which matters for roll IDs like FAB-ROLL-882 |
| Hero with a big number, gradient accent and stat trio | Default dashboard opener | Login opens with the three roles and what each can do. The terminal opens with the Gate strip |

---

## 4. Color

### 4.1 Base palette (six names)

| Token | Hex | Role |
|---|---|---|
| **chalk** | `#E9ECEF` | Page background (pattern paper) |
| **paper** | `#FFFFFF` | Working surfaces, **all inputs, selects, popovers, dialogs** |
| **ink** | `#19242F` | Primary text. A deep blue-slate, never pure or neutral black |
| **vat** | `#25476B` | Brand: header band, primary buttons, links, selection, focus ring |
| **vat-deep** | `#1B3652` | Hover and pressed for vat, header underline |
| **vat-tint** | `#DCE6F1` | Selected row, pending-verification stamp background |

### 4.2 Supporting neutrals

| Token | Hex | Use |
|---|---|---|
| sheet | `#F4F6F8` | Table header, zebra, subtle panels |
| row-hover | `#EEF2F6` | Row and menu-item hover |
| rule | `#C9D0D7` | Decorative dividers and table lines (not for control edges) |
| control-edge | `#68757F` | **Border of every input, select and checkbox** |
| ink-soft | `#44515C` | Secondary text, table headers, helper text |
| ink-faint | `#5C6975` | Placeholders (still passes AA) |
| disabled-bg | `#DFE4E8` | Disabled controls (text stays ink-soft, readable) |

### 4.3 Status colors (reserved)

Each status has a background, a text color, an edge, and a solid fill for lamps.

| Status | Where | bg | text | edge / lamp fill |
|---|---|---|---|---|
| **Match** (GREEN) | Item equals expected; Verified stamp; Gate open | `#E2F0E5` | `#124A28` | `#2E7D4B` |
| **Excess** (YELLOW) | Item above expected; over-cap wastage | `#FAEFC7` | `#5F4200` | `#A87A00` |
| **Short** (RED) | Item below expected; Rejected stamp; Gate closed; errors | `#FADFDB` | `#861B14` | `#B8382D` |
| **Not counted** | Item with no count yet | `#EDF0F3` | `#3F4C58` | `#7B8793` (dashed) |

Order statuses reuse these families only where the meaning matches (Verified = match, Rejected = short). "Cutting" is neutral (sheet and ink-soft). "Pending verification" is vat-tint with vat text, so the only blue in a table row means "waiting for a verifier".

### 4.4 Measured contrast (WCAG 2.x, computed)

| Foreground on background | Ratio | Requirement met |
|---|---:|---|
| ink on paper | 15.73 | AA, AAA |
| ink on chalk | 13.27 | AA, AAA |
| ink on sheet | 14.52 | AA, AAA |
| ink-soft on paper / chalk / sheet | 8.15 / 6.87 / 7.52 | AA, AAA |
| ink-faint (placeholder) on paper / sheet | 5.63 / 5.19 | AA |
| paper on vat / vat-deep | 9.58 / 12.38 | AA, AAA |
| vat on paper / chalk | 9.58 / 8.08 | AA, AAA |
| ink on vat-tint | 12.46 | AA, AAA |
| vat on vat-tint | 7.59 | AA, AAA |
| match text on match bg | 8.76 | AA, AAA |
| excess text on excess bg | 8.05 | AA, AAA |
| short text on short bg | 7.63 | AA, AAA |
| not-counted text on its bg | 7.69 | AA, AAA |
| ink-soft on disabled-bg | 6.36 | AA |
| control-edge on paper / chalk | 4.73 / 3.99 | ≥ 3:1 for UI component edges |
| match / short edge on paper | 5.06 / 5.77 | ≥ 3:1 |
| excess edge on paper | 3.85 | ≥ 3:1 |
| not-counted edge on paper | 3.67 | ≥ 3:1 |
| paper icon on excess lamp (`#A87A00`) | 3.85 | ≥ 3:1 for graphics |

Re-measure if any hex changes. The Playwright axe scan (see `SKILL.md`) is the final authority.

### 4.5 Usage rules

- **Inputs, selects, textareas, popover lists and dialogs are always `paper` with `ink` text.** There is no variant where an input inherits foreground from a parent theme.
- Brand `vat` appears on at most: the header band, primary buttons, links, the selected row, the focus ring, and the "Pending verification" stamp.
- Status colors never decorate. They appear only on lamps, stamps, the Gate strip, row edge markers for rejected orders, and validation errors.
- Never place status text on a different status background (for example, short text on excess bg).
- Proportion on a typical screen: about 75% chalk and paper, 15% ink text and rules, under 8% vat, status colors only where a status exists.
- No gradients, no translucent color washes, no glass effects.
- No dark theme. `color-scheme: light` is set on `html`.

---

## 5. Typography

Two families, clearly distinct, both free on Google Fonts.

| Role | Family | Why |
|---|---|---|
| **Interface and body** | **Atkinson Hyperlegible Next** (fallback: Atkinson Hyperlegible, then system sans) | Designed for character distinction (0/O, 1/l/I, rn/m). Roll IDs, order numbers and counts must never be misread |
| **Page titles and large numerals** | **Barlow Condensed** 600 | Industrial signage heritage, narrow enough for big counts and wastage figures, clearly different from the body face |

Load with `next/font/google` so files are self-hosted at build time (no runtime request to Google, no CSP exception needed). Confirm the exact export name for the Atkinson family in your installed Next.js version; if the "Next" variant is unavailable, use the original Atkinson Hyperlegible (400 and 700).

### 5.1 Scale

| Style | Family, weight | Size / line height | Use |
|---|---|---|---|
| Page title | Barlow Condensed 600 | 30 / 34 px | One per screen |
| Large numeral | Barlow Condensed 600 | 32 / 36 px | Wastage %, summary counts, count inputs (28 px inside inputs) |
| Section title | Atkinson 700 | 18 / 26 px | Panel and dialog titles |
| Body | Atkinson 400 | 16 / 24 px | Default text, table cells |
| Strong body | Atkinson 700 | 16 / 24 px | Buttons, emphasized values |
| Table header | Atkinson 700 | 14 / 20 px | Sentence case, `ink-soft`, no caps, no tracking |
| Helper and caption | Atkinson 400 | 14 / 20 px | Hints, timestamps. Nothing below 14 px |
| Gate strip text | Atkinson 700 | 20 / 28 px | The sentence in the Gate strip |

### 5.2 Rules

- Inputs use **16 px minimum** (prevents mobile zoom-on-focus and keeps floor-tablet legibility).
- Digits that are compared or summed use tabular figures: `font-variant-numeric: tabular-nums`. Verify alignment in both families; if a face lacks tabular figures, give numeric cells a fixed width and right-align.
- Numeric columns are **right-aligned**; text columns left-aligned. Headers align with their column.
- Sentence case everywhere. **No all-caps labels, no letter-spaced small caps.**
- Prose (rejection notes, helper text) stays under 70 characters per line.
- Never accent a single word in a heading with color, italics or weight.
- Order numbers and IDs (`CUT-000012`, `FAB-ROLL-882`) use the body face at weight 700 with normal tracking, not a monospace face.

---

## 6. Layout and spacing

### 6.1 Grid and spacing

- Base unit **4 px**. Scale: 4, 8, 12, 16, 24, 32, 48.
- Content max width **1200 px**, left aligned to the header wordmark. Side padding 16 px on mobile, 24 px from 768 px, 32 px from 1280 px.
- Everything is **left aligned**. Nothing is centered except the loading spinner and a full-page error.
- Row heights: table rows 48 px; Verification Terminal rows 64 px (count inputs 48 px tall inside); buttons 44 px minimum, primary actions 48 px.
- Breakpoints: 360 (floor), 768 (tablet, the main working size), 1024, 1280.

### 6.2 App shell

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ApparelFlow  Cutting gate                 Kasun Fernando   Switch role  Sign out │  vat-deep band, 56 px
├───────────────────────────────────────────────────────────────────────────┤
│ Verification queue    History                                              │  role nav: text tabs,
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔                                                          │  2 px vat underline = current
├───────────────────────────────────────────────────────────────────────────┤
│  (chalk page)  content                                                     │
```

- Header: wordmark in Barlow Condensed 600 22 px, white on `vat-deep`. "Cutting gate" is plain text beside it, not a pill.
- The signed-in role is written out in words under or beside the name ("Cutting verifier"), as text, not a colored badge.
- Navigation shows only the current role's links. It is convenience, never security.
- **Switch role** is a Select-style menu listing the three demo personas (visible only when `NEXT_PUBLIC_DEMO_MODE=true`).

### 6.3 Metadata layout

Order metadata is shown as a **definition list** (term left in `ink-soft`, value right in `ink`), not as strings joined with dots or slashes.

```
Recipe            Casual Blouse (REC-BL01)
Target quantity   50
Fabric roll       FAB-ROLL-882
Fabric used       94.50 yds
```

---

## 7. Shape, borders and elevation

Radius follows function, not a single global value.

| Element | Radius | Edge |
|---|---|---|
| Inputs, selects, buttons | 4 px | 1 px `control-edge` (buttons: none for filled) |
| Tables and ledgers | 0 | 1 px `rule` outer border, `rule` row dividers |
| Stamps (order status) | 2 px | 1.5 px status edge |
| Lamps (item status) | full circle | none (filled) or dashed ring |
| Gate strip | 0, with one V notch | 6 px left bar in status edge color |
| Audit stub | 0, with one V notch | 1 px `ink-soft` |
| Dialogs | 8 px | 1 px `rule` |
| Popovers and select lists | 6 px | 1 px `control-edge` |

**Elevation.** Resting surfaces are flat: no shadows. Only overlays lift:

- Dialog, popover, toast: `box-shadow: 0 8px 24px rgb(25 36 47 / 0.18)`
- Scrim behind dialogs: `rgb(25 36 47 / 0.45)`

Surfaces are separated by a 1 px border or by the chalk gap between them, never by shadow.

---

## 8. Signature elements

### 8.1 Gate strip

Placement: directly under the page title on the Verification Terminal, full width of the content column, 56 px minimum height, `role="status"` with `aria-live="polite"`.

| State | Condition | Background / text / left bar | Sentence (left) | Right side |
|---|---|---|---|---|
| Waiting | No components counted | not-counted bg / text / dashed bar | **Gate closed.** Count every component to open it. | "0 of 5 counted" |
| Counting | Some uncounted, none short | not-counted | **Gate closed.** 2 components still need a count. | "3 of 5 counted" |
| Blocked | Any component short | short bg / text / bar | **Gate closed.** Sleeve Cuffs is short by 2. | "1 short" |
| Blocked, several | More than one short | short | **Gate closed.** 3 components are short. Largest: Sleeve Cuffs, 6. | "3 short" |
| Open | All counted, none short | match bg / text / bar | **Gate open.** All 5 components counted. None short. | "1 with excess" when applicable |

- A custom gate glyph (28 px) precedes the sentence: closed = bar across two posts, open = bar raised.
- Left bar is 6 px. A single V notch (10 px wide, 6 px deep) is cut from the top-right corner using `clip-path`. It is the only place a notch appears on this screen.
- The strip reflects **live local counts** for instant feedback, but the **Approve Batch** button follows the **server-confirmed** `canApprove` from the last save. If they disagree, the strip shows a quiet line: "Save counts to confirm." and Approve stays disabled.
- State changes swap instantly. Only the background color transitions (120 ms).

### 8.2 Lamp (item status)

A 24 px circular glyph followed by a word. Shape differs per state so color is never the only cue.

| Status | Glyph | Label | Example |
|---|---|---|---|
| Match | Filled `#2E7D4B` circle, white check | Match | Match |
| Excess | Filled `#A87A00` circle, white plus | Excess | Excess +2 |
| Short | Filled `#B8382D` circle, white minus | Short | Short −2 |
| Not counted | Dashed `#7B8793` ring, empty | Not counted | Not counted |

Label text uses the status text color on the status background chip (padding 4 px 8 px, radius 2 px).

```html
<!-- Match lamp (24x24) -->
<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <circle cx="12" cy="12" r="11" fill="#2E7D4B"/>
  <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
<!-- Excess: same circle fill #A87A00, plus: M12 7v10 M7 12h10 -->
<!-- Short:  same circle fill #B8382D, minus: M7 12h10 -->
<!-- Not counted: <circle cx="12" cy="12" r="10" fill="none" stroke="#7B8793" stroke-width="2" stroke-dasharray="3 3"/> -->
```

### 8.3 Stamp (order status)

Rectangular label, 2 px radius, 1.5 px edge, sentence case, weight 700, 14 px.

| Order status | Stamp text | Colors |
|---|---|---|
| CUTTING_IN_PROGRESS | Cutting | sheet bg, ink-soft text, `#7B8793` edge |
| PENDING_VERIFICATION | Pending verification | vat-tint bg, vat text, vat edge |
| REJECTED | Rejected | short family |
| VERIFIED | Verified | match family |
| Verified and sewing started | In assembly | vat bg, paper text |

Stamps are rectangles and lamps are circles, so an order status is never mistaken for a component status.

### 8.4 Wastage scale (the tape)

A horizontal scale that shows fabric wastage against the recipe cap.

```
Fabric wastage                                          5.00 %
|----|----|----|----|----|----|----|----|----|----|        (large numeral, Barlow Condensed)
0                    ▲ cap 5.0 %                   10
████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Within cap.     Expected 90.00 yds, used 94.50 yds
```

- Track 8 px high, `rule` color; fill vat when within cap, excess amber when above.
- Tick marks every 1 percentage point on a 0 to max(2 x cap, value + 1) range; the cap has a taller tick and a text label.
- Negative wastage (less fabric used than expected) shows the number with a minus sign, an empty fill and the text "Under expected."
- Text states the result in words: "Within cap." or "Over cap by 2.0 points. The batch can still pass."
- Implement as `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and a text label.

### 8.5 Audit stub

Shown on verified batches (verifier terminal history, supervisor order detail, sewing detail). A bordered slip with one notched corner.

```
┌────────────────────────────────────────┐◣
│ Verified                               │
│ Verifier        Kasun Fernando         │
│ Time            5 Oct 2026, 14:32      │
│ Fabric wastage  5.00 % (cap 5.0 %)     │
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │  dashed tear line
│ Component   Expected  Actual  Variance │
│ Sleeve Cuffs   100      102     +2     │
└────────────────────────────────────────┘
```

The dashed tear line separates attribution (above) from the counts (below). This separation is real information: who signed versus what they counted.

---

## 9. Components

All components are shadcn/ui primitives restyled with the tokens above. Where this table and a shadcn default disagree, this table wins.

### 9.1 Buttons

| Variant | Look | Used for |
|---|---|---|
| **Primary** | `vat` bg, `paper` text, 4 px radius, 48 px tall, weight 700. Hover `vat-deep` | Create cutting order, Save counts, Approve Batch, Start Sewing Assembly, Sign in |
| **Secondary** | `paper` bg, 1 px `control-edge`, `ink` text. Hover `row-hover` | Cancel, Save draft, Re-cut |
| **Reject** | `paper` bg, 1.5 px short edge `#B8382D`, text `#861B14`. Hover short bg | Reject Batch |
| **Quiet** | No edge, `vat` text, underline on hover | Inline links such as "View history" |
| **Disabled** | `disabled-bg`, `ink-soft` text, no edge, `cursor: not-allowed`, lock glyph on Approve Batch | Approve Batch while the gate is closed |

- Labels are verbs. No arrows or chevrons appended to labels.
- A disabled **Approve Batch** keeps its label and gains an explanation below it in `ink-soft` 14 px: "Gate closed. Resolve the shortage or finish counting." It uses both `disabled` and `aria-disabled="true"`, and a description linked with `aria-describedby`.
- Focus: 2 px `vat` outline with 2 px offset. On `vat` surfaces the outline is `paper`.
- Only one primary button per view region.

### 9.2 Text inputs, textarea

- 48 px tall, 16 px text, `paper` bg, `ink` text, 1 px `control-edge`, 4 px radius, 12 px horizontal padding.
- Label above the field, always visible, weight 700 16 px `ink`. Placeholder is an example, never the label.
- Helper text under the field in `ink-soft` 14 px.
- Focus: border becomes `vat` and a 2 px `vat` outline with 2 px offset.
- Error: border 2 px `#B8382D`, message below in `#861B14` with a small short-minus glyph, `aria-invalid="true"`, message linked by `aria-describedby`.
- Disabled: `disabled-bg` background, `ink-soft` text.
- Autofill is normalized: `-webkit-text-fill-color: #19242F` and an inset `#FFFFFF` shadow, so autofilled fields never go white-on-white.

### 9.3 IntegerInput (counts and quantities)

- `type="text"`, `inputMode="numeric"`, `pattern="[0-9]*"`. Not `type="number"`.
- Blocks `e E + - . ,` on key down; strips non-digits on paste; no spinner arrows.
- Numerals in Barlow Condensed 600 at 28 px, right-aligned, width fits 7 digits.
- Inline error appears on blur and on submit; the first invalid field takes focus.
- Verification Terminal count fields are **56 px tall**, with the row's expected value shown beside them for comparison, not hidden in a tooltip.

### 9.4 Select (shadcn Radix Select)

The trigger matches Text input. The dropdown renders in a portal, so it must be styled explicitly.

| Part | Style |
|---|---|
| Trigger | As input. Chevron in `ink` 16 px, right side |
| Content | `paper` bg, 1 px `control-edge`, 6 px radius, overlay shadow, `ink` text, max height 320 px |
| Item | 44 px tall, 12 px padding. Hover/focus `row-hover` with `ink` text. Selected: weight 700 and a check glyph |
| Placeholder | `ink-faint` |
| Group label | `ink-soft` 14 px weight 700, sentence case |

### 9.5 Tables

- Header row `sheet` bg, 14 px 700 `ink-soft` text, bottom border `rule`. Sentence case.
- Body rows `paper`, 1 px `rule` dividers, no zebra by default (use `sheet` zebra only on tables over 12 rows).
- Hover `row-hover`. Selected `vat-tint`.
- Numeric columns right-aligned with tabular figures. Status columns left-aligned.
- **Rejected orders**: a 4 px short-edge bar on the row's left edge, with the rejection reason on a second line in the row (`ink` 16 px, max 70 characters per line) and the Re-cut action at the row end.
- Under 768 px, rows become stacked entries: order number as the heading, a definition list below, status stamp and action at the end. No horizontal page scroll; wide tables scroll inside their own container.

### 9.6 Dialog

- 8 px radius, `paper`, 1 px `rule`, overlay shadow, 24 px padding, max width 640 px (Create order: 880 px, two columns).
- Title in Section title style. Close is a text button labelled "Close", not an icon alone.
- Focus is trapped; Esc closes; primary action is the last button in the footer, left to right: Cancel, Save draft, Send to verification.
- **Create cutting order dialog** has two columns on 768 px and wider: the form on the left, a live "Expected pieces" table on the right (component, per garment, expected) with expected fabric under it. Changing recipe or quantity updates the right column instantly.

### 9.7 Feedback

| Type | Treatment |
|---|---|
| Field error | Inline under field (9.2) |
| Blocking explanation (403, 409, 422) | `Alert` strip above the affected area: short bg, short text, short left bar 4 px, a sentence naming the problem and the next step |
| Success | Toast, bottom-left on desktop, top on mobile: `paper` bg, `ink` text, 4 px match-edge left bar, 4 seconds, includes a "Close" text button |
| Loading | Static `sheet` blocks matching the layout. No shimmer. After 400 ms show the block; avoid flashing |
| Empty | One sentence of what is missing and one of what to do. Left aligned, no illustration |

### 9.8 Demo credential panel and role switcher

- On `/login`, a bordered table listing the three roles. It states what each role can do in one plain sentence, then the credentials as visible text, and a **Use these credentials** secondary button per row that fills the form.
- A second button, **Sign in as this role**, performs the real login.
- Credentials are shown as plain text on `paper`; there is no hidden or masked display, because they are public demo accounts. A line above the table states: "Demo accounts. Each role is enforced by the server."
- The header **Switch role** menu performs a real sign out and sign in. It is not a client-side role flag.

---

## 10. Screens

### 10.1 Login

```
┌─ vat-deep band: ApparelFlow  Cutting gate ───────────────────────────────┐
│                                                                           │
│  Sign in                              Demo accounts                       │
│                                       Each role is enforced by the server.│
│  Email                                ┌───────────────────────────────────┤
│  [______________________________]     │ Cutting supervisor                │
│  Password                             │ Creates cutting orders and sends  │
│  [______________________________]     │ them to verification.             │
│  [ Sign in ]                          │ supervisor@apparelflow.demo       │
│                                       │ Supervisor@123                    │
│                                       │ [Use these credentials] [Sign in as this role]
│                                       ├───────────────────────────────────┤
│                                       │ Cutting verifier …                │
│                                       │ Sewing supervisor …               │
└───────────────────────────────────────────────────────────────────────────┘
```

Left aligned, two columns from 768 px, stacked below (form first, demo table second). No hero, no marketing copy.

### 10.2 Supervisor: cutting orders

```
Cutting orders                                   [ Create cutting order ]
Status [All ▾]
┌────────────┬──────────────┬─────┬──────────────┬───────────┬──────────────────────┬─────────┐
│ Order      │ Recipe       │ Qty │ Fabric roll  │ Fabric yds│ Status               │         │
├────────────┼──────────────┼─────┼──────────────┼───────────┼──────────────────────┼─────────┤
│ CUT-000012 │ Casual Blouse│  50 │ FAB-ROLL-882 │     94.50 │ [Pending verification]│ View    │
│▌CUT-000011 │ Crop Top     │  80 │ FAB-ROLL-871 │     96.00 │ [Rejected]           │ Re-cut  │
│  Cuffs: 2 pieces with a fabric flaw, re-cut required.                                       │
└────────────┴──────────────┴─────┴──────────────┴───────────┴──────────────────────┴─────────┘
```

Row actions depend on status: Cutting shows Edit and Send to verification; Pending shows View; Rejected shows Re-cut; Verified shows View.

### 10.3 Verifier: queue

A table of pending batches (Order, Recipe, Qty, Sent at, and an Open terminal button). Empty text: "No batches waiting for a count."

### 10.4 Verifier: Verification Terminal (desktop)

```
CUT-000012                                                     (page title)
Casual Blouse, 50 garments     ← use definition list, not this string, in the build
┌─ Gate strip ─────────────────────────────────────────────────────────◥┐
▌ ▭ Gate closed. Sleeve Cuffs is short by 2.              3 of 5 counted │
└────────────────────────────────────────────────────────────────────────┘
┌─ Components ────────────────────────────────────┐ ┌─ Fabric ────────────┐
│ Component        Per   Expected  Actual  Status │ │ Wastage     5.00 %  │
│ Front Body Panel  1       50     [ 50 ]  ● Match│ │ ├────▲──────────┤  │
│ Back Body Panel   1       50     [ 50 ]  ● Match│ │ Within cap.         │
│ Sleeves (L & R)   2      100     [100 ]  ● Match│ │ Expected 90.00 yds  │
│ Collar & Stand    1       50     [ 50 ]  ● Match│ │ Used     94.50 yds  │
│ Sleeve Cuffs      2      100     [ 98 ]  ● Short −2│├────────────────────┤
└─────────────────────────────────────────────────┘ │ [ Save counts ]     │
                                                    │ [ Approve Batch ] ⊘ │
                                                    │ Gate closed. …      │
                                                    │ [ Reject Batch ]    │
                                                    └─────────────────────┘
```

- Two columns from 1024 px (ledger 2/3, side panel 1/3 sticky). Stacked below.
- **Mobile and small tablet (under 768 px):** ledger rows become stacked entries with the count field at 56 px; the side panel actions collapse into a **sticky bottom bar** holding Save counts and Approve Batch, with Reject Batch in an adjacent overflow button labelled "Reject Batch" (not an icon-only control).
- Component thumbnails (`image_url`) sit at 40 px on the left of each row; if missing, show nothing rather than a placeholder icon.
- Reject Batch opens a dialog: title "Reject batch", a required textarea "Reason for rejection" with counter "0 of 500", helper "At least 5 characters. The supervisor sees this when re-cutting.", and footer buttons Cancel and Reject Batch.

### 10.5 Sewing: queue and detail

Queue: table (Order, Recipe, Qty, Verified by, Verified at, Wastage, Status). A segmented text control above the table: **Awaiting**, **In assembly**, **All** (underlined current, no pill background). Empty text: "No verified batches yet. Batches appear here after a verifier approves them."

Detail: page title with order number; definition list on the left; **Audit stub** (8.5) on the right (stacked below 1024 px); components table (Component, Expected, Actual, Variance, Status lamp); at the bottom, **Start Sewing Assembly** primary button. After starting, the button is replaced by a text line "Sewing started by Dilani Silva, 5 Oct 2026, 15:02."

---

## 11. Iconography

- Utility icons from Lucide (already bundled with shadcn), **1.75 px stroke, 20 px**, always `ink`, `ink-soft` or `vat`. Used only for: menu chevron, check in selects, close, lock on disabled Approve, calendar-free list (no decorative icons).
- Status glyphs (lamps, gate) are the custom SVGs in section 8. Do not substitute generic alert or check-circle icons.
- No icons in colored tiles or circles as decoration. No icon without an adjacent text label except the Select chevron.
- No emoji anywhere in the interface.

---

## 12. Motion

Motion appears only when it answers a person's action and shows what changed.

| Where | Motion | Duration |
|---|---|---|
| Lamp and Gate strip color change | Background and color cross-fade | 120 ms ease-out |
| Dialog open and close | Opacity only | 150 ms |
| Select and menu open | Opacity only | 100 ms |
| Toast | Opacity | 150 ms |
| Wastage scale fill | Width changes with input | 150 ms |

- No page-load animation, no staggered section reveals, no hover lift or scale, no parallax, no skeleton shimmer.
- `@media (prefers-reduced-motion: reduce)` sets all of the above to 0 ms.

---

## 13. Voice and copy

Plain, exact, and consistent. Written for a factory user in a hurry.

### 13.1 Rules

- Sentence case for headings, labels and buttons. The three spec-named actions keep the spec's wording so they are recognizable: **Approve Batch**, **Reject Batch**, **Start Sewing Assembly**.
- Active voice. A button names what happens, and the confirmation repeats the verb: "Approve Batch" gives the toast "Batch approved."
- Use the spec's nouns: cutting order, component, batch, verifier, sewing queue.
- Errors state what happened and what to do. They do not apologize and are never vague.
- No exclamation marks, no emoji, no greetings with the user's name, no marketing phrases.
- Times display in the factory's local time (Asia/Colombo), 24-hour, like "5 Oct 2026, 14:32". Stored in UTC.
- Do not join metadata with dots, slashes or dashes. Use a definition list or separate elements.
- Do not append arrows to links or buttons. Do not use "WORD — fragment" labels.

### 13.2 Core strings

| Situation | Copy |
|---|---|
| Quantity empty | Enter a quantity. |
| Quantity decimal | Use a whole number with no decimals. |
| Quantity negative | Use 1 or more. (counts: Use 0 or more.) |
| Quantity not digits | Use digits only. |
| Fabric used format | Enter yards as a positive number with at most 2 decimals. |
| Fabric roll ID | Use 3 to 40 letters, digits or hyphens, like FAB-ROLL-882. |
| Recipe not chosen | Choose a recipe. |
| Reject note too short | Write at least 5 characters so the supervisor knows what to fix. |
| Approve blocked (422 short) | Can't approve. Sleeve Cuffs is short by 2. Recount, or reject the batch. |
| Approve blocked (422 uncounted) | Can't approve. 2 components still need a count. |
| Already decided (409) | This batch was already decided. Refresh to see its current status. |
| Wrong role (403) | Your role can't do this. |
| Session expired (401) | Your session ended. Sign in again. |
| Login failed | Email or password is incorrect. |
| Network failure | Couldn't reach the server. Check the connection and try again. |
| Verifier queue empty | No batches waiting for a count. |
| Supervisor list empty | No cutting orders yet. Create the first one. |
| Sewing queue empty | No verified batches yet. Batches appear here after a verifier approves them. |
| Toasts | Cutting order created. Counts saved. Sent to verification. Batch approved. Batch rejected. Sewing started. |

---

## 14. Accessibility and contrast contract

This section implements the spec's zero-tolerance contrast rule.

1. **Every input, select, textarea, popover list and dialog uses `paper` with `ink` text** in default, hover, focus, filled, error, disabled and autofilled states.
2. Text contrast: 4.5:1 minimum (all token pairs in 4.4 comply). UI component edges and graphics: 3:1 minimum.
3. Status is never color alone: lamp shape plus label; stamp text; Gate strip sentence.
4. Visible focus on every interactive element: 2 px outline, 2 px offset. Never remove outlines without replacement.
5. Touch targets 44 px minimum (inputs 48, terminal count fields 56).
6. Labels are visible and associated (`for`/`id`). Errors are linked by `aria-describedby` and announced via `aria-live="polite"`.
7. The Gate strip is `role="status"`. The wastage scale is `role="meter"` with a text equivalent.
8. Keyboard: dialogs trap focus and close on Esc; select lists navigate with arrows; tab order follows reading order.
9. Works at 200% zoom and 360 px width with no horizontal page scroll.
10. `prefers-reduced-motion` respected.
11. **Automated gate:** Playwright with `@axe-core/playwright` scans every page and with each dialog and Select open; any `color-contrast` violation fails the build.
12. **Manual gate:** click every input and dropdown on production in a clean browser profile (the evaluator's step), including an autofilled login.

---

## 15. Tells to avoid

| Tell | Do instead |
|---|---|
| Stock shadcn zinc/slate neutrals and black primary buttons | Tokens in section 4; vat primary |
| One `rounded-xl` on everything | Radius by function (section 7) |
| Identical cards with soft grey shadows | Tables, ledgers, bordered slips; no resting shadows |
| Gradient washes, glass, blurred blobs | Flat color only |
| Uppercase tracked eyebrow above headings | Sentence-case heading, nothing above it |
| Numbered markers (01, 02, 03) on content that is not a sequence | Plain headings |
| Meta strings joined with middle dots | Definition lists |
| Labels shaped like "WORD — fragment" | Two plain elements |
| Monospace for small labels and IDs | Atkinson 700 with tabular figures |
| Arrow appended to buttons and links | Verb-only labels |
| Hero with big number, stat trio and gradient accent | Task-first openings (login roles, Gate strip) |
| Fade-and-slide entrances, hover lifts on every card | Motion only for feedback (section 12) |
| Tinted near-black as a stand-in for black | `ink` is a deliberate blue-slate used for text only |
| Icons in colored circle tiles | Text labels, custom status glyphs |
| Greetings and emoji ("Welcome back 👋") | Direct page titles |
| Pill badges in many colors | Stamps (rectangles) and lamps (circles), status only |
| Dark mode toggle | Light only, by spec |
| Placeholder-as-label inputs | Visible labels, example placeholders |
| Terracotta/clay or acid-green accents | Indigo vat brand; status colors reserved |

---

## 16. Implementation tokens

### 16.1 `src/app/globals.css`

```css
@import "tailwindcss";

:root {
  color-scheme: light;

  /* base */
  --chalk: #E9ECEF;
  --paper: #FFFFFF;
  --ink: #19242F;
  --vat: #25476B;
  --vat-deep: #1B3652;
  --vat-tint: #DCE6F1;

  /* neutrals */
  --sheet: #F4F6F8;
  --row-hover: #EEF2F6;
  --rule: #C9D0D7;
  --control-edge: #68757F;
  --ink-soft: #44515C;
  --ink-faint: #5C6975;
  --disabled-bg: #DFE4E8;

  /* status */
  --match-bg: #E2F0E5;  --match-fg: #124A28;  --match-edge: #2E7D4B;
  --excess-bg: #FAEFC7; --excess-fg: #5F4200; --excess-edge: #A87A00;
  --short-bg: #FADFDB;  --short-fg: #861B14;  --short-edge: #B8382D;
  --none-bg: #EDF0F3;   --none-fg: #3F4C58;   --none-edge: #7B8793;

  /* shadcn mapping (hex values; if your shadcn setup wraps vars in hsl(), convert to HSL triplets) */
  --background: var(--chalk);
  --foreground: var(--ink);
  --card: var(--paper);
  --card-foreground: var(--ink);
  --popover: var(--paper);
  --popover-foreground: var(--ink);
  --primary: var(--vat);
  --primary-foreground: var(--paper);
  --secondary: var(--sheet);
  --secondary-foreground: var(--ink);
  --muted: var(--sheet);
  --muted-foreground: var(--ink-soft);
  --accent: var(--vat-tint);
  --accent-foreground: var(--ink);
  --destructive: var(--short-edge);
  --destructive-foreground: var(--paper);
  --border: var(--rule);
  --input: var(--control-edge);
  --ring: var(--vat);
  --radius: 4px;
}

@theme inline {
  --color-chalk: var(--chalk);
  --color-paper: var(--paper);
  --color-ink: var(--ink);
  --color-vat: var(--vat);
  --color-vat-deep: var(--vat-deep);
  --color-vat-tint: var(--vat-tint);
  --color-sheet: var(--sheet);
  --color-row-hover: var(--row-hover);
  --color-rule: var(--rule);
  --color-control-edge: var(--control-edge);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-disabled-bg: var(--disabled-bg);
  --color-match-bg: var(--match-bg);   --color-match-fg: var(--match-fg);   --color-match-edge: var(--match-edge);
  --color-excess-bg: var(--excess-bg); --color-excess-fg: var(--excess-fg); --color-excess-edge: var(--excess-edge);
  --color-short-bg: var(--short-bg);   --color-short-fg: var(--short-fg);   --color-short-edge: var(--short-edge);
  --color-none-bg: var(--none-bg);     --color-none-fg: var(--none-fg);     --color-none-edge: var(--none-edge);
  --font-sans: var(--font-atkinson), system-ui, sans-serif;
  --font-display: var(--font-barlow), "Arial Narrow", sans-serif;
}

html { color-scheme: light; }
body { background: var(--chalk); color: var(--ink); font-family: var(--font-sans); font-size: 16px; line-height: 24px; }

/* autofill must never turn text white-on-white */
input:-webkit-autofill,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: #19242F;
  box-shadow: 0 0 0 1000px #FFFFFF inset;
  caret-color: #19242F;
}

:focus-visible { outline: 2px solid var(--vat); outline-offset: 2px; }
.on-vat :focus-visible { outline-color: var(--paper); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }
}
```

Delete the shadcn-generated `.dark { … }` block and every `dark:` class. If your shadcn version generated `oklch()` or `hsl()` values, replace them with the hex tokens above.

### 16.2 Fonts (`src/app/layout.tsx`)

```tsx
import { Atkinson_Hyperlegible_Next, Barlow_Condensed } from "next/font/google";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"], weight: ["400", "700"], variable: "--font-atkinson", display: "swap",
});
const barlow = Barlow_Condensed({
  subsets: ["latin"], weight: ["600"], variable: "--font-barlow", display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${atkinson.variable} ${barlow.variable} light`}>
      <body>{children}</body>
    </html>
  );
}
```
If `Atkinson_Hyperlegible_Next` is not exported by your Next.js version, import `Atkinson_Hyperlegible` instead.

### 16.3 Component overrides (reference classes)

```tsx
// ui/input.tsx
"h-12 w-full rounded-[4px] border border-control-edge bg-paper px-3 text-base text-ink " +
"placeholder:text-ink-faint focus-visible:border-vat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vat " +
"disabled:bg-disabled-bg disabled:text-ink-soft aria-[invalid=true]:border-2 aria-[invalid=true]:border-short-edge"

// ui/select.tsx  SelectContent
"z-50 max-h-80 rounded-md border border-control-edge bg-paper text-ink shadow-[0_8px_24px_rgb(25_36_47/0.18)]"
// SelectItem
"h-11 px-3 text-ink data-[highlighted]:bg-row-hover data-[highlighted]:text-ink data-[state=checked]:font-bold"

// ui/button.tsx variants
primary:   "h-12 rounded-[4px] bg-vat px-5 font-bold text-paper hover:bg-vat-deep"
secondary: "h-11 rounded-[4px] border border-control-edge bg-paper px-4 font-bold text-ink hover:bg-row-hover"
reject:    "h-11 rounded-[4px] border-[1.5px] border-short-edge bg-paper px-4 font-bold text-short-fg hover:bg-short-bg"
disabled:  "disabled:cursor-not-allowed disabled:border-0 disabled:bg-disabled-bg disabled:text-ink-soft"

// domain/stamp.tsx
"inline-block rounded-[2px] border-[1.5px] px-2 py-1 text-sm font-bold"
```

### 16.4 Guard rails in the repo

Add to CI (and run locally) so default styling cannot creep back:

```bash
# should print nothing
grep -rnE "dark:|bg-(slate|gray|zinc|neutral|stone|black|white)\b|text-(slate|gray|zinc|neutral|stone|black|white)\b|rounded-(xl|2xl|3xl)|gradient|backdrop-blur" src/components src/app
grep -rnE "·|→|—" src/components src/app --include=*.tsx   # review hits: UI strings must not use dot-joined meta, arrows or spaced dashes
```

---

## 17. Design review checklist

Run before every merge that touches UI.

**Identity**
- [ ] Only tokens from section 4 are used. No raw hex in components, no default Tailwind palette classes
- [ ] Brand indigo appears only in the permitted places (4.5)
- [ ] The Gate strip is the loudest element on the terminal; nothing else competes
- [ ] No shadows on resting surfaces; no gradients; no uppercase labels; no monospace labels

**Function**
- [ ] Gate strip, lamps and stamps match the state tables exactly, with words and shapes
- [ ] Approve Batch is disabled with an explanation when any component is short or uncounted, and follows server-confirmed state
- [ ] Spec-named buttons use the exact wording
- [ ] Every list and detail has loading, empty and error states with the copy from 13.2

**Contrast and input**
- [ ] Clicked every input, select (open), textarea and dialog: dark legible text on light backgrounds in every state
- [ ] Autofilled login is legible
- [ ] Axe scan reports zero `color-contrast` violations on every page, with dialogs and selects open
- [ ] Count and quantity fields reject `-`, `.`, `e` and letters; errors are inline and linked

**Layout**
- [ ] Left aligned; numeric columns right aligned with tabular figures
- [ ] 360 px and 1280 px both checked; no horizontal page scroll; 200% zoom usable
- [ ] Touch targets 44 px or larger (count fields 56 px)

**Copy**
- [ ] Sentence case; verbs on buttons; toasts repeat the verb
- [ ] No arrows, middle dots in metadata, spaced dashes, emoji or exclamation marks
- [ ] Times shown in Asia/Colombo, 24-hour
