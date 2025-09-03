import { NodeUser } from "@/hooks/useUserCache";
import { NodeWithFrame } from "../../../convex/channels";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { timeSinceFromDateString } from "@/utils/date";

export default function ChannelNode({ node, nodeUser }: { node: NodeWithFrame, nodeUser: NodeUser | null }) {
    // Show loading state if user data isn't available yet
    if (!nodeUser) {
        return (
            <div key={node._id} className="flex items-start gap-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                    <span className="flex items-center gap-3">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                        <div className="text-right text-xs text-muted-foreground/70">
                            {timeSinceFromDateString(new Date(node._creationTime))}
                        </div>
                    </span>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-medium">{node.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {node.thought || "No description"}
                            </p>
                            {node.frameTitle && (
                                <p className="text-xs text-blue-600 mt-1">
                                    Frame: {node.frameTitle}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div key={node._id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
                <AvatarImage src={nodeUser.profileImage} alt={nodeUser.name} />
                <AvatarFallback className="text-xs">
                    {nodeUser.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
                <span className="flex items-center gap-3">
                    <span>{nodeUser.name}</span>
                    <div className="text-right text-xs text-muted-foreground/70">
                        {timeSinceFromDateString(new Date(node._creationTime))}
                    </div>
                </span>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="font-medium">{node.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {node.thought || "No description"}
                        </p>
                        {node.frameTitle && (
                            <p className="text-xs text-blue-600 mt-1">
                                Frame: {node.frameTitle}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
