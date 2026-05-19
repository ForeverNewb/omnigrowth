// Convex Auth Next.js middleware. Protects in-app routes (everything under
// /dash) and bounces signed-in users away from /login. Reads auth state from
// cookies set by ConvexAuthNextjsServerProvider.
//
// Brand-count resolution (zero brands → /dash/onboarding, otherwise →
// /dash/b/<oldest>/dashboard) happens in app/(app)/dash/page.tsx, not here.
// Middleware only handles authenticated-vs-not.

import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLoginPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher(["/dash(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  if (isLoginPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/dash");
  }
  if (isProtectedRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
