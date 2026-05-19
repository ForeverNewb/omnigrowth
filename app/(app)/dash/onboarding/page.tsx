"use client";

import { BrandOnboardingScreen } from "@/features/brand-profile/components/BrandOnboardingScreen";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <BrandOnboardingScreen onCreated={(brandId) => router.push(`/dash/b/${brandId}/dashboard`)} />
  );
}
