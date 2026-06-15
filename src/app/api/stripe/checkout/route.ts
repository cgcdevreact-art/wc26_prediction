import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier } = await request.json();
    if (tier !== "plus" && tier !== "pro") {
      return NextResponse.json({ error: "Invalid subscription tier selection" }, { status: 400 });
    }

    const priceId =
      tier === "pro" ? process.env.STRIPE_PRICE_PRO_ID : process.env.STRIPE_PRICE_PLUS_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe Price ID for tier '${tier}' is not configured in .env` },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
      success_url: `${appUrl}/simulator?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${appUrl}/subscription?canceled=true`,
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error: any) {
    console.error("Error creating Stripe Checkout Session:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
