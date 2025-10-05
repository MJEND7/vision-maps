"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Unauthenticated } from "convex/react";
import { Button } from "../ui/button";
import { ROUTES } from "@/lib/constants";
import { SignedIn, useAuth } from "@clerk/clerk-react";
import { useOrganization, useOrganizationList } from "@/contexts/OrganizationContext";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Users, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

// Pricing configuration
const plans = [
    {
        key: "free",
        name: "Free",
        description: "Start your ideation journey with Vision!",
        monthly: "$0.00",
        annual: "$0.00",
        annualMonthly: "$0.00",
        features: [
            "1 Vision",
            "View Mode",
            "All integrations",
            "Basic export options",
        ],
    },
    {
        key: "pro",
        name: "Pro",
        description: "Enhance your ideation experience",
        monthly: "$20.00",
        annual: "$216.00",
        annualMonthly: "$18.00",
        hasFreeTrial: true,
        trialDays: 7,
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
        features: [
            "Unlimited visions",
            "AI Assistance",
            "View Mode",
            "All integrations",
            "Advanced export options",
            "Priority support",
        ],
    },
    {
        key: "team",
        name: "Team",
        description: "Collaborate with your team",
        monthly: "$15.00",
        annual: "$156.00",
        annualMonthly: "$13.00",
        perSeat: true,
        hasFreeTrial: true,
        trialDays: 7,
        priceId: process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID,
        features: [
            "Unlimited visions",
            "AI Assistance",
            "Team Collaboration",
            "Unlimited team members",
            "All integrations",
            "Advanced export options",
            "Priority support",
        ],
    },
];

