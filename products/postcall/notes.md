# Postcall Notes

Running context, gotchas, and tribal knowledge.

## Session Notes (2026-03-19)
- Web is deployed on Vercel (last deploy 2026-03-18); Next.js + Clerk + Supabase + Stripe stack
- CRITICAL: local .env.local has Stripe and Clerk test keys (pk_test/sk_test) — must verify Vercel env vars are live keys before launch
- No email sending infrastructure in codebase (no Resend/SendGrid) — #36 is a net-new build
- iOS app: version 1.0 build 1, not yet submitted to App Store; Fastlane screenshots not yet captured (only keyword/title strings exist)
- App Store review timing is critical path — must submit by Mar 22 to hit Mar 25 launch
- Created 14-issue launch milestone on GitHub (milestone #2): https://github.com/xydac/postcall/milestone/2
- Landing page has sections: hero, how-it-works, contexts, personas, features, gallery, pricing, FAQ — no social proof section
- Privacy policy and terms pages both exist at /privacy and /terms
