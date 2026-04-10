import Stripe from "stripe";
import { ENV } from "../_core/env";

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === "production") {
  console.warn("STRIPE_SECRET_KEY is missing in production environment");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_mock", {
  apiVersion: "2025-01-27ts" as any, // Use latest stable or the one you are comfortable with
});

export const STRIPE_PRICES = {
  INDIVIDUAL: process.env.STRIPE_PRICE_ID_INDIVIDUAL ?? "price_individual_mock",
  EXPANSION: process.env.STRIPE_PRICE_ID_EXPANSION ?? "price_expansion_mock",
  ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "price_enterprise_mock",
};
