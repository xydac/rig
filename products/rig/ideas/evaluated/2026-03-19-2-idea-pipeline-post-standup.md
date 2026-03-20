# Idea: Per-Product Idea Pipeline as Post-Standup Activity

**Date:** 2026-03-19
**Source:** standup
**Product:** rig
**Status:** evaluated

## Description
Each product should have its own idea pipeline (inbox -> evaluated -> validated -> prioritized). Idea processing (scoring, evaluation, pruning) should run automatically as part of post-standup autonomous activities — so ideas captured during standups get evaluated without manual effort.

## Problem it solves
Ideas get captured but sit in inbox without evaluation. Making idea processing a standard post-standup activity ensures the pipeline stays fresh and ideas get scored/prioritized regularly across all products.

## Evaluation
- **Impact:** 2 (Medium) — keeps idea backlog healthy and prevents idea rot, but doesn't directly ship features
- **Confidence:** 1.0 (High) — the pipeline folders already exist per product, and idea-evaluation.md already runs post-standup; this is mostly ensuring consistency
- **Reach:** 1.0 — applies to every product in the portfolio
- **Effort:** 1 (S) — infrastructure is mostly in place; just needs verification that all products have the folder structure and that post-standup reliably processes all inboxes
- **ROI Score:** 2.00
