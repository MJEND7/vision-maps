import { defineSchema } from "convex/server";
import { Visions } from "./tables/visions";
import { Channel } from "./tables/channel";
import { Frame } from "./tables/frame";
import { Nodes } from "./tables/nodes";
import { User } from "./tables/user";
import { Comments } from "./tables/comments";
import { Notifications } from "./tables/notifications";
import { Chats } from "./tables/chats";
import { Messages } from "./tables/messages";
import { OGMetadata } from "./tables/ogMetadata";
import { Edges } from "./tables/edges";
import { FramedNode } from "./tables/framed_node";
import { UserPasteBin } from "./tables/userPasteBin";
import { Organizations } from "./tables/organization";
import { OrganizationMembers } from "./tables/organizationMember";
import { Plans } from "./tables/plans";
import { Invoices } from "./tables/invoices";

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
    user_paste_bin: UserPasteBin.Table,
    organizations: Organizations.Table,
    organization_members: OrganizationMembers.Table,
    plans: Plans.Table,
    invoices: Invoices.Table,
});
