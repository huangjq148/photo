export function getAuthenticatedRedirectPath(isAuthenticated: boolean) {
  return isAuthenticated ? "/albums" : null;
}
