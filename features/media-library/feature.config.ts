export const featureConfig = {
  name: "media-library",
  version: "0.1.0",
  enabled: true,
  dependencies: ["auth", "brand-profile"] as const,
} as const;
