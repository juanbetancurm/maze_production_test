const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseLeaderboardPagination,
  getLeaderboardPage,
} = require("../src/services/leaderboard");

function makeEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    teamId: `team-${index + 1}`,
    team: {
      course: index % 5 === 0 ? null : String.fromCharCode(65 + (index % 5)),
      members: [{ name: `Player ${index + 1}` }],
    },
    level: { name: "Right Angles" },
    bestMoves: 10,
    bestTimeSeconds: 60,
    bestLivesRemaining: 3,
    completedAt: new Date(Date.UTC(2026, 0, index + 1)),
  }));
}

function fakePrisma(entries) {
  const calls = [];
  return {
    calls,
    levelProgress: {
      count: async ({ where }) => {
        assert.deepEqual(where, { levelId: 1, completed: true });
        return entries.length;
      },
      findMany: async (args) => {
        calls.push(args);
        return entries.slice(args.skip, args.skip + args.take);
      },
    },
  };
}

test("pagination defaults preserve the previous top-ten API behavior", () => {
  assert.deepEqual(parseLeaderboardPagination({}), { page: 1, pageSize: 10 });
  assert.deepEqual(parseLeaderboardPagination({ page: "2", pageSize: "5" }), { page: 2, pageSize: 5 });
});

test("rejects malformed or oversized pagination parameters", () => {
  assert.match(parseLeaderboardPagination({ page: "0" }).error, /positive integer/);
  assert.match(parseLeaderboardPagination({ page: "2x" }).error, /positive integer/);
  assert.match(parseLeaderboardPagination({ pageSize: "51" }).error, /between 1 and 50/);
});

test("five entries per page retain sequential global ranking numbers", async () => {
  const prisma = fakePrisma(makeEntries(12));
  const secondPage = await getLeaderboardPage(prisma, 1, { page: 2, pageSize: 5 });

  assert.deepEqual(secondPage.winners.map((winner) => winner.rank), [6, 7, 8, 9, 10]);
  assert.equal(secondPage.page, 2);
  assert.equal(secondPage.totalPages, 3);
  assert.equal(secondPage.totalEntries, 12);
  assert.equal(prisma.calls[0].skip, 5);
  assert.equal(prisma.calls[0].take, 5);
});

test("third page contains ranks 11 through 15 without resetting the rank", async () => {
  const prisma = fakePrisma(makeEntries(17));
  const thirdPage = await getLeaderboardPage(prisma, 1, { page: 3, pageSize: 5 });

  assert.deepEqual(thirdPage.winners.map((winner) => winner.rank), [11, 12, 13, 14, 15]);
});

test("preserves the existing ranking order for ties", async () => {
  const prisma = fakePrisma(makeEntries(3));
  const result = await getLeaderboardPage(prisma, 1, { page: 1, pageSize: 5 });

  assert.deepEqual(result.winners.map((winner) => winner.teamId), ["team-1", "team-2", "team-3"]);
  assert.deepEqual(prisma.calls[0].orderBy, [
    { bestMoves: "asc" },
    { bestTimeSeconds: "asc" },
    { bestLivesRemaining: "desc" },
    { completedAt: "asc" },
  ]);
});

test("returns short and empty result pages cleanly", async () => {
  const shortResult = await getLeaderboardPage(fakePrisma(makeEntries(4)), 1, { page: 1, pageSize: 5 });
  assert.equal(shortResult.winners.length, 4);
  assert.equal(shortResult.totalPages, 1);

  const emptyResult = await getLeaderboardPage(fakePrisma([]), 1, { page: 1, pageSize: 5 });
  assert.equal(emptyResult.winners.length, 0);
  assert.equal(emptyResult.totalEntries, 0);
  assert.equal(emptyResult.totalPages, 1);
});

test("clamps an outdated page to the final available page after results shrink", async () => {
  const result = await getLeaderboardPage(fakePrisma(makeEntries(6)), 1, { page: 4, pageSize: 5 });

  assert.equal(result.page, 2);
  assert.deepEqual(result.winners.map((winner) => winner.rank), [6]);
});
