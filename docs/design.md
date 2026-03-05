# Paperclip Design Baseline

This file captures the current design direction of the Paperclip control-plane UI so contributors can extend the product without flattening it into generic dashboard UI.

## Product Shape

Paperclip is a dense, operator-facing control plane for running AI-agent companies. The interface is built for high information throughput rather than decorative marketing polish.

## Current UX Principles

- Dense but scannable
- Keyboard-friendly
- Dark-theme first
- Component-driven rather than page-by-page bespoke styling
- Status-heavy, with clear operational state and audit visibility
- Company-scoped navigation with strong context preservation

## Route Groups

The current UI clusters around these operator flows:

- dashboard and summary metrics
- companies and company settings
- org chart and agent management
- projects, goals, and issues
- approvals and costs
- activity and inbox
- auth/bootstrap routes
- `design-guide` as a living component showcase

## Visual Language

- Tailwind CSS with tokenized colors in `ui/src/index.css`
- shadcn/Radix primitive base
- thin borders and restrained shadows
- typography weighted toward legibility over brand flourish
- color used semantically for status and priority first

## Component Hierarchy

1. Primitives in `ui/src/components/ui/`
2. Paperclip composites in `ui/src/components/`
3. Page compositions in `ui/src/pages/`

This hierarchy should remain intact. New reusable product patterns belong in the composite layer rather than being duplicated directly in pages.

## Interaction Norms

- Inline editing and compact surface patterns are preferred over large modal churn.
- Empty, loading, error, and success states should be explicit.
- Operator errors must surface clearly; failures should not be silently swallowed.
- Mobile support matters, but the primary interaction model is still operator control-plane usage.

## Design-System References

Relevant current sources:

- `.claude/skills/design-guide/SKILL.md`
- `ui/src/index.css`
- `ui/src/components/`
- `ui/src/pages/`

Use those sources when extending the UI. This file is the workflow summary, not a replacement for the actual design-system source.

## Boundaries

- Do not redesign the UI while doing workflow/bootstrap work.
- Preserve existing patterns unless the task is explicitly a design change.
- If a future task intentionally changes the visual or interaction system, update this file and the design-guide skill references together.
