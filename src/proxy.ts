import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const publicRoutes = [
  /^\/$/,
  /^\/api\/webhooks\/clerk/,
  /^\/privacy/,
  /^\/terms/,
];

const adminRoutes = [
  /^\/client-info-list.*/,
  /^\/admin.*/,
  /^\/stats.*/,
  /^\/history.*/,
];

const matchesRoute = (patterns: RegExp[], pathname: string) =>
  patterns.some((pattern) => pattern.test(pathname));

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (matchesRoute(publicRoutes, pathname)) {
    return;
  }

  if (matchesRoute(adminRoutes, pathname)) {
    const { orgRole } = await auth.protect();

    if (orgRole !== "org:admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } else {    
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
