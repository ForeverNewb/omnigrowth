// Server-side auth helpers. Thin wrapper over Convex Auth's Next.js helpers so
// feature code has a single project-local entry point.
//
// Client components import from `@convex-dev/auth/react` directly (e.g.
// `useAuthActions`, `useConvexAuth`). The helpers here are server-only.

import { convexAuthNextjsToken, isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";

export { convexAuthNextjsToken, isAuthenticatedNextjs };

/**
 * Returns the authentication token for the current request, or undefined when
 * the user is not signed in. Use when you need to call authenticated Convex
 * queries from server components / actions.
 */
export async function getAuthToken(): Promise<string | undefined> {
  return convexAuthNextjsToken();
}

/**
 * Whether the current request is authenticated. Cheap check — does not fetch
 * the user record.
 */
export async function isSignedIn(): Promise<boolean> {
  return isAuthenticatedNextjs();
}
