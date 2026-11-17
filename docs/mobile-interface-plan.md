# Mobile Interface Plan — MasterPacker

**Goal:** a mobile interface optimized for the two highest-value moments:
1. **Packing fast** — standing in front of a pile of gear, quickly assigning items to storage boxes.
2. **Finding things** — mid-trip, searching "where did I pack the headlamp?" and instantly seeing which box it's in.

The desktop drag-and-drop board stays untouched. Mobile gets its own purpose-built UI rather than a squeezed-down copy of it.

---

## 1. Guiding principles

- **Thumb-first:** primary actions live in the bottom half of the screen (bottom tab bar, bottom sheets, big tap targets ≥ 44px).
- **One tap per decision:** packing an item should never take more than one tap once you've picked a box; picking the box itself is a large chip, not a dropdown.
- **No dead-ends / clear hierarchy:** every screen answers "where am I, what can I do here"; progress is always visible.
- **Optimistic updates:** every pack/unpack action updates the UI immediately, syncs in the background (the trip page already does optimistic assignment — keep that).
- **Reuse the backend:** all flows work against the existing REST API; no schema changes required.

---

## 2. App shell & navigation

**Problem today:** the mobile nav is a horizontally scrolling pill row wedged under the header — cramped, and `Settings` is pushed off-screen.

**Plan:**

- **Bottom tab bar** (`md:hidden`), fixed to the viewport bottom with `env(safe-area-inset-bottom)` padding:
  - 🧭 **Inventory** (`/`)
  - 🧳 **Trips** (`/trips`)
  - 📦 **Boxes** (`/boxes`)
  - 🔍 **Search** (`/search` — new, see §4)
  - ⚙️ Theme toggle + Settings accessible as a header icon, not a tab (rarely used).
- **Header:**
  - Desktop header (`md:`) stays exactly as-is.
  - Mobile header shrinks to: compact logo + active page title + settings gear. Remove the pill row entirely.
- **Bottom sheet component** (`src/components/mobile/Sheet.tsx`): slide-up panel with drag handle, backdrop, `max-height: 85dvh`, scrollable content. This replaces all modal-style interactions on mobile (add items, pick box, confirm dialogs) because sheets are reachable with the thumb and feel native.
- **FAB (floating action button):** context-dependent — on Trips list: "New trip"; on Trip detail: "Add items"; on Inventory: "Add item".

**Files touched:** `src/components/ui/Header.tsx` (split into desktop/mobile), new `src/components/mobile/BottomNav.tsx`, `src/components/mobile/Sheet.tsx`, `src/components/mobile/Fab.tsx`, small addition to `src/app/globals.css` (safe-area utilities).

---

## 3. Quick packing — mobile Trip detail ("Pack mode")

**Problem today:** the kanban board is a horizontal scroll of 270px columns and HTML5 drag-and-drop, which doesn't work on touch. The fallback is a 10px-font `<select>` on each card — unusable for the core task.

**Plan:** on mobile, the trip detail page gets a **tabbed layout** with two views:

### 3.1 Tab: "To Pack" (default) — the card stack
Purpose-built for speed, modeled on flashcards/task-stack UIs:

```
┌────────────────────────────┐
│  Trip: Winter Tour ▾  [✏️] │  ← trip name + edit; status chip
│  ▓▓▓▓▓▓▓░░░░  12/28       │  ← progress bar (packed/total)
│                            │
│  ┌──────────────────────┐  │
│  │  [photo]  Headlamp   │  │  ← next unpacked item,
│  │           ×2  #camp   │  │    big card, centered
│  └──────────────────────┘  │
│  Pack into:                │
│  ┌─────┐ ┌─────┐ ┌─────┐   │  ← LARGE horizontal chips,
│  │ Blue │ │ Bin  │ │ Pack │   │    one per trip box,
│  │ Bin  │ │  3   │ │  Red │   │    min-height 48px
│  └─────┘ └─────┘ └─────┘   │
│  [ Skip ]      (auto-next) │
└────────────────────────────┘
```

