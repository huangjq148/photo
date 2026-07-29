export function isStandaloneRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/invitations/") ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/admin")
  );
}
