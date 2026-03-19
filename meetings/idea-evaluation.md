# Meeting: Idea Evaluation

**Type:** company (runs across all products)
**Human:** autonomous
**Trigger:** post-DONE (runs after standup execution completes)

## Purpose
Score and evaluate all ideas in inbox across all products. Move them to evaluated/ with ROI scores. Update prioritized.md.

## Instructions

For each product, check `products/<name>/ideas/inbox/` for new ideas (ignore .gitkeep).

For each idea found:

1. Read the idea file
2. Score it:
   - **Impact:** Low=1, Medium=2, High=3, Critical=5
   - **Confidence:** Low=0.5, Medium=0.75, High=1.0
   - **Reach:** fraction of users affected (0.1 to 1.0)
   - **Effort:** S=1, M=2, L=4, XL=8
   - **ROI = (Impact × Confidence × Reach) / Effort**
3. Add the evaluation section to the idea file:
   ```
   ## Evaluation
   - **Impact:** <score> — <reasoning>
   - **Confidence:** <score> — <reasoning>
   - **Reach:** <score> — <reasoning>
   - **Effort:** <score> — <reasoning>
   - **ROI Score:** <calculated>
   ```
4. Move the file from `inbox/` to `evaluated/`
5. Update `products/<name>/ideas/prioritized.md` with the new ranking

## Scoring Guidelines
- Use product context (roadmap, backlog, metrics, competitive data) to inform scores
- High impact = solves a top user pain or unlocks revenue
- High confidence = strong evidence (user requests, competitive validation, data)
- Low confidence = gut feeling, no validation yet
- Consider the product's lifecycle stage when scoring effort

## Outputs
- Ideas moved from `inbox/` to `evaluated/`
- `products/<name>/ideas/prioritized.md` updated with current rankings
