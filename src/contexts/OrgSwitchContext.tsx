"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface OrgSwitchContextType {
    isOrgSwitching: boolean;
    setIsOrgSwitching: (switching: boolean) => void;
}

const OrgSwitchContext = createContext<OrgSwitchContextType | undefined>(undefined);

export function OrgSwitchProvider({ children }: { children: ReactNode }) {
    const [isOrgSwitching, setIsOrgSwitching] = useState(false);

    return (
        <OrgSwitchContext.Provider value={{ isOrgSwitching, setIsOrgSwitching }}>
            {children}
        </OrgSwitchContext.Provider>
    );
}

export function useOrgSwitch() {
    const context = useContext(OrgSwitchContext);
    if (context === undefined) {
        throw new Error('useOrgSwitch must be used within an OrgSwitchProvider');
    }
    return context;
}