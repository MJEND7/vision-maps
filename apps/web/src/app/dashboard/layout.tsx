import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/constants';
import DashboardLayoutClient from './layout-client';

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const { userId } = await auth();

    if (!userId) {
        redirect(ROUTES.SIGNIN);
    }

    return (
        <DashboardLayoutClient>
            {children}
        </DashboardLayoutClient>
    );
}
