import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhooks/clerk",
  "/privacy",
  "/terms",
]);

const isAdminRoute = createRouteMatcher([
  "/client-info-list(.*)",
  "/admin(.*)",
  "/clients-service(.*)",
  "/stats(.*)",
  "history(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;

  if (isAdminRoute(request)) {
    const { orgRole } = await auth.protect();
    if (orgRole !== "org:admin")
      return NextResponse.redirect(new URL("/", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
