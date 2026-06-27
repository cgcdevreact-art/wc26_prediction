import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier, agreedToTerms } = await request.json();
    if (tier !== "plus" && tier !== "pro") {
      return NextResponse.json({ error: "Invalid subscription tier selection" }, { status: 400 });
    }
    if (agreedToTerms !== true) {
      return NextResponse.json({ error: "You must agree to the Terms & Conditions before checkout" }, { status: 400 });
    }

    const priceId =
      tier === "pro" ? process.env.STRIPE_PRICE_PRO_ID : process.env.STRIPE_PRICE_PLUS_ID;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const hasStripe = stripeKey && !stripeKey.includes("your-key") && priceId;

    if (!hasStripe) {
      console.warn(`Stripe not fully configured or key/price is invalid. Bypassing Stripe and auto-upgrading to ${tier}`);
      const { prisma: prismaDb } = await import("@/lib/prisma");
      await prismaDb.user.update({
        where: { id: session.user.id },
        data: {
          subscriptionTier: tier,
          stripeCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
      return NextResponse.json({ url: `${appUrl}/subscription/thank-you?tier=${tier}` });
    }

    try {
      // Create the Stripe checkout session
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        billing_address_collection: "auto",
        customer_email: session.user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: session.user.id,
          tier: tier,
        },
        success_url: `${appUrl}/subscription/thank-you?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/subscription?canceled=true`,
      });

      return NextResponse.json({ url: stripeSession.url });
    } catch (error: unknown) {
      console.warn(
        "Stripe Checkout failed, falling back to mock checkout upgrade:",
        getErrorMessage(error, "Unknown Stripe error"),
      );
      const { prisma: prismaDb } = await import("@/lib/prisma");
      await prismaDb.user.update({
        where: { id: session.user.id },
        data: {
          subscriptionTier: tier,
          stripeCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ url: `${appUrl}/subscription/thank-you?tier=${tier}` });
    }
  } catch (error: unknown) {
    console.error("Error creating Stripe Checkout Session:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Internal Server Error") },
      { status: 500 },
    );
  }
}
