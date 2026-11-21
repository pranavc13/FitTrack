import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap sign-in gate at the edge: only checks that a session cookie exists, so app pages can be served as
 * static shells (instant navigation). The session itself is validated by every API call; an expired one gets
 * a 401 and the client redirects to /login.
 */
export function middleware(req: NextRequest) {
  const signedIn = Boolean(req.cookies.get("ft_session")?.value);
  const { pathname, search } = req.nextUrl;
  if (pathname === "/") return NextResponse.redirect(new URL(signedIn ? "/home" : "/login", req.url));
  if (!signedIn) {
    const login = new URL("/login", req.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/home/:path*", "/food/:path*", "/activity/:path*", "/goals/:path*", "/progress/:path*", "/scan/:path*", "/fit-journal/:path*", "/coach/:path*", "/wellness/:path*", "/analytics/:path*", "/profile/:path*"],
};
