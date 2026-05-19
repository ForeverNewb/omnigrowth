export const featureConfig = {
  name: "brand-profile",
  version: "0.1.0",
  enabled: true,
  dependencies: ["auth", "settings-billing"] as const,
} as const;
