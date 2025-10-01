import { defineSchema } from "convex/server";
import { Visions } from "./visions/table";
import { Channel } from "./channels/table";
import { Frame } from "./frames/table";
import { Nodes } from "./nodes/table";
import { User } from "./users/table";
import { Comments } from "./comments/table";
import { Notifications } from "./notifications/table";
import { Chats } from "./chats/table";
import { Messages } from "./messages/table";
import { OGMetadata } from "./ogMetadata/table";
import { Edges } from "./edges/table";
import { FramedNode } from "./frames/framed_node_table";
import { UserTrials } from "./users/trials_table";
import { UserPasteBin } from "./users/paste_bin_table";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
    visions: Visions.Table,
    vision_users: Visions.TableConnectedUsers,
    channels: Channel.Table,
    frames: Frame.Table,
    frame_positions: Frame.PositionsTable,
    framed_node: FramedNode.Table,
    nodes: Nodes.Table,
    edges: Edges.Table,
    users: User.Table,
    comments: Comments.Table,
    notifications: Notifications.Table,
    chats: Chats.Table,
    messages: Messages.Table,
    og_metadata: OGMetadata.Table,
    userTrials: UserTrials.Table,
    user_paste_bin: UserPasteBin.Table,
});
