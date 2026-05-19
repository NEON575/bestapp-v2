export function canAccess(userRoles: string[] | undefined, allowedRoles?: string[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!userRoles || userRoles.length === 0) {
    return false;
  }

  return allowedRoles.some((role) => userRoles.includes(role));
}

