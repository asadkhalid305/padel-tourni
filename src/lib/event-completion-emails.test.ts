import { describe, expect, it, vi } from "vitest";

import { selectFinalStandingsRecipients } from "@/lib/event-completion-emails";

describe("selectFinalStandingsRecipients", () => {
  it("normalizes valid emails and skips malformed or duplicate addresses", () => {
    const { recipients, skipped } = selectFinalStandingsRecipients([
      {
        eventPlayerId: "event-player-1",
        playerId: "player-1",
        playerName: "Asad",
        appUserId: "user-1",
        accountEmail: "asad@example.com",
        appUserEmail: "  Asad@Example.com ",
        appUserDisplayName: "Asad Ullah Khalid",
      },
      {
        eventPlayerId: "event-player-2",
        playerId: "player-2",
        playerName: "Broken",
        appUserId: null,
        accountEmail: "asadkhalid305@",
        appUserEmail: null,
        appUserDisplayName: null,
      },
      {
        eventPlayerId: "event-player-3",
        playerId: "player-3",
        playerName: "Duplicate",
        appUserId: null,
        accountEmail: "asad@example.com",
        appUserEmail: null,
        appUserDisplayName: null,
      },
    ]);

    expect(recipients).toEqual([
      {
        eventPlayerId: "event-player-1",
        playerId: "player-1",
        playerName: "Asad",
        recipientAppUserId: "user-1",
        recipientEmail: "asad@example.com",
        recipientName: "Asad Ullah Khalid",
      },
    ]);
    expect(skipped).toBe(2);
  });
});

describe("final standings email links", () => {
  it("injects standings and history links using the configured app origin", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://padel.asadullahkhalid.com/");

    const { __testUtils } = await import("@/lib/event-completion-emails");

    const rendered = __testUtils.renderFinalStandingsEmail({
      event: {
        id: "event-123",
        name: "Friday Ladder Warmup",
        venue: "Racket Club Kreuzberg",
        starts_at: "2026-06-26T10:00:00.000Z",
      },
      recipient: {
        eventPlayerId: "event-player-1",
        playerId: "player-1",
        playerName: "Asad",
        recipientAppUserId: "user-1",
        recipientEmail: "asad@example.com",
        recipientName: "Asad Ullah Khalid",
      },
      workspaceId: "90000000-0000-4000-8000-000000000001",
      standings: [
        {
          rank: 1,
          playerId: "event-player-1",
          playerName: "Asad",
          played: 3,
          pointsFor: 18,
          pointsAgainst: 9,
          pointDifference: 9,
          averagePoints: 6,
          wins: 3,
          draws: 0,
          losses: 0,
          winRate: 1,
        },
      ],
    });

    expect(rendered.html).toContain(
      'href="https://padel.asadullahkhalid.com/events/event-123?view=standings&amp;workspaceId=90000000-0000-4000-8000-000000000001"',
    );
    expect(rendered.html).toContain(
      'href="https://padel.asadullahkhalid.com/history?workspaceId=90000000-0000-4000-8000-000000000001"',
    );
    expect(rendered.text).toContain(
      "Open event standings: https://padel.asadullahkhalid.com/events/event-123?view=standings&workspaceId=90000000-0000-4000-8000-000000000001",
    );
    expect(rendered.text).toContain(
      "View all-time leaderboard: https://padel.asadullahkhalid.com/history?workspaceId=90000000-0000-4000-8000-000000000001",
    );
  });
});
