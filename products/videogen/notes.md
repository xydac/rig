# Videogen Notes

Running context, gotchas, and tribal knowledge.

## Session Notes (2026-03-19)

- RunPod API key (in `toolkit/.env`) was returning 403 on REST endpoints but works fine via `POST /graphql` — confirmed authenticated as `github@mail.xydac.com`. Key is valid and unblocked.
- Supplement Science niche was considered and rejected by founder — liability risk (health claims, FDA, affiliate product risk) not acceptable for bootstrapped operation. Don't revisit.
- Chosen niches: AI Tools Explained (primary, highest CPM $15-25, zero liability) + Indie Hacking / Dev Productivity (secondary, same audience). Both use pure SaaS affiliate programs.
- 3 video types designed: A (stock+TTS, $0.05/ep), B (FLUX.2 talking head + SadTalker, $0.25/ep), C (Playwright screen recording + TTS, $0.30/ep). Type C is best fit for primary niche.
- Full business plan at `products/videogen/ideas/evaluated/2026-03-19-1-social-content-business-plan.md`
- Pipeline.py already working end-to-end. 4 test videos produced as of March 17. No new commits since then.
- RunPod endpoints (Qwen3-TTS, FLUX.2, SadTalker) not yet activated — each needs a `--setup` command to create the serverless endpoint on RunPod. This is the first thing to do before production.
