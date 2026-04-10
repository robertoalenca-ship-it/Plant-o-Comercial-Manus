import { Request, Response } from "express";
import { stripe } from "./stripe";
import { getUserById, updateUserSubscription } from "../db";

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_mock"
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const userId = Number(session.metadata.userId);
      
      if (userId) {
        // Map quantity or price to maxProfiles if needed
        // For now, we assume the plans I set:
        // individual -> 1 unit? or specific maxProfiles?
        // Let's assume: individual=1, expansion=3, enterprise=10
        
        // We can get line items to see what was bought
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;
        
        let maxProfiles = 1;
        if (priceId === process.env.STRIPE_PRICE_ID_EXPANSION) maxProfiles = 3;
        if (priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) maxProfiles = 10;

        await updateUserSubscription(userId, {
          isPaid: true,
          maxProfiles: maxProfiles,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionStatus: "active",
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as any;
      // Find user by stripeSubscriptionId and disable access
      // (This requires a findByStripeSubscriptionId function in db.ts)
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}
