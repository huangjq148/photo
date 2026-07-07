export function getAuthenticatedRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/memories" : null;
}
