# Bulkhead Backlog

## High Priority

### PH Launch Polish (must ship by March 31 in v1.1)
- **Multi-select in file browser** — prerequisite for batch rename, batch delete, batch download. Entry via "Select" toolbar button or long-press. Must include: select all, selected count in nav title, batch action toolbar.
- **Test Connection button** — every connection form needs a verify-before-save button with protocol-specific error messages. Critical for reducing first-run failure rate.
- **WebDAV self-signed certificate support** — per-connection "Trust Self-Signed Certificate" toggle. Most selfhosted WebDAV servers (Nextcloud, Caddy) use self-signed TLS. Currently these may be unreachable.
- **Demo mode CTA on empty state** — connections list empty state must prominently offer "Try with Demo Data." PH visitors without a server have nowhere to go today.
- **Transfer queue speed/ETA display** — show transfer speed (MB/s) and ETA on active transfers. Table stakes for any file transfer tool.
- **Markdown editor save failure handling** — if save-back to remote fails, offer "Copy to clipboard" / "Save locally" fallback. Never silently lose user edits.
- **Inline rename (or pre-select without extension)** — current alert dialog rename doesn't pre-select the name without extension. Fix to match iOS standard.
- **WebDAV PROPFIND redirect handling** — verify URLSession follows PROPFIND redirects (HTTP → HTTPS).

### Protocol Reliability (before April 8)
- **SFTP host key change warning** — if a server's host key changes, refuse connection and show a security warning with fingerprint. Currently unclear if HostKeyManager handles this correctly.
- **S3 region auto-detect / mismatch error** — when region is wrong, S3 returns a redirect with the correct region. Surface this to the user.
- **S3 bucket picker** — after entering S3 credentials, offer a "Browse Buckets" list picker. Reduces manual configuration errors.
- **SMB Unicode filenames** — Japanese/Korean/Chinese filenames in SMB shares must display and operate correctly.
- **Large file WebDAV upload** — streaming upload for files > 100MB (don't load into memory first).

## Medium Priority

### Power User Features (v1.2 scope)
- **Recursive filename search** — even without semantic search, searching beyond the current directory by filename is table stakes. Server-side find or client-side recursive listDirectory.
- **Folder-first sort option** — always show folders before files regardless of sort column. Common preference.
- **View mode persistence** — list/grid preference should persist per-connection or globally (document which and make it configurable).
- **Sort preference persistence** — sort order should not reset on every directory navigation.
- **Code editor language override** — manual language picker when auto-detection is wrong. Toolbar button or nav bar option.
- **Code editor find/replace** — ⌘F in-editor search is expected by developers.
- **Gallery mode auto-suggestion** — when a directory is >80% images, surface a "View as Gallery" button.
- **PDF text selection** — allow selecting and copying text from PDF previews (PDFKit supports natively).
- **Drag-to-reorder connections** — users want most-used connections at top.
- **Connection status indicator** — subtle dot showing recent connection state (green = connected recently, red = last attempt failed).
- **Undo after delete** — 3-5 second "Undo" toast after file delete. If server supports undelete (WebDAV, SMB), attempt it.
- **Cross-connection destination picker** — when moving/copying files, allow selecting a *different* connection as destination (already supported by TransferManager, needs UI).

### Cache & Privacy
- **Clear cache per-connection** — settings option to wipe temp/cached files for a specific connection.
- **Cache size display in Settings** — show how much local cache each connection is using.
- **Key rotation for cache encryption** — advanced option: rotate AES key, re-encrypt all cached files.
- **Encryption status in Diagnostics** — confirm key exists in Keychain, count of encrypted files.

## Low Priority

### Nice-to-Have (post-PH)
- **Image EXIF metadata overlay** — camera, ISO, aperture, focal length on tap in image preview.
- **Audio ID3 metadata** — show album art and track info for audio files.
- **PDF thumbnail sidebar** — page thumbnail strip for long PDFs (like Preview.app on macOS).
- **Gallery thumbnail strip** — horizontal filmstrip at bottom of image gallery.
- **File duplication** — "Duplicate" in context menu (copy to same directory with "copy" suffix).
- **Create new file** — create empty text/markdown file in current directory.
- **Get Info panel** — dedicated sheet: name, type, size, path, dates, permissions.
- **Compress/decompress** — zip support for remote files (download → zip → re-upload).
- **Per-folder view preference** — list/grid preference remembered per directory.
- **Lock screen timeout setting** — "Immediately," "After 1 minute," "After 5 minutes," "On next launch."
- **Export private key** — allow exporting a stored SSH private key to Files/clipboard with warning.
- **Share extension** — receive files from other apps (Photos, Files, Safari) → upload to a BulkHead connection.
- **File Provider extension** — make BulkHead connections appear in iOS Files app (was listed as free feature but implementation not found in codebase — verify status).

## Ideas

- **ProxyJump / SSH tunneling** — connect to servers behind a jump host. High-demand developer feature.
- **Connection health feed** — real-time activity stream of what changed on connected servers since last visit. "12 new files added to /projects since yesterday."
- **Shared connection library** — export/import connection configs (encrypted) for sharing between devices or team members.
- **iCloud Keychain sync** — optionally sync connection credentials across devices via iCloud Keychain (would require `ThisDeviceOnly` → `WhenUnlocked` Keychain access change — security tradeoff to document).
- **Split-pane file browser on iPad** — dual-pane layout for drag-and-drop between two directories. High value for iPad users, high implementation cost.
- **Batch download to Files app** — download multiple selected files directly to iOS Files app (Documents, Downloads folder).
- **WireGuard/VPN-aware connections** — detect active VPN interface and surface relevant connections.
