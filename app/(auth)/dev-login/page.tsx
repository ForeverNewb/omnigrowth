import { DevLoginPortfolio } from "@/features/auth/components/DevLoginPortfolio";
import { notFound } from "next/navigation";

// Env-gated: returns 404 in production. Used for E2E + multi-account dev
// testing without round-tripping email codes.
export default function DevLoginPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN !== "true") {
    notFound();
  }
  return <DevLoginPortfolio />;
}
