// Email OTP provider for Convex Auth, sending an 8-digit code via Resend.
// Convex-side only — RESEND_API_KEY + RESEND_FROM_EMAIL must be set on the
// Convex deployment (`pnpm dlx convex env set ...`), not in Next.js .env.local.

import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.RESEND_API_KEY,
  maxAge: 60 * 20,
  async generateVerificationToken() {
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    return Array.from(buf, (b) => (b % 10).toString()).join("");
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const apiKey =
      typeof provider.apiKey === "string" && provider.apiKey.length > 0 ? provider.apiKey : null;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set on the Convex deployment");
    }
    const from = process.env.RESEND_FROM_EMAIL ?? "OmniGrowth <onboarding@resend.dev>";
    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [email],
      subject: "Your OmniGrowth sign-in code",
      text: [
        `Your sign-in code is: ${token}`,
        "",
        "It expires in 20 minutes.",
        "If you didn't request this, you can safely ignore this email.",
      ].join("\n"),
    });
    if (error) {
      throw new Error(`Resend send failed: ${error.message ?? error.name}`);
    }
  },
});
