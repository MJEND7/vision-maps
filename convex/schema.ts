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

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
    visions: Visions.Table,
    vision_users: Visions.TableConnectedUsers,
    channels: Channel.Table,
    frames: Frame.Table,
    nodes: Nodes.Table,
    users: User.Table,
    comments: Comments.Table,
    notifications: Notifications.Table,
    chats: Chats.Table,
    messages: Messages.Table,
});
