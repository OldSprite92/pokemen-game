# Pokemon Adventure project instructions

## UI/UX workflow

- For every task that designs, creates, changes, reviews, or fixes a page, component, layout, visual system, responsive behavior, accessibility behavior, or user interaction, use the `ui-ux-pro-max` skill before implementation.
- Treat this project as a child-friendly game for an early-primary-school player. Favor obvious interaction, large touch targets, short readable labels, strong state feedback, forgiving recovery, and low cognitive load over dense or fashionable UI.
- Preserve the project's established visual language unless the user explicitly asks for a redesign. Reuse the existing design system and patterns before introducing new ones.

## Required post-implementation UI review

- After writing or changing any page, component, or UI-related stylesheet, use the `web-design-guidelines` skill before finishing the task.
- Fetch the skill's current upstream guidelines on every review as required by that skill.
- Review the complete application UI surface, not only the last edited file. At minimum include all relevant files under `src/pages/`, `src/components/`, and the shared UI styles in `src/index.css`; also include any other UI files affected by the task.
- Fix applicable findings introduced by, exposed by, or directly related to the task. Report any remaining finding that cannot be safely fixed within scope.

## Animation defaults

- When motion would improve feedback, orientation, continuity, perceived responsiveness, friendliness, or a meaningful reward moment, use the `ui-animation` skill and implement the animation without waiting for a separate request.
- Motion must serve the interaction rather than decorate every surface. Keep frequent interactions fast and restrained; reserve more expressive motion for rare rewards, discoveries, captures, level-ups, and successful learning moments.
- Always support `prefers-reduced-motion`, keep keyboard and touch actions immediate, avoid blocking progress behind animation, and prefer interruptible `transform`/`opacity` transitions over layout-property animation.
- Do not add sound automatically unless it is already part of the requested feature or the user explicitly asks for it.

## Skill order for UI tasks

1. Use `ui-ux-pro-max` to establish or retrieve the design direction and interaction rules.
2. Use `ui-animation` when the interface has a justified motion opportunity.
3. Implement the page or component.
4. Use `web-design-guidelines` to audit the complete UI surface and resolve applicable findings before delivery.
