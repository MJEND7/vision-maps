"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, Zap, Users } from "lucide-react";

type Price = {
  id: string;
  unit_amount: number;
  currency: string;
  interval: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  prices: Price[];
};

const PricingTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [allPrices, setAllPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data) => {
        console.log("Pricing data from Clerk:", data);
        setProducts(data.products || []);
        setAllPrices(data.allPrices || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching pricing:", error);
        setLoading(false);
      });
  }, []);

  const handleCheckout = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-muted rounded mb-4"></div>
            <div className="h-10 bg-muted rounded mb-6"></div>
            <div className="space-y-3 mb-8">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const defaultPlans = [
    {
      name: "Free",
      price: 0,
      currency: "USD",
      interval: "forever",
      description: "Perfect for getting started",
      features: [
        "3 vision maps",
        "Basic media support",
        "Export as JSON",
        "Community support"
      ],
      icon: <Users className="w-6 h-6" />,
      popular: false
    },
    {
      name: "Pro",
      price: 19,
      currency: "USD",
      interval: "month",
      description: "For creative professionals",
      features: [
        "Unlimited vision maps",
        "Advanced media support",
        "Real-time collaboration",
        "Priority support",
        "Export to multiple formats"
      ],
      icon: <Zap className="w-6 h-6" />,
      popular: true
    },
    {
      name: "Team",
      price: 49,
      currency: "USD",
      interval: "month",
      description: "For growing teams",
      features: [
        "Everything in Pro",
        "Team management",
        "Advanced permissions",
        "API access",
        "Custom integrations"
      ],
      icon: <Users className="w-6 h-6" />,
      popular: false
    }
  ];

  // Create a mapping of our plans using Clerk data when available
  const createPlanFromClerkData = (planName: string, defaultPlan: any) => {
    // Try to find a matching product in Clerk
    const clerkProduct = products.find(p => 
      p.name.toLowerCase().includes(planName.toLowerCase()) ||
      planName.toLowerCase().includes(p.name.toLowerCase())
    );

    if (clerkProduct && clerkProduct.prices.length > 0) {
      const price = clerkProduct.prices[0];
      return {
        ...defaultPlan,
        id: clerkProduct.id,
        price: price.unit_amount / 100,
        currency: price.currency?.toUpperCase() || "USD",
        interval: price.interval || "month",
        priceId: price.id,
        description: clerkProduct.description || defaultPlan.description
      };
    }

    // If no Clerk data, check if we can find a price by name/pattern
    const matchingPrice = allPrices.find(price => {
      const priceName = price.nickname?.toLowerCase() || '';
      return priceName.includes(planName.toLowerCase()) || 
             planName.toLowerCase().includes(priceName);
    });

    if (matchingPrice) {
      return {
        ...defaultPlan,
        price: matchingPrice.unit_amount / 100,
        currency: matchingPrice.currency?.toUpperCase() || "USD",
        interval: matchingPrice.interval || "month",
        priceId: matchingPrice.id
      };
    }

    return defaultPlan;
  };

  const plansToShow = [
    createPlanFromClerkData("free", defaultPlans[0]),
    createPlanFromClerkData("pro", defaultPlans[1]),
    createPlanFromClerkData("team", defaultPlans[2])
  ];

  return (
    <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
      {plansToShow.map((plan, index) => (
        <motion.div
          key={plan.name}
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          viewport={{ once: true }}
          className={`relative border rounded-xl p-6 flex flex-col ${
            plan.popular 
              ? "border-primary shadow-lg scale-105" 
              : "border-border"
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-3 mb-4">
            <div className="text-primary">
              {plan.icon || <Zap className="w-6 h-6" />}
            </div>
            <h3 className="text-xl font-semibold">{plan.name}</h3>
          </div>
          
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                ${plan.price}
              </span>
              <span className="text-muted-foreground">
                /{plan.interval}
              </span>
            </div>
            <p className="text-muted-foreground mt-2">{plan.description}</p>
          </div>

          <div className="flex-1 mb-8">
            <ul className="space-y-3">
              {(plan.features || defaultPlans.find(p => p.name === plan.name)?.features || []).map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => {
              console.log(`Clicked ${plan.name} with priceId:`, plan.priceId);
              if (plan.priceId && plan.price > 0) {
                handleCheckout(plan.priceId);
              }
            }}
            disabled={checkoutLoading === plan.priceId || (plan.price > 0 && !plan.priceId)}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
              plan.popular
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            } ${
              checkoutLoading === plan.priceId 
                ? "opacity-50 cursor-not-allowed" 
                : ""
            } ${
              plan.price === 0
                ? "cursor-default opacity-75"
                : ""
            } ${
              plan.price > 0 && !plan.priceId
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {checkoutLoading === plan.priceId ? (
              "Loading..."
            ) : plan.price === 0 ? (
              "Get Started Free"
            ) : !plan.priceId && plan.price > 0 ? (
              "Coming Soon"
            ) : (
              `Choose ${plan.name}`
            )}
          </button>
        </motion.div>
      ))}
    </div>
  );
};

export default PricingTable;