- **One tap packs the item:** tapping a box chip calls `PUT /api/trips/:id/items/:tripItemId` with `packedBoxId` (optimistic), then the stack advances to the next item. Chip shows a checkmark badge with the box's packed count.
- **Skip** leaves the item unpacked and advances.
- Restores packing mistakes via a small "Recently packed" row (last 3 items, with an undo ↩ button → sets `packedBoxId: null`).
- Empty stack state: "All packed! 🎉" + progress 100%.
- **Last-used box is remembered** (component state) and visually highlighted first, because people usually pack several things into the same box in a row.

### 3.2 Tab: "Boxes" — packed overview
- Vertical list of trip boxes, each expandable (accordion): box name, colored icon, packed count / total, and its items inside.
- Per item: name, quantity stepper (`− 2 +` → `PUT`), and a "move" button opening the **box picker sheet**.
- This doubles as a **box manifest** while unpacking at the destination.

### 3.3 Batch packing (optional accelerator, phase 2)
- Long-press an item in the unpacked list (or a "Select" toggle) → multi-select mode with checkmarks → sticky bottom bar "Pack 5 items into…" → box picker sheet. Ideal for "all these cables go in Bin 3".

### 3.4 Updating the trip on the go
- Adding items: the existing "Add items" flow becomes a full-height bottom sheet with the same search + tag-filter it has today (reuse its logic), with items shown as large rows and a "+" on each.
- Adding boxes: bottom sheet with the existing box list + inline "create new box" input (both API calls already exist).
- Read-only mode: hide chips/actions server-config-aware, same as desktop.

### 3.5 What happens to drag-and-drop
- Gate by pointer capability, not viewport: render the kanban board only when `(hover: hover) and (pointer: fine)`; render Pack mode otherwise. (A `useMediaQuery`/`matchMedia` hook in `src/hooks/`.) Tablets with touch+mouse get Pack mode — one tap beats a drag any day.

---

## 4. Search — "which box is it in?"

### 4.1 Search within a trip (top priority)
- **Sticky search bar** on the trip detail (mobile + desktop), filtering `trip.tripItems` client-side by item name/description — the data is already loaded.
- Results as plain, unambiguous rows:

  ```
  🔍 headlamp
  ────────────────────────────────
  🔦 Headlamp            → 📦 Blue Bin
  🔦 Headlamp spare ×2   →   (not packed)
  ```
  - The **box name chip is the hero** of the row, visually dominant (accent color), since "which box?" is the entire question being asked.
  - Unpacked items shown with a muted "not packed" state — also useful as a pre-departure checklist.
- Works identically in Pack mode's stack (filters the stack) and the Boxes tab (filters the accordion).

### 4.2 Global Search tab (`/search` — new page)
For "where is this thing when I'm not looking at a trip?" — searches the **whole inventory**:

- Single search field, results grouped by type: **Items** and **Boxes**.
- For each item result, the row discloses its storage location(s): the `BoxItem` associations (already loaded via `/api/items` — page can expand `boxItems.box`, or add a tiny `?withBoxes=true` param).
- Item row: thumbnail (first picture), name, box chips, markForReorder dot; link to `/items/:id`.
- Recent searches (localStorage) shown as chips when the field is empty.
- Implementation: new `src/app/search/page.tsx`, client-side filtering like the other list pages (dataset size fits comfortably in memory; no backend search endpoint needed for v1).

### 4.3 QR synergy (already half-built)
Labels' QR codes already link to item/box detail pages. On mobile this is the killer "find" feature — scan the box label, see what's inside. Keep the detail pages lean and mobile-readable, and mention this in docs/onboarding hints.

---

## 5. Mobile-friendly common components

Built once in `src/components/mobile/`, reused across screens:

| Component | Used for |
|---|---|
| `Sheet.tsx` | all pickers, add-flows, confirms |
| `SearchBar.tsx` | sticky search with clear button + debounce |
| `ProgressPill.tsx` | "12/28 packed" bar |
| `ChipRow.tsx` | box chips, tag filters (horizontally scrollable, 48px targets) |
| `Stepper.tsx` | quantity +/− |
| `ItemListRow.tsx` | picture + name + meta row for inventory/search/add-flows |
| `EmptyState.tsx` | friendly guidance instead of blank screens |

