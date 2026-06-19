import { z } from "zod";

import {
  calculateMinimumEventPlayerCount,
  formatMinimumEventPlayerMessage,
} from "@/domain/event-requirements";

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}, z.string().email().nullable());

export const playerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  accountEmail: optionalEmailSchema,
  appUserId: z
    .preprocess(
      (value) => (value === "" ? null : value),
      z.string().uuid().nullable(),
    )
    .default(null),
  rating: z.coerce.number().min(1).max(10),
  isActive: z.coerce.boolean().default(true),
});

export const eventSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    venue: z.string().trim().max(120),
    startsAt: z.coerce.date(),
    courtCount: z.coerce.number().int().min(1).max(20),
    courtMinutes: z
      .array(z.coerce.number().int().min(5).max(1440))
      .min(1)
      .max(20),
    requestedRoundMinutes: z.coerce.number().int().min(5).max(120),
    breakMinutes: z.coerce.number().int().min(0).max(30),
    notes: z.string().trim().max(1000),
    playerIds: z.array(z.string().uuid()),
  })
  .superRefine((event, context) => {
    if (event.courtMinutes.length !== event.courtCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter availability minutes for each court.",
        path: ["courtMinutes"],
      });
    }

    const requiredPlayers = calculateMinimumEventPlayerCount(event.courtCount);
    if (event.playerIds.length < requiredPlayers) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: formatMinimumEventPlayerMessage({
          courtCount: event.courtCount,
          selectedPlayerCount: event.playerIds.length,
        }),
        path: ["playerIds"],
      });
    }
  });

export const scoreSchema = z.object({
  matchId: z.string().uuid(),
  eventId: z.string().uuid(),
  teamOneScore: z.coerce.number().int().min(0).max(99),
  teamTwoScore: z.coerce.number().int().min(0).max(99),
});
