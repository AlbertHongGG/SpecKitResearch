export function monthWhere(userId: string, fromDateKey: string, toDateKey: string) {
  return {
    userId,
    dateKey: {
      gte: fromDateKey,
      lt: toDateKey,
    },
  };
}
