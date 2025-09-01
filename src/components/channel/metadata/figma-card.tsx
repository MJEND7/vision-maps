import { Users } from "lucide-react";
import { BaseCard } from "./base-card";
import { LinkMetadata } from "./index";

interface FigmaCardProps {
    metadata: LinkMetadata;
}

export function FigmaCard({ metadata }: FigmaCardProps) {
    const figmaIcon = (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
            <path d="M7.5 0.5h4.5v4.5h-4.5z" fill="#F24E1E"/>
            <path d="M12 0.5h4.5v4.5h-4.5z" fill="#FF7262"/>
            <path d="M12 5h4.5v4.5h-4.5z" fill="#1ABCFE"/>
            <path d="M7.5 5h4.5v4.5h-4.5z" fill="#0ACF83"/>
            <path d="M7.5 9.5h4.5v4.5h-4.5z" fill="#A259FF"/>
        </svg>
    );

    const stats = (
        <div className="flex items-center gap-2">
            <Users size={14} />
            <span>Design file</span>
            {metadata.team && (
                <span>• {metadata.team} team</span>
            )}
        </div>
    );

    const authorText = metadata.team ? `${metadata.team} team` : metadata.author;

    return (
        <BaseCard
            title={metadata.title}
            description={metadata.description}
            image={metadata.image}
            url={metadata.url}
            author={authorText}
            platform="figma"
            platformIcon={figmaIcon}
            imageAspect="landscape"
            stats={stats}
        />
    );
}