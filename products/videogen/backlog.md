# Videogen Backlog

## High Priority

- **Set up RunPod endpoints** — Qwen3-TTS, FLUX.2, SadTalker each need one `--setup` command. RunPod API key confirmed working 2026-03-19 (was 403, now resolves via GraphQL POST). Unblocks all AI generation features.
- **Produce 3 test videos** — One per video type (A: stock+TTS, B: talking head, C: screen recording). Validates which format performs best before scaling.
- **Create social accounts** — YouTube, Instagram, TikTok with consistent handle. Generate channel art with FLUX.2.
- **Apply to affiliate programs** — Cursor, Notion, Jasper, Perplexity (all self-serve). Set up Linktree in bio before first video goes live.

## Medium Priority

- **Playwright screen recording pipeline** — Automate browser recording for AI tool tutorial content (Type C). Playwright is already in the toolkit; needs a recording wrapper + ffmpeg integration.
- **Script generation workflow** — Claude API prompt templates for each video type. Few-shot examples for AI tools and indie hacking topics. Human review gate before publish.
- **Channel identity / host persona** — Generate 2-3 FLUX.2 host portraits (tech presenter aesthetic). Pick one and use consistently for Type B (SadTalker) videos.
- **Content calendar tooling** — Automate weekly script → produce → schedule workflow. Batch produce 1 week of content in one session.

## Low Priority

- **ElevenLabs integration** — Higher-quality TTS for long-form YouTube (~$22/month). Evaluate after Qwen3-TTS quality is assessed in production.
- **Analytics feedback loop** — Track views/retention/affiliate clicks per video. Feed top performers back into script generation as examples.
- **Cross-posting automation** — Auto-adapt long-form YouTube content to short vertical clips for Instagram/TikTok.
- **Upscaling pipeline** — RealESRGAN via RunPod for improving stock footage quality. Low priority until base pipeline is proven.

## Ideas

- Build-in-public series using Oddinks products as case studies — authentic differentiation, cross-promotes other products
- Automated thumbnail generation with FLUX.2 + title overlay
- A/B test video titles before publishing (check search volume with keyword tools)
- Multi-channel expansion: AI Tools channel proven → add Indie Hacking channel Month 2+
