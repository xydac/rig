# Keel — Roadmap

**App name:** Keel | **Domain:** keel.app (needs purchase) | **Metaphor:** "even keel" = balance/stability
**Positioning:** Privacy-first nutrition and fitness app. No data collection, no tracking. UI must be as polished as category leaders — privacy reads as a deliberate choice, not a limitation.

---

## Goal: v1.0 Launch — 2026-03-31

### Launch Checklist (all must ship)

**Feature work**
- [ ] #25 — UI polish pass (typography, spacing, color, empty states)
- [ ] #11 — Exercise search/filter in workout picker (P1 UX)

**Launch prep**
- [ ] #27 — Privacy policy hosted at public URL
- [ ] #28 — App Store + Google Play store listings (copy, app records, pricing)
- [ ] #29 — App Store screenshots (after #25 UI polish)
- [ ] #30 — TestFlight / internal testing on real hardware
- [ ] #31 — Production build config + EAS submission setup

**Critical path order:**
`#31 (build config)` → `#25 (UI polish)` + `#11 (exercise search)` → `#27 (privacy policy)` + `#28 (store listings)` → `#30 (TestFlight)` → `#29 (screenshots)` → **submit by March 24–25**

**Decisions made this standup (2026-03-19)**
- App name: **Keel** (keel.app)
- Launch strategy: fully unlocked, free. Premium tiers defined post-launch from user feedback.
- keelapp.com = unrelated construction app (no conflict). keel.health = B2B clinical mental health platform (low conflict). USPTO formal clearance search recommended before trademark filing.

---

## Shipped

### 2026-03-17 sprint
- Custom food entry — createCustomFood(), /nutrition/create-food screen (#8)
- Onboarding privacy story — XChaCha20 claims, visual hierarchy (#9)
- Rest timer haptics — Haptics.notificationAsync on expiry (#10)
- App icon + splash — brand teal, shield wordmark, adaptive icon (#24)
- Privacy badge — rendered in ExerciseHub and NutritionHub footers (#18)

### Earlier
- Food photo classifier (TFLite + Food-101)
- Progress photos with XChaCha20 encrypted storage
- Nutrition Hub redesign
- Fasting timer

---

## Post-MVP Backlog

See `backlog.md` for prioritized list.
