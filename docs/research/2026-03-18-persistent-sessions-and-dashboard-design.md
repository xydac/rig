# Persistent Sessions & Dashboard Design Research

**Date:** 2026-03-18

---

## Part 1: Long-Lived PM Agent Sessions

### The Problem
PM agents are spawned fresh each standup and killed after. They lose all accumulated product knowledge between sessions.

### What Actually Works Today

**Agent teams don't persist across sessions.** From the docs: "No session resumption with in-process teammates. /resume does not restore teammates." This is a hard limitation of the experimental feature.

**Individual sessions DO persist.** Claude Code sessions are stored as JSONL files at `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl`. They survive restarts, have no expiration, and can be resumed with:
- `claude --continue` (most recent session)
- `claude --resume <name-or-id>` (specific session)
- `claude -n "session-name"` (name a session at creation)

### Recommended Architecture for Rig

Since agent teams can't be resumed, use a **hybrid approach**:

**Within a standup session (same as today):**
- TeamCreate → spawn PM agents → talk mode → DONE → execute → shutdown
- This works well and stays in a single session

**Across standup sessions (new — state files):**
- PM agents write their accumulated knowledge to `products/<name>/notes.md` and `memory/` files
- Next standup, the PM agent reads these files on startup
- The markdown files ARE the persistent memory — not the session transcript
- This is already how Rig works. We just need to be more intentional about what PM agents save.

**Enhancement for PM agent prompt:**
Add to `pm-agent.md`:
```markdown
## Before shutdown
Before accepting a shutdown request, write any new insights, patterns, or context you learned during this session to:
- `{RIG_ROOT}/products/{PRODUCT_NAME}/notes.md` (append, don't overwrite)
This ensures your knowledge persists to the next standup.
```

**Long-running sessions for power users:**
- Add `./scripts/rig --keep-alive` that doesn't auto-exit after DONE
- The orchestrator stays alive, PM agents shut down after execution
- User can start another conversation without re-spawning everything
- Use `claude -n "rig-standup"` to name the session for easy resume

### What We DON'T Need
- Vector databases (LanceDB, etc.) — overkill for 4 products
- Custom session management — Claude Code handles this
- Cross-machine sync — solo founder, one machine

---

## Part 2: Dashboard Design — Ops Center Aesthetic

### Design Principles (Stolen from the Best)

**From Vercel:** Dark-first, high contrast, no decorative noise. Performance is design.

**From Grafana:** Size = importance. Z-pattern layout. One question per panel. Limit graphs to 4-5 series.

**From Linear:** Dim what's not the focus. Navigation recedes, content dominates. LCH color space for perceptually uniform colors.

**From Datadog:** Traffic light status (green/yellow/red) requires zero explanation.

### Design System for Rig Dashboard

#### Typography
- **Primary:** JetBrains Mono or Geist Mono (monospace, designed for developer UIs)
- **Sizing:** 13px base, 11px labels, 15px card titles, 14px headers
- `font-feature-settings: "tnum"` for tabular numbers

#### Color System
```
Backgrounds:  #0a0a0f (deepest) → #12121a (surface) → #1a1a25 (card hover)
Borders:      #2a2a3a
Text:         #e0e0e8 (primary) → #6a6a7a (dim)
Accent:       #00d4aa (cyan-green — Rig brand color)

Status:
  Running:    #00d4aa (pulsing)
  Idle:       #6a6a7a
  Warning:    #ffaa00
  Error:      #ff4444
  Info:       #4488ff

Stages:
  Exploration: #4488ff (blue)
  Building:    #ffaa00 (amber)
  Pre-Launch:  #ff8844 (orange)
  Launch:      #ff4444 (red — high alert)
  Growth:      #00d4aa (green)
  Maintenance: #6a6a7a (gray)
```

#### Layout
- CSS Grid with `grid-template-areas` for named regions
- `repeat(auto-fit, minmax(280px, 1fr))` for card grids
- 8px grid system, 16px base spacing, 24px section gaps
- Z-pattern: top-left most important → bottom-right least

#### Status Indicators
- Small colored dots (not full-width bars)
- Pulsing animation for "running" state:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```
- Glowing accent for active elements:
```css
text-shadow: 0 0 4px rgba(0, 212, 170, 0.6),
             0 0 12px rgba(0, 212, 170, 0.3);
```

### Dashboard Views (Enhanced)

#### 1. Ops Center (Main View)
Top-level product cards in a grid. Each card shows:
- Product name (large)
- Stage badge (color-coded)
- Launch countdown (if applicable, with warning glow at T-7)
- Key metric (open issues or stage-specific metric)
- Agent status dot (if swarm is running)

Below cards:
- Live feed (right side, fixed height, newest on top)
- Active agents panel (when post-DONE execution is running)

#### 2. Product Detail (Drill-down)
Full-width panel replacing the main view:
- Header: name, stage, description, launch countdown
- Metrics panel: stage-aware metrics with threshold flags
- Roadmap: in-progress / planned / shipped
- Ideas: Kanban-style (inbox → evaluated → planned)
- Recent decisions (last 5)
- Latest standup mentions

#### 3. Activity Timeline
Chronological event feed across all products:
- Color-coded left border by event type (decision=cyan, action-item=amber, commit=gray)
- Filterable by product, event type
- Relative timestamps ("2m ago") → absolute on hover

### CSS Framework Choice
- **WebTUI** (github.com/webtui/webtui) — modular CSS for terminal UI aesthetic
- Or **Terminal.css** (terminalcss.xyz) — 3KB, 10+ themes, zero JS
- Layer our custom design tokens on top

### Inspirations
- Vercel Dashboard: dark, clean, fast
- Grafana: information density, panel discipline
- Linear: reduced visual weight, focus on content
- Claude Code Agent Monitor (github.com/hoangsonww/Claude-Code-Agent-Monitor): agent status Kanban

---

## Implementation Priority

1. **PM agent persistence** — Add "save insights before shutdown" to pm-agent.md (quick)
2. **Dashboard v2** — Richer layout with agent status, launch countdowns, metrics panels
3. **WebTUI or Terminal.css integration** — Swap our vanilla CSS for a proper terminal theme
4. **Long-running session mode** — `--keep-alive` flag for power sessions
