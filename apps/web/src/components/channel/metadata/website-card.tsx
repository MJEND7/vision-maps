import { Globe } from "lucide-react";
import { BaseCard } from "./base-card";
import type { WebsiteMetadata } from "@/types/metadata";
import Image from "next/image";

interface WebsiteCardProps {
    metadata: WebsiteMetadata;
}

export function WebsiteCard({ metadata }: WebsiteCardProps) {
    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    const websiteIcon = metadata.favicon ? (
        <Image
            src={metadata.favicon}
            alt=""
            width={24}
            height={24}
            className="w-6 h-6 rounded object-cover"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const globe = target.parentElement?.querySelector('.fallback-globe');
                if (globe) globe.classList.remove('hidden');
            }}
        />
    ) : (
        <Globe className="w-6 h-6 text-gray-400" />
    );

    const fallbackIcon = (
        <div className="relative">
            {websiteIcon}
            <Globe className="w-6 h-6 text-gray-400 fallback-globe hidden" />
        </div>
    );

    const domain = getDomain(metadata.url || "");

    return (
        <BaseCard
            title={metadata.title || domain || "Website"}
            description={metadata.description}
            image={metadata.image}
            url={metadata.url || ""}
            author={metadata.siteName || domain}
            platform="website"
            platformIcon={fallbackIcon}
            imageAspect="landscape"
        />
    );
}