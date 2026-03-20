# Idea: Rich Markdown Preview in Dashboard

**Date:** 2026-03-19
**Source:** standup
**Product:** rig
**Status:** evaluated

## Description
Add rendered markdown preview to the dashboard so standup summaries, roadmaps, decisions, notes, and other .md files display as rich formatted content instead of raw text.

## Problem it solves
Rig generates and manages a lot of markdown files (standups, roadmaps, backlogs, decisions, ideas). Viewing them as raw text in the dashboard loses readability. Rich preview makes the dashboard a proper read interface for all Rig artifacts.

## Evaluation
- **Impact:** 2 (Medium) — improves readability and makes dashboard more useful as a daily tool, but doesn't unlock new capabilities
- **Confidence:** 1.0 (High) — straightforward feature, well-understood libraries (marked/remark), no unknowns
- **Reach:** 0.9 — every dashboard view that displays .md files benefits
- **Effort:** 1 (S) — drop in a markdown renderer, wire it to file views; minimal integration work
- **ROI Score:** 1.80
