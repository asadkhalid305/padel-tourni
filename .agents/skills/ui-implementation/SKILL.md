---
name: padeltour-ui
description: Use when building or reviewing responsive Next.js operational screens and the padel visual system.
---

# UI Implementation

1. Follow current Next.js App Router and React patterns; use Context7 selectively for version-sensitive APIs.
2. Prefer server components and server actions; add client components only for local interaction, forms, and live timers.
3. Reuse small shadcn-style primitives rather than introducing a large component dependency.
4. Design operational screens mobile-first, especially draw navigation, scoring, and timer controls.
5. Use the padel visual language consistently: deep court green, warm lime accents, clear status colors, and restrained motion.
6. Preserve keyboard access, visible focus, semantic labels, adequate contrast, and touch targets.
7. Show destructive or irreversible actions explicitly, especially completed-score changes and schedule regeneration.
8. Verify dashboard, players, event creation, draw, live scoring, and standings at mobile and desktop widths.
