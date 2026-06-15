---
name: padeltour-domain
description: Use when changing scheduling, scoring, standings, timers, or event data-consistency rules.
---

# Scheduling and Domain Rules

1. Keep the scheduling engine pure, deterministic for a seed, and free of React or database imports.
2. Fill every match with four distinct stable player IDs and reject blanks or placeholder values.
3. Balance appearances so counts are equal when possible and differ by at most one otherwise.
4. Minimize consecutive rests, repeated partners, repeated opponents, and team rating differences in that order without violating hard constraints.
5. Support different court counts per round and validate total appearances as matches multiplied by four.
6. Never regenerate or overwrite completed matches.
7. Rank by total points when completed match counts are equal; otherwise rank by average points. Then use win rate, point difference, wins, and stable display order as tiebreakers.
8. Derive all standings from completed match records.
9. Keep timer math pure: countdown, pause, resume, overtime, and elapsed duration are timestamp calculations.
10. Maintain regression scenarios for 4, 5, 8, 9, 12, and 13 players; one or more courts; unequal court availability; exact and inexact appearance equality; deterministic seeds; draws; and completed-match protection.
