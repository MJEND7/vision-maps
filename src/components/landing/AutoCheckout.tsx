import {
    CheckoutButton,
} from "@clerk/clerk-react/experimental";
import { CommercePlanResource, ForPayerType } from "@clerk/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuth, useOrganizationList } from "@clerk/nextjs";

export default function AutoCheckout({
    data,
    currentIndex,
    forWho,
    isAnnual,
    selectedOrg,
}: {
    data: CommercePlanResource[];
    currentIndex: number;
    forWho: ForPayerType;
    isAnnual: boolean;
    selectedOrg?: {id: string | null, name: string} | null;
}) {
    // Create a ref for the checkout button
    const router = useRouter();
    const checkoutBtnRef = useRef<HTMLButtonElement | null>(null);
    const searchParams = useSearchParams();
    const { orgId } = useAuth();
    const { setActive } = useOrganizationList();

    // Switch to the selected organization if needed for team plans
    useEffect(() => {
        if (forWho === "organization" && selectedOrg?.id && orgId !== selectedOrg.id) {
            setActive?.({ organization: selectedOrg.id });
        }
    }, [forWho, selectedOrg, orgId, setActive]);

    useEffect(() => {
        if ((!data || data.length === 0) && currentIndex != 0) return;

        const selectedPlan = searchParams.get("plan");
        const selectedPeriod = searchParams.get("period");
        
        // Auto-trigger checkout when component renders (for org selection flow)
        const shouldAutoTrigger = selectedPlan && selectedPeriod || (data && data.length > 0);
        
        if (shouldAutoTrigger) {
            // For organization plans, wait until we have the right org active
            if (forWho === "organization" && (!orgId || (selectedOrg?.id && orgId !== selectedOrg.id))) {
                return;
            }
            
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                checkoutBtnRef.current?.click();
            }, 100);
            
            // Clean URL if it has query params
            if (selectedPlan && selectedPeriod) {
                router.push(window.location.pathname);
            }
        }
    }, [data, currentIndex, forWho, orgId, selectedOrg, searchParams, router]);

    // Only render CheckoutButton when we have proper context
    if (forWho === "organization" && !orgId) {
        return null; // Don't render until org is active
    }

    return (
        <>
            <CheckoutButton
                planId={data && data.length > 0 ? data[currentIndex].id : "Free"}
                planPeriod={isAnnual ? "annual" : "month"}
                for={forWho}
            >
                <button ref={checkoutBtnRef} />
            </CheckoutButton>
        </>
    );
}
