const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

const RANKING_ORDER = [
  { bestMoves: "asc" },
  { bestTimeSeconds: "asc" },
  { bestLivesRemaining: "desc" },
  { completedAt: "asc" },
];

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseLeaderboardPagination(query = {}) {
  const page = parsePositiveInteger(query.page, 1);
  const pageSize = parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE);

  if (page === null) return { error: "page must be a positive integer" };
  if (pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return { error: `pageSize must be between 1 and ${MAX_PAGE_SIZE}` };
  }

  return { page, pageSize };
}

async function getLeaderboardPage(prisma, levelId, requestedPagination) {
  const where = { levelId, completed: true };
  const totalEntries = await prisma.levelProgress.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalEntries / requestedPagination.pageSize));
  const page = Math.min(requestedPagination.page, totalPages);
  const offset = (page - 1) * requestedPagination.pageSize;

  const entries = await prisma.levelProgress.findMany({
    where,
    include: {
      team: {
        include: {
          members: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      level: true,
    },
    orderBy: RANKING_ORDER,
    skip: offset,
    take: requestedPagination.pageSize,
  });

  return {
    levelId,
    levelName: entries[0]?.level?.name || null,
    totalEntries,
    page,
    pageSize: requestedPagination.pageSize,
    totalPages,
    winners: entries.map((entry, index) => ({
      rank: offset + index + 1,
      teamId: entry.teamId,
      course: entry.team.course,
      members: entry.team.members.map((member) => member.name),
      bestMoves: entry.bestMoves,
      bestTimeSeconds: entry.bestTimeSeconds,
      bestLivesRemaining: entry.bestLivesRemaining,
      completedAt: entry.completedAt,
    })),
  };
}

module.exports = {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parseLeaderboardPagination,
  getLeaderboardPage,
};
