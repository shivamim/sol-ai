import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const publicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/api/health",
  "/api/worker",
]);
const authenticatedMiddleware = clerkMiddleware(async (auth, req) => {
  if (!publicRoute(req)) await auth.protect();
});
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  ) {
    return req.nextUrl.pathname === "/" ||
      req.nextUrl.pathname === "/api/health"
      ? NextResponse.next()
      : NextResponse.json(
          { error: "Authentication is not configured" },
          { status: 503 },
        );
  }
  return authenticatedMiddleware(req, event);
}
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
