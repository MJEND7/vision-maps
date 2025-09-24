"use client";

import {
  CheckoutButton,
  usePlans,
} from "@clerk/nextjs/experimental";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Unauthenticated } from "convex/react";
import { Button } from "../ui/button";
import { ROUTES } from "@/lib/constants";
import { SignedIn } from "@clerk/clerk-react";
import AutoCheckout from "./AutoCheckout";

export function PricingComponent() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCheckOut, setShowCheckOut] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const checkoutButtonRefs = useRef<{
    [key: string]: HTMLButtonElement | null;
  }>({});
  const { data, isLoading } = usePlans({
    pageSize: 3,
  });

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && data) {
      nextCard();
    }
    if (isRightSwipe && data) {
      prevCard();
    }
  };

  const nextCard = () => {
    if (!data) return;
    setCurrentIndex((prev) => (prev + 1) % data.length);
  };

  const prevCard = () => {
    if (!data) return;
    setCurrentIndex((prev) => (prev - 1 + data.length) % data.length);
  };

  useEffect(() => {
    if (!data) return;
    const proIndex = data.findIndex((plan) => plan.name === "Pro");
    if (proIndex !== -1) {
      setCurrentIndex(proIndex);
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash;
    const queryString = hash.split("?")[1];

    if (queryString) {
      const params = new URLSearchParams(queryString);
      const selectedPlan = params.get("plan");
      const selectedPeriod = params.get("period");

      if (selectedPlan && selectedPeriod) {
        const wasAnnual = selectedPeriod === "annual";
        setIsAnnual(wasAnnual);

        const planIndex = data.findIndex(
          (plan) => plan.name === selectedPlan
        );
        if (planIndex !== -1) {
          setCurrentIndex(planIndex);
        }

        setShowCheckOut(true);
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your creative needs
            </p>
          </div>

          {/* Skeleton loading cards */}
          <div className="md:grid md:grid-cols-3 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={"loader" + i}
                className="border rounded-xl p-8 animate-pulse"
              >
                <div className="h-6 bg-muted rounded mb-4"></div>
                <div className="h-10 bg-muted rounded mb-6"></div>
                <div className="space-y-3 mb-8">
                  {[1, 2, 3, 4].map((j) => (
                    <div
                      key={"loader-rounded" + j}
                      className="h-4 bg-muted rounded"
                    ></div>
                  ))}
                </div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {showCheckOut && (
        <SignedIn>
          <AutoCheckout
            isAnnual={isAnnual}
            data={data}
            currentIndex={currentIndex}
            forWho="user"
          />
        </SignedIn>
      )}

      <section id="pricing" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* HEADER */}
          <div className="text-center mb-16">
            <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your creative needs
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span
                className={`text-sm font-medium ${
                  !isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnual ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium ${
                  isAnnual ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                Annual
              </span>
            </div>
          </div>

          {/* MOBILE CAROUSEL */}
          <div className="relative md:hidden h-[500px] mb-8">
            <button
              onClick={prevCard}
              className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-background border rounded-full p-2 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextCard}
              className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-background border rounded-full p-2 shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div
              className="relative h-full"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {data.map((plan, index) =>
                currentIndex === index ? (
                  <div
                    key={`MOBILE-${plan.name}`}
                    className="absolute inset-0 flex flex-col justify-between p-8 rounded-xl bg-card shadow-2xl cursor-pointer"
                  >
                    <div className="space-y-3">
                      {plan.name === "Pro" && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="text-center">
                        <h3 className="text-2xl font-semibold mb-2">
                          {plan.name}
                        </h3>
                        <div className="mb-2">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-4xl font-bold">
                              {isAnnual
                                ? plan.annualFee.amountFormatted
                                : plan.fee.amountFormatted}
                            </span>
                            <span className="text-muted-foreground">
                              {isAnnual ? "Yearly" : "Monthly"}
                            </span>
                          </div>
                          {isAnnual && plan.name !== "Free" && (
                            <p className="text-xs text-muted-foreground mt-2">
                              (
                              {
                                plan.annualMonthlyFee.amountFormatted
                              }
                              /month billed annually)
                            </p>
                          )}
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {plan.description}
                        </p>
                      </div>

                      <hr />
                      <div className="space-y-4 mb-8 overflow-y-auto">
                        {plan.features.map((feature) => (
                          <div
                            key={`MOBILE-FEATURE-${feature.slug}`}
                            className="flex items-center gap-3"
                          >
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{feature.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {plan.name !== "Free" && (
                      <div>
                        <SignedIn>
                          <CheckoutButton
                            planId={plan.id}
                            planPeriod={isAnnual ? "annual" : "month"}
                          >
                            <Button
                              ref={(el) => {
                                const buttonKey = `mobile-${plan.name}-${
                                  isAnnual ? "annual" : "month"
                                }`;
                                checkoutButtonRefs.current[buttonKey] = el;
                              }}
                              data-plan={plan.name}
                              data-period={isAnnual ? "annual" : "month"}
                              className={`w-full ${
                                plan.name === "Pro"
                                  ? "bg-primary hover:bg-primary/90"
                                  : ""
                              }`}
                              variant={
                                plan.name === "Pro" ? "default" : "outline"
                              }
                              size="lg"
                            >
                              Subscribe to {plan.name}
                            </Button>
                          </CheckoutButton>
                        </SignedIn>
                        <Unauthenticated>
                          <Button
                            className={`w-full ${
                              plan.name === "Pro"
                                ? "bg-primary hover:bg-primary/90"
                                : ""
                            }`}
                            variant={
                              plan.name === "Pro" ? "default" : "outline"
                            }
                            size="lg"
                            onClick={() => {
                              const returnUrl = `${ROUTES.HOME}${ROUTES.LANDING.PRICING}`;
                              const signupUrl = `${ROUTES.SIGNUP}?returnUrl=${encodeURIComponent(
                                returnUrl
                              )}&plan=${encodeURIComponent(
                                plan.name
                              )}&period=${isAnnual ? "annual" : "month"}`;
                              router.push(signupUrl);
                            }}
                          >
                            Subscribe to {plan.name}
                          </Button>
                        </Unauthenticated>
                      </div>
                    )}
                  </div>
                ) : null
              )}
            </div>

            {/* dots */}
            <div className="flex justify-center mt-8 gap-2">
              {data.map((plan, index) => (
                <button
                  key={`dot-${plan.name}`}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentIndex === index ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* DESKTOP GRID */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-8">
            {data.map((plan) => (
              <div
                key={`DESKTOP-${plan.name}`}
                className={`relative flex flex-col justify-between p-8 rounded-xl border bg-card hover:shadow-lg transition-all ${
                  plan.name === "Pro"
                    ? "border-primary shadow-lg scale-105"
                    : ""
                }`}
              >
                <div className="space-y-3">
                  {plan.name === "Pro" && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-2xl font-semibold mb-2">
                      {plan.name}
                    </h3>
                    <div className="mb-2">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-4xl font-bold">
                          {isAnnual
                            ? plan.annualFee.amountFormatted
                            : plan.fee.amountFormatted}
                        </span>
                        <span className="text-muted-foreground">
                          {isAnnual ? "Yearly" : "Monthly"}
                        </span>
                      </div>
                      {isAnnual && plan.name !== "Free" && (
                        <p className="text-xs text-muted-foreground mt-2">
                          ({plan.annualMonthlyFee.amountFormatted}/month billed
                          annually)
                        </p>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {plan.description}
                    </p>
                  </div>
                  <hr />
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <div
                        key={`DESKTOP-FEATURE-${feature.slug}`}
                        className="flex items-center gap-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {plan.name !== "Free" && (
                  <div>
                    <SignedIn>
                      <CheckoutButton
                        planId={plan.id}
                        planPeriod={isAnnual ? "annual" : "month"}
                      >
                        <Button
                          ref={(el) => {
                            const buttonKey = `desktop-${plan.name}-${
                              isAnnual ? "annual" : "month"
                            }`;
                            checkoutButtonRefs.current[buttonKey] = el;
                          }}
                          data-plan={plan.name}
                          data-period={isAnnual ? "annual" : "month"}
                          className={`w-full ${
                            plan.name === "Pro"
                              ? "bg-primary hover:bg-primary/90"
                              : ""
                          }`}
                          variant={plan.name === "Pro" ? "default" : "outline"}
                          size="lg"
                        >
                          Subscribe to {plan.name}
                        </Button>
                      </CheckoutButton>
                    </SignedIn>
                    <Unauthenticated>
                      <Button
                        className={`w-full ${
                          plan.name === "Pro"
                            ? "bg-primary hover:bg-primary/90"
                            : ""
                        }`}
                        variant={plan.name === "Pro" ? "default" : "outline"}
                        size="lg"
                        onClick={() => {
                          const returnUrl = `${ROUTES.HOME}${ROUTES.LANDING.PRICING}`;
                          const signupUrl = `${ROUTES.SIGNUP}?returnUrl=${encodeURIComponent(
                            returnUrl
                          )}&plan=${encodeURIComponent(
                            plan.name
                          )}&period=${isAnnual ? "annual" : "month"}`;
                          router.push(signupUrl);
                        }}
                      >
                        Subscribe to {plan.name}
                      </Button>
                    </Unauthenticated>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
