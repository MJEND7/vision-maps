"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Users,
    Crown,
    CreditCard,
    Calendar,
    ExternalLink,
    Loader2,
    AlertTriangle,
    Receipt,
    TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface BillingTabProps {
    // Owner information
    ownerId: string;
    ownerType: "user" | "org" | "workspace";

    // Plan information
    plan: any;
    planType: string;
    isOnTrial: boolean;
    status: string;
    isActive: boolean;

    // For org plans
    organizationMembersCount?: number;

    // Display helpers
    getPlanBadgeColor: () => string;
    getPlanDisplayName: () => string;

    // Permissions
    canManageBilling?: boolean;
}

export function BillingTab({
    ownerId,
    ownerType,
    plan,
    planType,
    isOnTrial,
    status,
    isActive,
    organizationMembersCount,
    getPlanBadgeColor,
    getPlanDisplayName,
    canManageBilling = true,
}: BillingTabProps) {
    const [isLoadingPortal, setIsLoadingPortal] = useState(false);

    // Fetch invoice history (only for orgs, user invoices would use getUserInvoices)
    // Workspaces don't have their own invoices yet - they may inherit from parent org
    const invoices = useQuery(
        api.invoices.getOrgInvoices,
        ownerType === "org" && ownerId ? { organizationId: ownerId as any, limit: 5 } : "skip"
    );

    const handleManageSubscription = async () => {
        setIsLoadingPortal(true);
        try {
            const response = await fetch("/api/stripe/create-portal-session", {
                method: "POST",
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("Failed to create portal session");
                setIsLoadingPortal(false);
            }
        } catch {
            toast.error("Failed to open customer portal");
            setIsLoadingPortal(false);
        }
    };

    const handleUpgrade = () => {
        window.location.href = "/pricing";
    };

    // Calculate estimated monthly cost based on seats (for team plans)
    const estimatedMonthlyCost = () => {
        if (planType !== "team" || !plan || !("seats" in plan)) return null;
        const PRICE_PER_SEAT = 15; // $15/month per seat for team plan
        return (plan.seats || 1) * PRICE_PER_SEAT;
    };

    const isOrgPlan = ownerType === "org" || ownerType === "workspace";
    const showCostEstimate = isOrgPlan && planType === "team" && plan && "seats" in plan && estimatedMonthlyCost();
    const showPaymentHistory = planType !== "free" && invoices && invoices.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold">{isOrgPlan ? "Organization Plan" : "Personal Plan"}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your {isOrgPlan ? "organization's" : ""} subscription and billing settings
                </p>
            </div>

            {/* Subscription Card */}
            <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                        <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base">Subscription</h4>
                        <p className="text-xs text-muted-foreground">
                            Current plan and billing information
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                                Current Plan
                            </p>
                            <div className="flex items-center gap-1.5">
                                <p className="text-3xl font-bold tracking-tight">{getPlanDisplayName()}</p>
                                <Badge variant="outline" className={`${getPlanBadgeColor()} font-medium`}>
                                    {isOnTrial ? "Trial" : status === "active" ? "Active" : status === "trialing" ? "Trial" : "Free"}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => window.location.href = "/pricing"}
                            >
                                View Pricing
                            </Button>
                            {planType !== "free" && isActive ? (
                                <Button
                                    onClick={handleManageSubscription}
                                    disabled={isLoadingPortal || !canManageBilling}
                                    size="sm"
                                    className="gap-2"
                                >
                                    {isLoadingPortal ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <ExternalLink className="h-4 w-4" />
                                            Manage
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleUpgrade}
                                    size="sm"
                                    disabled={!canManageBilling}
                                    className="gap-2"
                                >
                                    <Crown className="h-4 w-4" />
                                    Upgrade Plan
                                </Button>
                            )}
                        </div>
                    </div>

                    {!canManageBilling && isOrgPlan && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                            <div className="flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    Only organization admins can manage billing settings.
                                </p>
                            </div>
                        </div>
                    )}

                    {plan && planType !== "free" && (
                        <>
                            <Separator />
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {plan.paymentMethod && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="rounded-md bg-background p-2">
                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Payment Method</p>
                                            <p className="text-sm font-semibold">
                                                {plan.paymentMethod.brand?.toUpperCase()} ••••{" "}
                                                {plan.paymentMethod.last4}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {plan.currentPeriodEnd && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="rounded-md bg-background p-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-0.5">
                                                {plan.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
                                            </p>
                                            <p className="text-sm font-semibold">
                                                {new Date(plan.currentPeriodEnd).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isOnTrial && plan.trialEndsAt && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="rounded-md bg-background p-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Trial Ends</p>
                                            <p className="text-sm font-semibold">
                                                {new Date(plan.trialEndsAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {planType === "team" && "seats" in plan && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                        <div className="rounded-md bg-background p-2">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Team Seats</p>
                                            <p className="text-sm font-semibold">
                                                {plan.seats} seat{plan.seats !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {planType === "free" && (
                        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
                            <div className="flex gap-3">
                                <Crown className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-sm mb-1">Unlock Premium Features</p>
                                    <p className="text-sm text-muted-foreground">
                                        Upgrade to unlock unlimited visions, AI features, and {isOrgPlan ? "team collaboration" : "more"}!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {plan?.cancelAtPeriodEnd && (
                        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
                            <div className="flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                                    Your subscription will be cancelled at the end of the current billing period.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cost Estimate Card (Org Team Plans Only) */}
            {showCostEstimate && (
                <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-green-500/10 p-2.5">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-base">Next Month Estimate</h4>
                            <p className="text-xs text-muted-foreground">
                                Based on your current {plan.seats} seat{plan.seats !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Estimated monthly cost</p>
                            <p className="text-3xl font-bold">${estimatedMonthlyCost()}.00</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                $15/seat × {plan.seats} seat{plan.seats !== 1 ? "s" : ""}
                            </p>
                        </div>
                        {organizationMembersCount !== undefined && (
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground mb-1">Current members</p>
                                <p className="text-2xl font-semibold">{organizationMembersCount}</p>
                            </div>
                        )}
                    </div>

                    {organizationMembersCount !== undefined && organizationMembersCount !== plan.seats && plan.seats && (
                        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                {organizationMembersCount > plan.seats
                                    ? `Adding ${organizationMembersCount - plan.seats} more member${organizationMembersCount - plan.seats > 1 ? 's' : ''} will increase your next bill.`
                                    : `You have ${plan.seats - organizationMembersCount} unused seat${plan.seats - organizationMembersCount > 1 ? 's' : ''}. Remove them to reduce costs next period.`
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Payment History Card */}
            {showPaymentHistory && (
                <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-purple-500/10 p-2.5">
                            <Receipt className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-base">Payment History</h4>
                            <p className="text-xs text-muted-foreground">
                                Recent invoices and payments
                            </p>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        {invoices!.map((invoice: any) => (
                            <div
                                key={invoice._id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="rounded-md bg-green-500/10 p-2">
                                        <Receipt className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {invoice.invoiceNumber || `Invoice ${new Date(invoice.createdAt).toLocaleDateString()}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(invoice.periodStart * 1000).toLocaleDateString()} - {new Date(invoice.periodEnd * 1000).toLocaleDateString()}
                                            {invoice.quantity && ` • ${invoice.quantity} seat${invoice.quantity > 1 ? 's' : ''}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">
                                        ${(invoice.amountPaid / 100).toFixed(2)}
                                    </p>
                                    {invoice.hostedInvoiceUrl && (
                                        <a
                                            href={invoice.hostedInvoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline"
                                        >
                                            View PDF
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {invoices!.length >= 5 && (
                        <div className="text-center">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleManageSubscription}
                                disabled={!canManageBilling}
                            >
                                View All Invoices
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Plan Features Card */}
            <div className="space-y-6 p-6 border rounded-xl bg-card shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                        <Crown className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-base">Plan Features</h4>
                        <p className="text-xs text-muted-foreground">
                            Available on your {getPlanDisplayName()} plan
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FeatureItem enabled text="Vision mapping" />
                    <FeatureItem
                        enabled={planType !== "free"}
                        text="Unlimited visions"
                    />
                    <FeatureItem
                        enabled={planType !== "free"}
                        text="AI-powered features"
                    />
                    <FeatureItem
                        enabled={planType === "team"}
                        text="Team collaboration"
                    />
                    <FeatureItem
                        enabled={planType !== "free"}
                        text="Advanced exports"
                    />
                    <FeatureItem
                        enabled={planType === "team"}
                        text="Real-time commenting"
                    />
                </div>
            </div>
        </div>
    );
}

// Helper component for feature items
function FeatureItem({
    enabled,
    text,
}: {
    enabled: boolean;
    text: string;
}) {
    const cn = (...classes: (string | false | undefined)[]) =>
        classes.filter(Boolean).join(" ");

    return (
        <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
            <div
                className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full",
                    enabled ? "bg-green-500/15 ring-1 ring-green-500/30" : "bg-muted"
                )}
            >
                {enabled ? (
                    <svg
                        className="h-3 w-3 text-green-600 dark:text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                ) : (
                    <svg
                        className="h-3 w-3 text-muted-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                )}
            </div>
            <p
                className={cn(
                    "text-sm font-medium",
                    enabled ? "text-foreground" : "text-muted-foreground"
                )}
            >
                {text}
            </p>
        </div>
    );
}
