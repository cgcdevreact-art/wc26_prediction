import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("WARNING: STRIPE_SECRET_KEY is not defined in environment variables.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // Use a stable api version
  apiVersion: "2025-01-27.acacia" as any,
});

export const stripe2 = new Stripe(process.env.STRIPE_SECRET_KEY_2 || process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia" as any,
});

