// `/dash` — the post-login app entry. Resolves the destination:
//   - 0 brands → /dash/onboarding
//   - 1+ brands → /dash/b/<oldest>/dashboard
// Middleware (middleware.ts) handles signed-out → /login; this server
// component runs only after auth has passed.
//
// The marketing landing at `/` is unaffected — `(app)` group routes start
// at `/dash` to avoid the parallel-pages conflict with `(marketing)/page.tsx`.

import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

export default async function DashIndex() {
  const token = await convexAuthNextjsToken();
  const brands = await fetchQuery(api.brandProfile.brands.list, {}, { token });
  if (brands.length === 0) {
    redirect("/dash/onboarding");
  }
  redirect(`/dash/b/${brands[0]._id}/dashboard`);
}
