# Videogen Roadmap

## In Progress

### Social Content Business — AI Tools Channel
Launch a YouTube + Instagram channel in the AI Tools / Developer Productivity niche using the AI video pipeline. Goal: reach YouTube Partner Program in 3-4 months, first affiliate revenue within 4 weeks.

**Plan:** `products/videogen/ideas/evaluated/2026-03-19-1-social-content-business-plan.md`

**Next steps:**
- Create YouTube + Instagram + TikTok accounts (name TBD)
- Set up RunPod endpoints (Qwen3-TTS, FLUX.2, SadTalker) — one `--setup` command each
- Produce 3 test videos (one per video type) this week
- Apply to SaaS affiliate programs: Cursor, Notion, Jasper

## Planned

### RunPod Endpoint Activation
All three AI generation endpoints need to be activated via the toolkit's `--setup` commands before production begins. RunPod API key confirmed working (2026-03-19).

- `python3 toolkit/tools/qwen3_tts.py --setup`
- `python3 toolkit/tools/flux2.py --setup`
- `python3 toolkit/tools/sadtalker.py --setup`

### Pipeline v3 — Screen Recording Integration
Add Playwright-based automated screen recording to the pipeline for AI Tools tutorial content (Type C videos). This is the highest-quality format for the primary niche.

### Channel Branding
Generate channel art, host character portraits, and consistent visual identity using FLUX.2.

## Shipped

### Working Video Pipeline (pipeline.py)
Script → Qwen3-TTS voiceover → Pexels stock footage → ffmpeg composite with subtitles. Proven working: 4 test videos produced (potato-superfood.mp4, sleep-brain-wash.mp4, supplement-waste.mp4, plus vertical format variants).

### 30 Pipeline Configs
Full pipeline registry across YouTube, Instagram, TikTok, and app demo formats. 5 design iterations completed with cost model, content calendar, character system, quality gates, and SEO strategy.

### Pipeline v2 — Subtitles + Batch Generation
Working subtitle burn via ffmpeg. Batch generation proven. All 4 video formats (YouTube landscape/short, Instagram/TikTok vertical) rendering correctly.

### Toolkit Integration
claude-code-video-toolkit integrated. Playwright, RunPod handlers (Qwen3-TTS, FLUX.2, SadTalker, RealESRGAN, ProPainter), sync timing tools all available.
