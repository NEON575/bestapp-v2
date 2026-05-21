export function resolveApprovedById(input: { requestedUserId?: string | null; existingUserId?: string | null }) {
  return input.requestedUserId && input.requestedUserId === input.existingUserId ? input.requestedUserId : null;
}
