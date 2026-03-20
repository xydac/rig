# Idea: Dashboard Terminal Emulator with Tmux Integration

**Date:** 2026-03-19
**Source:** standup
**Product:** rig
**Status:** evaluated

## Description
Add a terminal emulator to the Rig dashboard that can communicate with different tmux panes. Once the dashboard is started, the user can interact with running sessions (PM agents, standups, etc.) directly from the browser UI instead of switching between terminal windows.

## Approach
Start with read-only tmux pane viewing (xterm.js + WebSocket bridge), then add input/control in a second phase. Keep scope tight — don't over-invest until core standup flow is solid.

## Problem it solves
Currently the user must manage multiple tmux panes manually to interact with Rig sessions. A browser-based terminal embedded in the dashboard gives a single pane of glass for all Rig operations — view, interact, and control everything from one place.

## Evaluation
- **Impact:** 3 (High) — transforms dashboard from passive display to active control surface; major UX upgrade for the solo operator
- **Confidence:** 0.75 (Medium) — clear user need (founder requested it), but phased approach means full value comes later
- **Reach:** 0.8 — affects every standup session where multiple agents are running
- **Effort:** 4 (L) — xterm.js + WebSocket bridge + tmux IPC is non-trivial, even for phase 1 read-only
- **ROI Score:** 0.45
