import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, stripe2 } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  const webhookSecret1 = process.env.STRIPE_WEBHOOK_SECRET;
  const webhookSecret2 = process.env.STRIPE_WEBHOOK_SECRET_2;

  const secrets = [webhookSecret1, webhookSecret2].filter(Boolean) as string[];

  if (secrets.length === 0) {
    console.error("No Stripe webhook secrets configured in environment variables (STRIPE_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET_2).");
    return NextResponse.json({ error: "Webhook secrets not configured" }, { status: 500 });
  }

  let event: Stripe.Event | null = null;
  let lastError: any = null;
  let stripeClient = stripe;

  for (let i = 0; i < secrets.length; i++) {
    const secret = secrets[i];
    try {
      const currentClient = i === 0 ? stripe : stripe2;
      event = currentClient.webhooks.constructEvent(body, signature || "", secret);
      stripeClient = currentClient;
      break; // Verification succeeded, stop trying
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!event) {
    console.error(`Webhook signature verification failed for all secrets. Last error: ${lastError?.message}`);
    return NextResponse.json({ error: `Webhook Error: ${lastError?.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (!userId || !tier) {
          console.error("Webhook Error: Missing metadata in checkout session completed.");
          break;
        }

        const subscriptionId = session.subscription as string;
        if (subscriptionId) {
          const subscription = (await stripeClient.subscriptions.retrieve(subscriptionId)) as any;
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: currentPeriodEnd,
              subscriptionTier: tier,
            },
          });
          console.log(`Successfully upgraded user ${userId} to ${tier} tier`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const subscription = (await stripeClient.subscriptions.retrieve(subscriptionId)) as any;

          const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          // Find the user by subscription id and update their period end date
          const user = await prisma.user.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                stripeCurrentPeriodEnd: currentPeriodEnd,
              },
            });
            console.log(`Renewed subscription for user ${user.id}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionTier: "free",
          },
        });
        console.log(`Cancelled subscription ${subscription.id}, degraded tier to free`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const isActive = subscription.status === "active" || subscription.status === "trialing";

        if (!isActive) {
          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              subscriptionTier: "free",
            },
          });
          console.log(`Subscription ${subscription.id} became inactive, degraded tier to free`);
        } else {
          // If metadata contains the tier, update it (useful for upgrades/downgrades)
          const tier = subscription.metadata?.tier;
          const updateData: any = {
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
            stripePriceId: subscription.items.data[0].price.id,
          };
          if (tier) {
            updateData.subscriptionTier = tier;
          }

          await prisma.user.updateMany({
            where: { stripeSubscriptionId: subscription.id },
            data: updateData,
          });
          console.log(`Subscription ${subscription.id} updated successfully`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
