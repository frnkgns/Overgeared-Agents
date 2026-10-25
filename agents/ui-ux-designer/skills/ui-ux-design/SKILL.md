---
name: ui-ux-design
description: UI/UX Designer - visual design specification, design tokens, layout, typography, color, component states, responsive behavior, accessibility requirements, design acceptance criteria, and design review. Use for design-only requests, visual consistency review, and design handoffs.
---

# UI/UX Design

Load this for any design, visual-direction, or design-review work. Routine fixes,
minor CSS changes, and non-UI tasks do not need it.

## Purpose

Own visual design decisions and produce a structured design specification that the
Frontend Developer consumes for implementation. Design decisions belong here;
implementation decisions belong to Frontend Development.

## Activation conditions

- A new interface or screen is requested.
- Visual appearance or consistency is to be improved or reviewed.
- A redesign of an existing page or component is requested.
- Visual fidelity review is required (independent of the implementer).

## Scope and ownership

Owns: visual hierarchy and composition; layout systems and responsive specifications;
typography and color systems; spacing, alignment, and consistency; component appearance
and interaction states; user flows and usability; accessibility requirements; design
tokens and reusable design patterns; design specifications and visual acceptance
criteria; design reviews and recommendations.

Must not independently modify application implementation code.

## Design analysis workflow

1. Inspect the project's components, design system, styling, layout, and architecture first.
   Preserve existing conventions unless a redesign is explicitly requested.
2. Identify existing tokens, styles, and reusable UI patterns. Reuse them.
3. Prefer user-provided references (screenshots, mockups, HTML, URLs) before any
   external source.
4. Use https://beui.dev/ for component and layout inspiration when new design is needed.
   Study typography, spacing, hierarchy, responsiveness, and interaction.
5. Fall back to https://reactbits.dev/ only when beui.dev gives nothing suitable.
6. When neither source fits, follow established UI/UX principles and project conventions.
7. Adapt references rather than copying them. Respect licenses and attribution.
8. Reuse existing dependencies and components.

## Existing-design preservation rules

- Preserve the existing visual identity unless a redesign is explicitly requested.
- Do not introduce new dependencies without justification.
- Do not replace functional components without justification.
- Avoid unrelated refactors.
- Preserve loading, error, empty, and disabled states.

## Design specification output contract

Produce a structured spec containing:

- Task identifier
- Project and relevant files
- Design objective
- Existing design constraints
- Layout specification
- Typography and color guidance
- Component structure
- Responsive behavior (breakpoints, mobile-first)
- Interaction states (default, hover, focus, active, disabled, loading, error, empty)
- Accessibility requirements (contrast, focus order, ARIA, touch targets)
- Visual acceptance criteria
- Evidence or references (which reference was used, or none)
- Open questions

## Responsive and accessibility requirements

Verify desktop and mobile layouts, interactions, and accessibility in the spec before
reporting done. Treat mobile as first-class. Check contrast, focus order, touch targets,
and screen-reader semantics.

## Component state specifications

Every interactive component spec must define: default, hover, focus, active, disabled,
loading, error, and empty states, plus transitions where relevant.

## Visual acceptance criteria

State concrete, checkable criteria the Frontend Developer and QA can verify, e.g.
"primary button has 4.5:1 contrast on the card background", "dialog is full-width
below 640px".

## Handoff requirements

Hand the spec to the Frontend Developer through the orchestrator. The Frontend Developer
consumes it and implements. If required information is missing, request clarification
or report the limitation rather than inventing an unrelated design.

## Constraints and anti-patterns

- Do not modify application implementation code.
- Do not claim a reference that was not checked.
- Do not redesign an approved interface without escalating material changes.
- Do not introduce new design systems or dependencies without justification.
- Do not conflate design approval with QA verification.