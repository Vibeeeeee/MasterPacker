# Palette Analysis & Application Plan — "Misty Valley" (DMC Pistachio + Straw)

Status: **plan only — no code changed.** Revert point for current state: commit `a3dff7c` on branch `pr-1`.

---

## 1. The palette

Six DMC floss swatches from the reference image (standard DMC chart values; the uploaded file
turned out to be the older mockup photo, so values are taken from the published DMC chart and the
visual):

| Swatch | Name | Hex | Character |
|---|---|---|---|
| DMC 3821 | STRAW | `#E8B04B` | Warm golden amber — the only saturated warm color |
| DMC 3822 | LIGHT STRAW | `#F0D9A8` | Pale cream — warm neutral tint |
| DMC 369 | VERY LIGHT PISTACHIO | `#D9DDC3` | Cool off-white with a green cast — light surface |
| DMC 368 | LIGHT PISTACHIO | `#B9BE97` | Muted sage — mid neutral |
| DMC 367 | DARK PISTACHIO | `#6E7C50` | Forest olive — dark accent / text on light |
| DMC 319 | VERY DARK PISTACHIO | `#3F4C2D` | Near-black green — ink / dark background |

### What the palette communicates
- **Mood**: misty mountain valley at dawn — calm, organic, low-saturation, warm-vs-cool tension.
- **Structure**: a 2-stop warm scale (straw → light straw) + a 4-stop cool green scale
  (very light → very dark pistachio). Effectively **one hue family for surfaces (greens)** and
  **one hue for emphasis (straw)**.
- **Built-in pairing rule**: straw and very-dark pistachio have a 4.71:1 contrast ratio — they are
  designed to be used as foreground/background pairs. Light straw on white fails (1.38:1), so
  light straw is a *background* color, never text.

### Contrast facts that constrain usage (WCAG ratios computed from the hexes)

| Pair | Ratio | Verdict |
|---|---|---|
| 319 (very dark pistachio) on white | 9.20 | AAA text on light bg ✅ |
| 319 on 369 / 368 / 3822 | 6.61 / 4.76 / 6.66 | AA — text on light surfaces ✅ |
| 319 on 3821 straw | 4.71 | AA — straw buttons with 319 text ✅ |
| 3821 straw on white | 1.95 | ❌ never text/buttons on white |
| 367 on white | 4.50 | AA — smallest text-safe green on white |
| 367 on 3821 straw | 2.30 | ❌ don't pair |
| near-black ink on 3822 / 369 / 368 | 12.59 / 12.50 / 9.01 | AAA — dark text on any light tint ✅ |
| white on 319 | 9.20 | AAA — dark mode text ✅ |
| white on 367 | 4.50 | AA — ok for large text/buttons in dark mode |
| straw on 319 (dark mode accent) | 4.71 | AA ✅ |

---

## 2. How it maps onto the current app ("Night Trail" system)

The app is token-driven: everything reads CSS variables from `app/src/app/globals.css`
(`:root` light + `.dark`), so the palette swap is a **token change, not a component rewrite**.
Current accent is campfire orange `#f97316`; the palette replaces it with straw + pistachio.

### Recommended token mapping

| Current token | Light mode (`:root`) | Dark mode (`.dark`) | Role |
|---|---|---|---|
| `--accent` | `#E8B04B` (3821 straw) — **but see note** | `#E8B04B` | primary buttons, active nav pill, progress fill, focus ring |
| `--accent-strong` | `#D9A03C` (slightly deepened straw for hover) | `#F0C060` | gradient end of accent |
| `--accent-soft` | `rgba(232,176,75,0.16)` | `rgba(232,176,75,0.14)` | hover tints, glow backgrounds |
| `--accent-glow` | `rgba(232,176,75,0.35)` | `rgba(232,176,75,0.30)` | button shadow glow |
| `--background-start/end` | `#F4F2E4` → `#E9E9D6` (light straw / very light pistachio haze) | `#232B1A` → `#2E3A22` (darkened 319) | page scene gradient |
| `--surface-glass` / `-strong` | white 72% / 88% with a green cast (`rgba(255,255,250,…)`) | `rgba(185,190,151,0.07/0.12)` (368-tinted glass) | cards, header, modals |
| `--surface-border` / `-strong` | `rgba(110,124,80,0.14/0.26)` (367-tinted) | `rgba(185,190,151,0.16/0.28)` | borders |
| `--ink-900/700/500/400` | `#2A3320` (near 319) / `#4A5540` / `#6E7C50` (367) / `#9AA17E` (368-ish) | `#F0EFE2` (light straw white) / `#D9DDC3` (369) / `#B9BE97` (368) / `#8B9070` | text hierarchy |
| `--success` | `#6E7C50` (367) | `#B9BE97` | success states — stays in-palette |
| `--danger` | keep a muted brick red `#C05B4D` (harmonizes with straw) | `#E08A7A` | destructive actions — the one non-palette color |
| `--teal-500` (hero glow) | replace with `rgba(185,190,151,0.18)` (368) | same | secondary aurora glow |

**Important accent decision — straw needs a darkened variant for the primary button.**
Straw `#E8B04B` on white is 1.95:1 — fine as a *background* with **319-colored text**
(4.71:1, AA), but the current `.btn-primary` uses white text on an orange gradient, which would
fail with straw. Two options:
1. **Recommended**: primary button = straw gradient background + **very dark pistachio (`#3F4C2D`)
   text** — matches the photo's dawn-light-on-forest look, passes AA, and makes the accent feel
   intentional rather than "low-contrast orange".
2. Alternative: keep white text but use a darkened straw `#C98A2E` for button backgrounds
   (≈4.5:1 with white). Less faithful to the swatch.

