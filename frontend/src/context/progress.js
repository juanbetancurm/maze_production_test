export function normalizeProgressResponse(progressList = []) {
  return progressList.reduce((acc, entry) => {
    acc[entry.levelId] = {
      unlocked: entry.unlocked,
      completed: entry.completed,
      bestMoves: entry.bestMoves ?? null,
      bestLivesRemaining: entry.bestLivesRemaining ?? null,
    };
    return acc;
  }, {});
}
