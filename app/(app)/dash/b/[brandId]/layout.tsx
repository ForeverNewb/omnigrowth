// Single place where brand ownership is verified on the server. Every page
// under app/(app)/dash/b/[brandId]/ inherits this check. Per the spec, this is
// the structural reason brand-scoped queries can trust the `brandId` foreign
// key alone — the auth boundary is enforced once, here.

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const token = await convexAuthNextjsToken();
  const brand = await fetchQuery(
    api.brandProfile.brands.get,
    { brandId: brandId as Id<"brand_profiles"> },
    { token },
  );
  if (brand === null) notFound();

  return <>{children}</>;
}
