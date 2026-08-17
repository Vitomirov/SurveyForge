/**
 * Survey owner metadata for API responses.
 * Maps Prisma survey rows to `ownerId` / `ownerName` fields and defines the
 * Prisma select fragment for joined creator user data.
 */
export function ownerFromSurvey(row) {
  const user = row.createdBy
  return {
    ownerId:   row.createdById ?? null,
    ownerName: user
      ? (user.name || user.username || user.email || '')
      : '',
  }
}

export const CREATOR_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
}