export function PricingComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { userId } = useAuth();
    const [isAnnual, setIsAnnual] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>("free");
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [showOrgSelector, setShowOrgSelector] = useState(false);
    const [selectedOrgForTeam, setSelectedOrgForTeam] = useState<{ id: string | null, name: string } | null>(null);
    const [isProcessingOrgSelection, setIsProcessingOrgSelection] = useState(false);
    const [proAlreadyOwned, setProAlreadyOwned] = useState(false);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const { organization } = useOrganization();
    const { userMemberships, isLoaded: orgListLoaded, setActive } = useOrganizationList();
    const createOrgMutation = useMutation(api.orgs.create);

    // Fetch current user plan from API
    useEffect(() => {
        fetch('/api/user-plan')
            .then(res => res.json())
            .then(data => {
                setCurrentPlan(data.plan || "free");
                // Set proAlreadyOwned if user has pro plan and is in an organization
                if (data.plan === 'pro' && organization) {
                    setProAlreadyOwned(true);
                }
                setIsLoadingPlan(false);
            })
            .catch(error => {
                console.error('Error fetching user plan:', error);
                setCurrentPlan("free");
                setIsLoadingPlan(false);
            });
    }, [organization]);

    // Update proAlreadyOwned state when organization changes
    useEffect(() => {
        if (!organization) {
            setProAlreadyOwned(false);
        } else if (currentPlan === 'pro') {
            setProAlreadyOwned(true);
        }
    }, [organization, currentPlan]);

    // Handle Stripe checkout
    const handleCheckout = async (planKey: string) => {
        if (!userId) return;

        setIsCheckingOut(true);

        try {
            let endpoint = '/api/stripe/checkout';
            let body: any = {
                priceId: plans.find(p => p.key === planKey)?.priceId,
                planType: planKey,
            };

            // For team plans, use the org checkout endpoint
            if (planKey === 'team' && selectedOrgForTeam?.id) {
                endpoint = '/api/stripe/checkout-org';
                // Get member count for seat calculation
                const orgData = userMemberships.data?.find(m => m.organization.id === selectedOrgForTeam.id);
                body.seats = orgData?.organization.membersCount || 1;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.url) {
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else {
                toast.error('Failed to create checkout session');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to start checkout');
        } finally {
            setIsCheckingOut(false);
        }
    };

    // Helper function to get button text based on current plan
    const getButtonText = (planKey: string) => {
        const plan = plans.find(p => p.key === planKey);
        const isCurrentPlan = currentPlan === planKey;
        const isUpgrade = currentPlan === "free" && planKey !== "free";

        if (isCurrentPlan) {
            return "Current Plan";
        }

        // Special case for Team plan - show current org name
        if (planKey === "team" && organization) {
            if (plan?.hasFreeTrial) {
                return `Start Trial for ${organization.name}`;
            }
            return `Upgrade ${organization.name} to Team`;
        }

        if (plan?.hasFreeTrial) {
            return `Start ${plan.trialDays}-Day Free Trial`;
        }

        if (isUpgrade) {
            return `Upgrade to ${plan?.name}`;
        }
        return `Switch to ${plan?.name}`;
    };

    // Handle team plan purchase - show org selector
    const handleTeamPlanClick = () => {
        setShowOrgSelector(true);
    };

    // Handle org selection and proceed to checkout
    const handleOrgSelection = async (orgId: string | null, orgName: string) => {
        setIsProcessingOrgSelection(true);
        setSelectedOrgForTeam({ id: orgId, name: orgName });
        setShowOrgSelector(false);

        // Switch to the selected organization
        if (orgId) {
            await setActive?.({ organization: orgId as any });
            // Wait a moment for org switch to complete
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Proceed to checkout
        await handleCheckout('team');
        setIsProcessingOrgSelection(false);
    };

    // Handle Pro plan click when in organization
    const handleProPlanClick = async () => {
        if (!organization || proAlreadyOwned) return;

        setIsProcessingOrgSelection(true);

        try {
            // Switch to personal account
            await setActive?.({ organization: null });

            // Wait a moment for org switch to complete
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Check if user already has Pro plan on personal account
            const response = await fetch('/api/user-plan');
            const data = await response.json();

            if (data.plan === 'pro') {
                toast.error("You already own the Pro plan on your personal account");
                setProAlreadyOwned(true);
                return;
            }

            // Proceed to checkout for Pro plan
            await handleCheckout('pro');

        } catch (error) {
            console.error('Error switching to personal account:', error);
            toast.error('Failed to switch to personal account');
        } finally {
            setIsProcessingOrgSelection(false);
        }
    };

    // Handle create new organization
    const handleCreateNewOrg = () => {
        setShowOrgSelector(false);
        setShowCreateOrg(true);
    };

    // Handle organization creation
    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) return;

        setIsCreatingOrg(true);

        try {
            const orgId = await createOrgMutation({ name: newOrgName.trim() });
            if (orgId) {
                toast.success("Organization created successfully!");

                // Refresh the memberships list to include the new org
                userMemberships.revalidate?.();

                setShowCreateOrg(false);
                setNewOrgName("");

                // Go directly to checkout with the newly created org
                setTimeout(() => {
                    handleOrgSelection(orgId, newOrgName.trim());
                }, 500);
            }
        } catch (error) {
            console.error("Failed to create organization:", error);
            toast.error("Failed to create organization");
        } finally {
            setIsCreatingOrg(false);
        }
    };

    if (isLoadingPlan) {
        return (
            <section id="pricing" className="py-20 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="animate-pulse">
                        <div className="h-8 bg-muted rounded mb-4 max-w-md mx-auto"></div>
                        <div className="h-4 bg-muted rounded mb-8 max-w-lg mx-auto"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <>
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
                                className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                Monthly
                            </span>
                            <button
                                onClick={() => setIsAnnual(!isAnnual)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? "bg-primary" : "bg-muted"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </button>
                            <span
                                className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                Annual
                            </span>
                        </div>
                    </div>

                    {/* DESKTOP GRID */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col justify-between p-8 rounded-xl border bg-card hover:shadow-lg transition-all ${plan.name === "Pro" ? "border-primary shadow-lg scale-105" : ""
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
                                            {plan.hasFreeTrial && (
                                                <div className="text-center mb-2">
                                                    <span className="text-green-600 font-semibold text-sm">
                                                        {plan.trialDays} days free, then
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-4xl font-bold">
                                                    {isAnnual ? plan.annual : plan.monthly}
                                                </span>
                                                <span className="text-muted-foreground text-sm">
                                                    {plan.perSeat && "/seat"} {isAnnual ? "/year" : "/month"}
                                                </span>
                                            </div>
                                            {isAnnual && plan.name !== "Free" && (
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    ({plan.annualMonthly}{plan.perSeat && "/seat"}/month billed annually)
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
                                                key={feature}
                                                className="flex items-center gap-3"
                                            >
                                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {plan.name !== "Free" && (
                                    <div>
                                        <SignedIn>
                                            {plan.key === "team" ? (
                                                <Button
                                                    onClick={handleTeamPlanClick}
                                                    className="w-full h-auto p-3"
                                                    variant="outline"
                                                    size="lg"
                                                    disabled={currentPlan === plan.key || isProcessingOrgSelection || isCheckingOut}
                                                >
                                                    {isProcessingOrgSelection || isCheckingOut ? (
                                                        "Processing..."
                                                    ) : organization ? (
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="w-5 h-5">
                                                                    <AvatarImage src={organization.imageUrl} />
                                                                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                                                                        {organization.name[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm">
                                                                    {getButtonText(plan.key)}
                                                                </span>
                                                            </div>
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between w-full">
                                                            <span>{getButtonText(plan.key)}</span>
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </Button>
                                            ) : plan.key === "pro" && organization ? (
                                                <Button
                                                    onClick={handleProPlanClick}
                                                    className={`w-full ${proAlreadyOwned ? "opacity-50 cursor-not-allowed" : "bg-primary hover:bg-primary/90"}`}
                                                    variant={proAlreadyOwned ? "outline" : "default"}
                                                    size="lg"
                                                    disabled={currentPlan === plan.key || isProcessingOrgSelection || proAlreadyOwned || isCheckingOut}
                                                >
                                                    {isProcessingOrgSelection || isCheckingOut ? "Processing..." : proAlreadyOwned ? "Already owned on personal account" : getButtonText(plan.key)}
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => handleCheckout(plan.key)}
                                                    className={`w-full ${plan.name === "Pro"
                                                        ? "bg-primary hover:bg-primary/90"
                                                        : ""
                                                        }`}
                                                    variant={
                                                        plan.name === "Pro" ? "default" : "outline"
                                                    }
                                                    size="lg"
                                                    disabled={currentPlan === plan.key || isCheckingOut}
                                                >
                                                    {isCheckingOut ? "Processing..." : getButtonText(plan.key)}
                                                </Button>
                                            )}
                                        </SignedIn>
                                        <Unauthenticated>
                                            <Button
                                                className={`w-full ${plan.name === "Pro"
                                                    ? "bg-primary hover:bg-primary/90"
                                                    : ""
                                                    }`}
                                                variant={plan.name === "Pro" ? "default" : "outline"}
                                                size="lg"
                                                onClick={() => {
                                                    const returnUrl = ROUTES.PRICING;
                                                    const signupUrl = `${ROUTES.SIGNUP}?returnUrl=${encodeURIComponent(
                                                        returnUrl
                                                    )}&plan=${encodeURIComponent(
                                                        plan.key
                                                    )}&period=${isAnnual ? "annual" : "month"}`;
                                                    router.push(signupUrl);
                                                }}
                                            >
                                                {getButtonText(plan.key)}
                                            </Button>
                                        </Unauthenticated>
                                    </div>
                                )}

                                {plan.name === "Free" && (
                                    <div>
                                        <Button
                                            className="w-full"
                                            variant={currentPlan === "free" ? "default" : "outline"}
                                            size="lg"
                                            disabled={currentPlan === "free"}
                                        >
                                            {getButtonText(plan.key)}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team Plan Organization Selector Dialog */}
            <Dialog open={showOrgSelector} onOpenChange={setShowOrgSelector}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Select Organization for Team Plan</DialogTitle>
                        <DialogDescription>
                            Choose which organization you want to purchase the Team plan for, or create a new one.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Organizations */}
                        {orgListLoaded && userMemberships.data?.map((membership) => (
                            <Button
                                key={membership.organization.id}
                                variant="outline"
                                className="w-full p-4 h-auto justify-start"
                                onClick={() => handleOrgSelection(membership.organization.id, membership.organization.name)}
                                disabled={isProcessingOrgSelection}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={membership.organization.imageUrl} />
                                        <AvatarFallback className="bg-blue-500 text-white">
                                            {membership.organization.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium">
                                            {membership.organization.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {membership.organization.membersCount} members
                                        </span>
                                    </div>
                                </div>
                            </Button>
                        ))}

                        {/* Create New Organization */}
                        <Button
                            variant="outline"
                            className="w-full p-4 h-auto justify-start border-dashed"
                            disabled={isProcessingOrgSelection}
                            onClick={handleCreateNewOrg}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium">Create New Organization</span>
                                    <span className="text-xs text-muted-foreground">
                                        Set up a new team workspace
                                    </span>
                                </div>
                            </div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Organization Dialog */}
            <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new organization to continue with the Team plan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="org-name">Organization Name</Label>
                            <Input
                                id="org-name"
                                placeholder="Enter organization name"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateOrganization();
                                }}
                                disabled={isCreatingOrg}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCreateOrg(false);
                                    setShowOrgSelector(true);
                                }}
                                disabled={isCreatingOrg}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCreateOrganization}
                                disabled={!newOrgName.trim() || isCreatingOrg}
                            >
                                {isCreatingOrg ? "Creating..." : "Create Organization"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
