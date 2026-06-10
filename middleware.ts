import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const session = req.auth;
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();

  // UX-only guards (authz is re-validated in every server action / route handler)
  if (pathname.startsWith("/admin") && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
  if (
    (pathname.startsWith("/account") || pathname.startsWith("/checkout")) &&
    !session?.user
  ) {
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${pathname}`, req.url));
  }

  // Set httpOnly sessionId cookie for guests so cart items can be stored
  if (!session?.user && !req.cookies.get("sessionId")) {
    const id = crypto.randomUUID();
    res.cookies.set("sessionId", id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  // Clear guest cookie once user is authenticated (merge already happened in signIn callback)
  if (session?.user && req.cookies.get("sessionId")) {
    res.cookies.delete("sessionId");
  }

  return res;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico).*)"],
};
