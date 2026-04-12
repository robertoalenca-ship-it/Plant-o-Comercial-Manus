import Stripe from "stripe";
import { ENV } from "../_core/env";

if (!ENV.stripeSecretKey && process.env.NODE_ENV === "production") {
  console.warn("STRIPE_SECRET_KEY is missing in production environment");
}

export const stripe = new Stripe(ENV.stripeSecretKey || "sk_test_mock");

export const STRIPE_PRICES = {
  INDIVIDUAL: ENV.stripePriceIdIndividual || "price_individual_mock",
  EXPANSION: ENV.stripePriceIdExpansion || "price_expansion_mock",
  ENTERPRISE: ENV.stripePriceIdEnterprise || "price_enterprise_mock",
};
