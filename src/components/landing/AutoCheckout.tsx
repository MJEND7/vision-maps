import {
    CheckoutButton,
} from "@clerk/clerk-react/experimental";
import { CommercePlanResource, ForPayerType } from "@clerk/types";
import { useEffect, useRef } from "react";

export default function AutoCheckout({
    data,
    currentIndex,
    forWho,
    isAnnual,
}: {
    data: CommercePlanResource[];
    currentIndex: number;
    forWho: ForPayerType;
    isAnnual: boolean;
}) {
    // Create a ref for the checkout button
    const checkoutBtnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if ((!data || data.length === 0) && currentIndex != 0) return;

        const hash = window.location.hash; // e.g. "#pricing?plan=Pro&period=annual"
        const queryString = hash.split("?")[1];

        if (queryString) {
            const params = new URLSearchParams(queryString);

            if (params.get("plan") && params.get("period")) {
                // Trigger automatic button click
                checkoutBtnRef.current?.click();
            }
        }
    }, [data, currentIndex]);

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
