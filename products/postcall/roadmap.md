# Postcall Roadmap

## Goal: v1.0 Launch — March 25, 2026

### ✅ All TestFlight Blockers — Shipped (2026-03-17)
- [x] #53 — OAuth buttons: brand-colored text logos (Google "G", LinkedIn "in")
- [x] #54 — Push notification permission requested on sign-in and app launch
- [x] #45 — Delete meetings: swipe-to-delete (iOS) + delete button (web)
- [x] #38 — Fake aggregateRating removed from JSON-LD
- [x] #31 — Content-Security-Policy header added to next.config.js

### ✅ Also Shipped
- [x] #32 — Meeting detail page auto-polls every 5s during processing
- [x] #33 — RetryButton on failed meeting detail page
- [x] #46 — Click-to-rename title on meeting detail page
- [x] #29 — Monthly quota resets automatically each calendar month
- [x] #39 — Duration uses Whisper's actual duration (accurate for all formats)
- [x] #42 — Multi-language transcription (50+ languages, removed hardcoded English)
- [x] #43 — Audio files deleted after processing (privacy + cost)
- [x] #56 — Deprecated autocapitalization API replaced

### 🔴 Launch Milestone — P0 (critical path, due Mar 22)
- [ ] #70 — [iOS] Capture App Store screenshots with Fastlane
- [ ] #71 — [iOS] Frame screenshots with device bezels
- [ ] #72 — [iOS] Complete App Store Connect metadata
- [ ] #73 — [iOS] Submit app for App Store review ← **do today**
- [ ] #74 — Switch Stripe to live/production keys
- [ ] #75 — Switch Clerk to production instance
- [ ] #76 — End-to-end smoke test before launch day

### 🟠 Launch Milestone — P1 (due Mar 24)
- [ ] #44 — Social proof on landing page
- [ ] #36 — Email notifications (processing-complete email, MVP scope)
- [ ] #77 — [iOS] Distribute to TestFlight external testers
- [ ] #78 — Create Product Hunt Ship page and schedule launch
- [ ] #79 — Prepare launch day social posts

### 🟡 Launch Milestone — Assets (due Mar 24)
- [ ] #18 — Product screenshots (web / social / Product Hunt)
- [ ] #19 — Demo GIF / video for landing page and Product Hunt

### v1.1+ (post-launch)
- #37 — Speaker diarization
- #35 — Search across transcripts and action items
- #34 — Automatic recording
- #40 — Integrations (Slack, CRM, Notion, Zapier)
- #55 — StoreKit/IAP infrastructure (only if needed for App Store monetization)
- #36 scope expansion — weekly digest, re-engagement, quota-reset emails

## Shipped (Historical)
- Stripe payments & Pro tier (live)
- Brand refresh (oddinks orange)
- iOS login redesign, widgets, Siri intents, deep linking
- Landing page overhaul
- Monorepo restructure
- All TestFlight blockers cleared (2026-03-17)