### Component-by-component plan

| Area | Recommendation |
|---|---|
| **Body scene** (`body::before`) | Keep the layered radial glows, recolor: straw glow top-left (sun/dawn), pistachio-368 glow bottom-right (mist). Keep the topo-contour texture, re-stroke with 367 at low opacity. |
| **Header** | Glass header stays; active nav pill = straw bg + 319 text (light) / straw bg + 319 text (dark, same); logo tile = straw→367 gradient instead of orange. |
| **Hero** (home, trips) | Headline: ink-900 with the second line in a **367→3821 gradient** (`text-gradient` class) — the valley-sun effect. Eyebrow text in 367. |
| **Cards / glass surfaces** | Unchanged structurally; surfaces pick up the green-cast glass + 367-tinted borders above. Hover: border 367, lift shadow unchanged. |
| **Buttons** | `.btn-primary` = straw gradient + 319 text + straw glow shadow (option 1 above). `.btn-secondary` = glass + ink, hover border 367. `.btn-danger` = muted brick. `.btn-accent` = 3822-soft bg with 367 text. |
| **Chips / tag filters** | Inactive chip: glass + ink-500, hover border 367. Active chip: straw gradient + 319 text (replaces orange fill). Tag colors already user-defined — seed defaults from the palette. |
| **Inputs** | Border 367-soft, focus ring straw + soft straw halo (unchanged pattern, new color). |
| **Kanban board** (trips) | Column bg = glass; drag-over highlight = straw-soft + straw inset ring (replaces orange). Packed item chips = straw gradient + 319 text (currently orange gradient + white — same contrast fix). Unpacked column icon in 368. |
| **Progress bars** | Track = glass; fill = 367→3821 gradient (green→gold, like valley-to-sunrise). |
| **Badges / status pills** | Status colors re-mapped into the family: planning = 368 gray-green, packing = 3821 straw, ready = 367, active = 368 brighter, completed = 400 ink. Badge bg = color at 20% alpha. |
| **Label editor** | **Canvas and rendered labels stay pure black-on-white** — they're print artifacts (Epson/PNG), not UI. Only the editor chrome (toolbar, pills, toolbox chips, ghost) re-themes. |
| **Login / register** | Logo tile = straw gradient with 319 icon; card = glass; unchanged layout. |
| **Modals** | Overlay = `rgba(63,76,45,0.55)` (319-tinted dark) + blur; content = strong glass. |
| **Scrollbar / focus** | Scrollbar thumb = border-strong, hover 367; `:focus-visible` outline = straw. |
| **Dark mode specifics** | Background = deep 319 gradient (`#2A331D` → `#232B1A`); surfaces = 368-tinted glass; text = 369/light-straw hierarchy; accent stays straw (pops nicely on dark green — 4.71:1+). |

### Things that should NOT change
- QR codes and label PNGs: black on white, always (printer/scanner requirement).
- Data viz semantics: red-ish danger stays (muted brick, not palette green) — packing "unpacked" states shouldn't read as "error" or "ok".
- The `topo-bg` contour texture: keep, just re-stroke color.

---

## 3. Implementation plan (when approved)

1. **Single-file token swap**: edit `:root` and `.dark` in `app/src/app/globals.css` per the table
   in §2 (plus `--accent-*`, shadows). ~30 lines change.
2. **Component tweaks** (small, targeted):
   - `globals.css`: `.btn-primary` text color → `#3F4C2D`; `.text-gradient` → 367→3821;
     `.board-row.drag-over` / drag-over cell → straw; `.progress-fill` → 367→3821 gradient;
     `body::before` glows; scrollbar; `::selection` (add: straw-soft bg).
   - `Header.tsx`: logo gradient + active pill text color.
   - `page.tsx` (home hero): gradient span already uses `text-gradient` — no change needed if the
     class is recolored.
   - `trips/[id]/page.tsx`: kanban packed-card chip + drag-over colors (currently inline styles
     referencing `--accent` — they follow the token automatically; only the white-text-on-orange
     chip needs the 319 text fix).
   - `labels/editor/page.tsx`: canvas stays white; selected-element outline already uses
     `--accent` → follows token; resize handle same.
   - `login`/`register`: logo tile gradient.
   - `trips/[id]/page.tsx` `statusMeta`: re-map the five status colors into the family.
3. **Verify**: `tsc --noEmit`, restart dev, screenshot light + dark on home, trips board, label
   editor, login; run one PNG/lemc label export to confirm labels unchanged.
4. **Commit** on `pr-1` as a separate commit ("Pistachio & Straw palette") so it's independently
   revertible; existing commit `a3dff7c` remains the fallback.

## 4. Risks & open questions

- **Straw as UI accent has low contrast on white** — mitigated by 319 text on straw (AA). If the
  buttons feel "washed out", fall back to option 2 (darkened straw bg + white text).
- **Tag colors are user-assigned** — old tags keep their colors; only new seed defaults change.
- **Dark mode glass tint** shifts everything slightly green — check photo cards still read well
  (they're images, unaffected; the gradient overlay on photo cards is dark navy — re-tint to 319).
- **Labels/print**: untouched, but confirm visually once.
- **The palette has no true "neutral gray"** — the pistachio scale doubles as neutrals; fine for
  this app's volume of UI chrome.

## 5. Suggested default tag colors (seeded from the palette)
`Camping #6E7C50 (367)`, `Hiking #B9BE97 (368)`, `Kitchen #E8B04B (3821)`, `Electronics #3F4C2D (319)`,
`Clothing #F0D9A8 (3822, dark text)`, `Documents #D9DDC3 (369, dark text)`.
