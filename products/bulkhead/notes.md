# Bulkhead Notes

Running context, gotchas, and tribal knowledge.

## Session Notes (2026-03-20)

### Product State (confirmed from codebase audit, 81 Swift files)
- **Current version**: v1.0.2, in App Store. Show HN posted March 18.
- **Pro features built**: Transfer queue (TransferManager.swift), Cache encryption (AES-256-GCM, CacheEncryptionManager.swift), External display (8 files in ExternalDisplay/), StoreKit 2 paywall (annual $6.99, lifetime $14.99, 7-day trial)
- **Free features built**: All 4 protocols (SFTP/SMB/WebDAV/S3), markdown editor, code editor (50+ langs, 30 themes), SSH key management, Bonjour, biometric lock, thumbnail cache, demo mode
- **NOT built yet**: Batch rename (spec in docs/P1_FEATURE_BATCH_RENAME.md), storage analytics (docs/P1_FEATURE_STORAGE_ANALYTICS.md), smart recents, network-aware auto-connect, multi-select in browser
- **File Provider extension**: Listed as a free feature in paywall docs but NOT found in main app codebase — status unknown, needs investigation

### Architecture Patterns
- All managers use `@Observable @MainActor` pattern with demo mode support via injected providers
- `RemoteFileProvider` protocol is the abstraction layer — all 4 protocols implement it identically
- Demo mode (`DemoDataProvider.swift`, `DemoFileProvider.swift`) exists and is ready but underused in onboarding
- Transfer queue uses temporary files in `BulkHead-cross/` for cross-connection copies — includes stale file cleanup

### PH Launch: April 8, 2026 (Wednesday)
- Postcall launches March 25, Health launches March 31 — April 8 gives 8 days breathing room after Health
- Avoids April 1 (April Fools — bad day to launch)
- **Biggest gap**: No landing page exists. No website repo found. This is the #1 blocking item.
- 27 GitHub issues created under "Product Hunt Launch" milestone on oddinks/bulkhead
- v1.1 must be submitted to App Store review by March 31 (3-7 day Apple review window)

### Highest-Risk Items for PH
1. **WebDAV self-signed certs** — many selfhosted Nextcloud/Caddy servers use self-signed TLS. If BulkHead rejects these, a large portion of the selfhosted audience can't connect.
2. **Demo mode CTA** — PH visitors without a server have nowhere to go. Empty connections list with no demo option = immediate uninstall.
3. **Graceful trial degradation** — if trial lapses and users lose access to data they added during trial, expect negative App Store reviews on PH day.
4. **Landing page** — must exist before April 8. PH "visit website" click is a conversion moment.

### Key Differentiators to Emphasize on PH
- Only iOS app with SFTP + SMB + WebDAV + S3 in one app
- $14.99 lifetime (fills the Transmit iOS vacuum; Termius costs $120/year)
- Zero data collection, no account required, credentials in Keychain only
- Markdown editing (no competitor has this)
- External display support (unique; controller mode demo = strong GIF)
- Storage analytics (if shipped in v1.1 — nobody does this for network shares on iOS)
