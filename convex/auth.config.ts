// Convex Auth provider config — points back at this Convex deployment as the
// JWT issuer. Reads CONVEX_SITE_URL which Convex auto-populates.

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
