import { CheckoutButton, usePlans } from "@clerk/nextjs/experimental";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react"
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Unauthenticated } from "convex/react";
import { Button } from "../ui/button";
import { ROUTES } from "@/lib/constants";
import { SignedIn } from "@clerk/nextjs";

export function PricingComponent() {
    const router = useRouter()
    const [isAnnual, setIsAnnual] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(1);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const { data, isLoading } = usePlans({
        for: 'user',
        pageSize: 3,
    })

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

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

        const proIndex = data.findIndex(plan => plan.name === "Pro");
        if (proIndex !== -1) {
            setCurrentIndex(proIndex);
        }
    }, [data]);

    if (isLoading) {
        return (
            <motion.section
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                id="pricing"
                className="py-20 px-6"
            >
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                            Choose the plan that fits your creative needs
                        </p>
                    </motion.div>

                    <div className="md:grid md:grid-cols-3 md:gap-8">
                        <div className="relative md:hidden h-96 mb-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className={`absolute inset-0 border rounded-xl p-8 animate-pulse max-w-xs mx-auto
                                    ${i === 2 ? 'z-30 scale-100 opacity-100' : i === 1 ? 'z-20 scale-95 opacity-60 translate-y-4' : 'z-10 scale-90 opacity-30 translate-y-8'}`}>
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
                        {[1, 2, 3].map((i) => (
                            <div key={i + 'desktop'} className="border rounded-xl p-8 animate-pulse hidden md:block">
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
                </div>
            </motion.section>
        );
    }

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            id="pricing"
            className="pt-20 px-6"
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Choose the plan that fits your creative needs
                    </p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="flex items-center justify-center gap-4 mb-8"
                    >
                        <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? 'bg-primary' : 'bg-muted'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Annual
                        </span>
                    </motion.div>
                </motion.div>

                <div className="md:grid md:grid-cols-3 md:gap-8">
                    <div className="relative md:hidden h-[500px] mb-8">
                        <button
                            onClick={prevCard}
                            className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-background border rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextCard}
                            className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-background border rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div
                            className="relative h-full"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            {data.map((plan, index) => (
                                <motion.div
                                    key={plan.name + index}
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    className={`absolute inset-0 justify-between flex flex-col p-8 rounded-xl  ${plan.name == "Pro" ? "border" : ""}  bg-card transition-all duration-300 cursor-pointer max-w-xs mx-auto
                                ${currentIndex === index
                                            ? 'z-30 scale-100 opacity-100 shadow-2xl border-primary'
                                            : currentIndex === index - 1 || (currentIndex === 0 && index === data.length - 1)
                                                ? 'z-20 scale-95 opacity-60 blur-sm translate-y-4'
                                                : currentIndex === index + 1 || (currentIndex === data.length - 1 && index === 0)
                                                    ? 'z-20 scale-95 opacity-60 blur-sm translate-y-4'
                                                    : 'z-10 scale-90 opacity-30 blur-md translate-y-8'
                                        }
                                ${plan.name == "Pro" && currentIndex === index ? 'border-primary shadow-lg' : ''}`}
                                    onClick={() => setCurrentIndex(index)}
                                >
                                    <div className="space-y-3">
                                        {plan.name == "Pro" && currentIndex === index && (
                                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                                    Most Popular
                                                </span>
                                            </div>
                                        )}

                                        <div className="text-center">
                                            <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                                            <div className="mb-2">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-4xl font-bold">{isAnnual ? plan.annualFee.amountFormatted : plan.fee.amountFormatted}</span>
                                                    <span className="text-muted-foreground">{isAnnual ? "Yearly" : "Monthly"}</span>
                                                </div>
                                                {isAnnual && plan.name !== "Free" && (
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {`(${plan.annualMonthlyFee.amountFormatted}/month billed annually)`}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground text-xs">{plan.description}</p>
                                        </div>
                                        <hr />
                                        <div className="space-y-4 mb-8  overflow-y-auto">
                                            {plan.features.map((feature) => (
                                                <div key={feature.slug} className="flex items-center gap-3">
                                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span className="text-sm">{feature.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {plan.name != "Free" && (
                                        <>

                                            <SignedIn>
                                                <CheckoutButton planId={plan.id} planPeriod={isAnnual ? "annual" : "month"} >
                                                    <Button
                                                        className={`w-full ${plan.name == "Pro" ? 'bg-primary hover:bg-primary/90' : ''}`}
                                                        variant={plan.name == "Pro" ? 'default' : 'outline'}
                                                        size="lg"
                                                    >
                                                        Subscribe to {plan.name}
                                                    </Button>
                                                </CheckoutButton>
                                            </SignedIn>
                                            <Unauthenticated>
                                                <Button
                                                    className={`w-full ${plan.name == "Pro" ? 'bg-primary hover:bg-primary/90' : ''}`}
                                                    variant={plan.name == "Pro" ? 'default' : 'outline'}
                                                    size="lg"
                                                    onClick={() => {
                                                        if (plan.id && plan.name !== 'Free') {
                                                            router.push(ROUTES.SIGNUP)
                                                        }
                                                    }}
                                                >
                                                    Subscribe to {plan.name}
                                                </Button>
                                            </Unauthenticated>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {data.map((plan, index) => (
                        <motion.div
                            key={plan.name + index + 'desktop'}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className={`relative justify-between flex-col p-8 rounded-xl border bg-card hover:shadow-lg transition-all hidden md:flex
                            ${plan.name == "Pro" ? 'border-primary shadow-lg scale-105' : ''}`}
                        >
                            <div className="space-y-3">
                                {plan.name == "Pro" && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="text-center">
                                    <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                                    <div className="mb-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-4xl font-bold">{isAnnual ? plan.annualFee.amountFormatted : plan.fee.amountFormatted}</span>
                                            <span className="text-muted-foreground">{isAnnual ? "Yearly" : "Monthly"}</span>
                                        </div>
                                        {isAnnual && plan.name !== "Free" && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {`(${plan.annualMonthlyFee.amountFormatted}/month billed annually)`}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-xs">{plan.description}</p>
                                </div>
                                <hr />
                                <div className="space-y-4 mb-8">
                                    {plan.features.map((feature) => (
                                        <div key={feature.slug} className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            <span>{feature.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>


                            {plan.name != "Free" && (
                                <>
                                    <SignedIn>
                                        <CheckoutButton planId={plan.id} planPeriod={isAnnual ? "annual" : "month"} >
                                            <Button
                                                className={`w-full ${plan.name == "Pro" ? 'bg-primary hover:bg-primary/90' : ''}`}
                                                variant={plan.name == "Pro" ? 'default' : 'outline'}
                                                size="lg"
                                            >
                                                Subscribe to {plan.name}
                                            </Button>
                                        </CheckoutButton>
                                    </SignedIn>
                                    <Unauthenticated>
                                        <Button
                                            className={`w-full ${plan.name == "Pro" ? 'bg-primary hover:bg-primary/90' : ''}`}
                                            variant={plan.name == "Pro" ? 'default' : 'outline'}
                                            size="lg"
                                            onClick={() => {
                                                if (plan.id && plan.name !== 'Free') {
                                                    router.push(ROUTES.SIGNUP)
                                                }
                                            }}
                                        >
                                            Subscribe to {plan.name}
                                        </Button>
                                    </Unauthenticated>
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center mt-8 gap-2 md:hidden">
                    {data.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${currentIndex === index ? 'bg-primary' : 'bg-muted'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </motion.section >
    );
}