List pages (Inventory, Boxes, Trips) already render responsively; the plan here is mainly to adopt `ItemListRow`, ensure tap targets ≥ 44px, and make the label-generation UI desktop-oriented only (hide the bulk-label controls below `md`, they're a desktop workflow).

---

## 6. Design language (clarity rules)

- Keep the existing CSS-variable theme system (`--surface-*`, `--ink-*`, `--accent`) — light/dark already work; no new palette needed.
- **Type scale:** item names 15–16px semibold (never below 14px — the current 10px `select`/labels go away), meta text 12–13px.
- **Touch targets:** ≥ 44×44px everywhere; box chips 48px min-height.
- **Spacing:** 16px screen margins, 8–12px gaps; cards keep the current rounded-xl + glass surfaces.
- **Feedback:** every pack/unpack shows a brief highlight/checkmark animation; transient toast for errors with a Retry action instead of `alert()`/`confirm()`.
- **Loading:** skeleton rows instead of spinners for lists.
- **Safe areas:** `padding-bottom: env(safe-area-inset-bottom)` on tab bar & sheets; `100dvh` not `100vh` for full-height layouts.
- **One screen, one job:** Pack mode shows packing; search shows finding; box manifests show contents. No combined mega-screen.

---

## 7. Implementation phases

**Phase 1 — Foundation (shell)**
1. `useMediaQuery` hook; `Sheet`, `SearchBar`, `ProgressPill`, `ChipRow`, `Stepper`, `ItemListRow` components.
2. Split Header: desktop unchanged; mobile compact header + `BottomNav`; add safe-area CSS utilities.
3. Verify all existing pages don't regress (the pill row disappears from Header).

**Phase 2 — Packing (the core feature)**
4. Trip detail: responsive split — kanban (fine pointers) vs. mobile layout (coarse pointers).
5. Build Pack mode stack + box chips + progress (against existing `PUT /api/trips/:id/items/:tripItemId`).
6. Boxes tab accordion + quantity stepper + move sheet + recently-packed undo.

**Phase 3 — Search**
7. Sticky search in trip detail (client-side filter, box-chip result rows).
8. Global `/search` page (Items + Boxes, box location disclosure, recent searches).

**Phase 4 — Flows & polish**
9. Add-items / add-boxes sheets on mobile.
10. Batch packing (multi-select → pack into box).
11. Replace `confirm()` with sheet-based confirms; toasts; skeletons; error retry states.
12. Optional: PWA manifest + icons so the phone gets an "app-like" install and the QR-label loop feels native.

**Out of scope (deliberately):** label generation on mobile, snapshots/settings admin on mobile (keep functional but don't optimize), backend search endpoint (until the dataset proves client-side filtering too slow).

---

## 8. Technical notes & risks

- **APIs:** all flows map to existing endpoints (§3 uses `PUT /api/trips/:id/items/:tripItemId`; §4.2 may add `withBoxes` include to `GET /api/items` — small, optional change).
- **Next.js version:** per `AGENTS.md`, this Next.js has breaking changes vs. training-data assumptions — read `node_modules/next/dist/docs/` for the relevant guides (layouts, client components, `useSearchParams`) before writing code.
- **Pointer gating:** use `matchMedia('(hover: hover) and (pointer: fine)')`, and render the mobile variant on the server by default with a client-side upgrade to avoid a flash, or use CSS-driven dual-render for the trip page.
- **Auth:** mobile pages sit behind the same middleware — nothing changes.
- **Read-only mode:** all mutating chips/buttons must respect `readOnlyMode` from `/api/config`, exactly like desktop.
- **Testing:** quick manual matrix (iOS Safari, Android Chrome, desktop re-size); automated: a Playwright mobile-viewport smoke test for pack + search flows.
