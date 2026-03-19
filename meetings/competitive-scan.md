# Meeting: Competitive Scan

**Type:** company (runs across all products)
**Human:** autonomous
**Trigger:** post-DONE (runs after standup execution completes)

## Purpose
Quick scan of competitor activity across all products. Check for notable updates, new features, pricing changes.

## Instructions

For each product in config.yaml that has a competitive landscape file (`products/<name>/competitive/landscape.md`):

1. Read the product's competitive landscape file
2. For each competitor listed, check for recent updates if possible
3. If notable changes found, write to `products/<name>/competitive/<run-id>-scan.md`:
   ```
   # Competitive Scan — <run-id>

   ## <Competitor Name>
   - **Change:** <what changed>
   - **Impact:** <how does this affect us>
   - **Action:** <suggested response or "monitor">
   ```
4. If no notable changes or no landscape file exists, skip (don't create empty files)

## Outputs
- `products/<name>/competitive/<run-id>-scan.md` (only if changes found)
