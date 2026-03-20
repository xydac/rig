# Bulkhead Roadmap

## In Progress

### v1.1 — PH Launch Release (target: submit March 31, launch April 8)
- [ ] Batch rename with pattern system (`{n:3}`, `{date}`, `{original}`, find/replace, case transforms, live preview) — issue #24
- [ ] Storage analytics dashboard (treemap, file type distribution, largest files, age buckets) — issue #25
- [ ] Multi-select in file browser (prerequisite for batch rename and batch delete)
- [ ] Onboarding polish: demo mode CTA on empty state, first-connection success moment — issue #21
- [ ] Connection management: Test Connection button, S3 bucket picker, SMB share picker — issue #19
- [ ] Transfer queue UX: speed/ETA display, clear completed, batch failure messaging — issue #11
- [ ] Markdown editor: save failure handling, unsaved-changes prompt, cursor positioning — issue #15
- [ ] Protocol reliability: WebDAV self-signed cert support, SFTP host key verification — issue #26
- [ ] Paywall graceful degradation: ensure trial-lapse edge cases don't block data access — issue #14

### PH Launch Prep (April 8 target)
- [ ] Landing page build (no website repo exists — blocking) — issue #3
- [ ] PH listing copy and maker story — issues #1, #4
- [ ] Gallery images and demo GIF (external display controller mode + markdown editor) — issue #2
- [ ] App Store screenshot refresh — issue #7
- [ ] Social proof collection (Show HN results, App Store reviews) — issue #9

## Planned

### v1.2 — Power User Depth (Q2 2026)
- Semantic search: on-device E5-small-v2 embeddings across all connections — docs/P2_FEATURE_SEMANTIC_SEARCH.md
- FTP/FTPS protocol support
- Photo gallery mode with EXIF display and slideshow
- Smart recents: time-of-day + network context scoring — docs/P1_FEATURE_SMART_RECENTS.md
- Network-aware auto-connect: SSID detection → surface relevant connections — docs/P1_FEATURE_NETWORK_AWARE_AUTO_CONNECT.md
- Shortcuts/Siri App Intents (connect, list, upload, download, search)
- Home Screen widgets (recent files, connection shortcuts)
- Custom themes/accent colors (Pro feature)

### v2.0 — AI & Automation (Q3 2026)
- Natural language file assistant (Apple Foundation Models, on-device RAG) — docs/P3_FEATURE_NL_FILE_ASSISTANT.md
- Folder watch rules with automated actions (Hazel for iOS) — docs/P4_FEATURE_FOLDER_WATCH_RULES.md
- AI-suggested rules from usage patterns — docs/P4_FEATURE_AI_SUGGESTED_RULES.md
- macOS app (native SwiftUI, not Catalyst)
- Two-way folder sync engine

### v2.5+ — Differentiation (2027)
- Multimodal search: text-to-image via MobileCLIP — docs/P5_FEATURE_MULTIMODAL_SEARCH.md
- Security scanner: on-device PII/credential detection — docs/P5_FEATURE_SECURITY_SCANNER.md
- Diff viewer for code files with server snapshot comparison — docs/P5_FEATURE_DIFF_VIEWER.md
- Connection health feed: change activity stream across all connections — docs/P5_FEATURE_CONNECTION_HEALTH_FEED.md

## Shipped

### v1.0.2 (March 2026)
- External display support: idle screen, file previews, controller mode with gesture area, haptics
- Adaptive font sizing for external display
- Transfer activity overlay on external display idle screen
- SSH Keys link added to Settings (was missing)

### v1.0.1
- AES-256-GCM cache encryption for Pro (key in Secure Enclave via Keychain)
- Manage subscription CTA, Oddinks branding in Settings
- Paywall redesigned for App Store compliance

### v1.0.0 (Initial Launch)
- Multi-protocol file browsing: SFTP (Citadel/NIO SSH), SMB (SMBClient), WebDAV (URLSession), S3 (Soto SDK), Local
- Markdown editor with live split-pane preview, formatting toolbar, export to PDF/HTML
- Code editor: 50+ language syntax highlighting, 30 color themes, line numbers, word wrap
- Text editor with multi-encoding support (UTF-8, ISO Latin, Windows CP1252)
- Image gallery with thumbnail cache (2-tier NSCache + disk LRU), pinch-to-zoom
- PDF preview (PDFKit), video/audio playback (AVPlayer)
- SSH key management: generate Ed25519, import OpenSSH/PEM, per-connection assignment
- Bonjour/mDNS auto-discovery of local network servers
- Transfer queue: batch download/upload, background transfers, retry (3x, exponential backoff), cross-connection transfers, pause/resume
- File operations: rename, move, copy, delete, create directory
- Favorites and recents (50-item FIFO)
- Biometric lock (Face ID / Touch ID)
- StoreKit 2 monetization: annual ($6.99/yr), lifetime ($14.99), tip jar, 7-day free trial
- Demo mode for App Store screenshots and first-run exploration
- Keychain credential storage (ThisDeviceOnly)
- Privacy: zero third-party SDKs, zero analytics, zero telemetry — "Data Not Collected" label
- Show HN posted March 18, 2026
