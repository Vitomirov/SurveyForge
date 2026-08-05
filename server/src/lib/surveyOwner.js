/** Owner fields attached to survey API responses. */
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
