import { z } from "zod";

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}, z.string().email().nullable());

export const playerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  accountEmail: optionalEmailSchema,
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
    playerIds: z.array(z.string().uuid()).min(4),
  })
  .refine((event) => event.courtMinutes.length === event.courtCount, {
    message: "Enter availability minutes for each court.",
    path: ["courtMinutes"],
  });

export const scoreSchema = z.object({
  matchId: z.string().uuid(),
  eventId: z.string().uuid(),
  teamOneScore: z.coerce.number().int().min(0).max(99),
  teamTwoScore: z.coerce.number().int().min(0).max(99),
});
