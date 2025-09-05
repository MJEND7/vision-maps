/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as channels from "../channels.js";
import type * as chats from "../chats.js";
import type * as frames from "../frames.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as nodes from "../nodes.js";
import type * as notifications from "../notifications.js";
import type * as ogMetadata from "../ogMetadata.js";
import type * as presence from "../presence.js";
import type * as tables_channel from "../tables/channel.js";
import type * as tables_chats from "../tables/chats.js";
import type * as tables_comments from "../tables/comments.js";
import type * as tables_frame from "../tables/frame.js";
import type * as tables_messages from "../tables/messages.js";
import type * as tables_nodes from "../tables/nodes.js";
import type * as tables_notifications from "../tables/notifications.js";
import type * as tables_ogMetadata from "../tables/ogMetadata.js";
import type * as tables_user from "../tables/user.js";
import type * as tables_visions from "../tables/visions.js";
import type * as user from "../user.js";
import type * as utils_auth from "../utils/auth.js";
import type * as utils_channel from "../utils/channel.js";
import type * as utils_frame from "../utils/frame.js";
import type * as visions from "../visions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  channels: typeof channels;
  chats: typeof chats;
  frames: typeof frames;
  http: typeof http;
  messages: typeof messages;
  nodes: typeof nodes;
  notifications: typeof notifications;
  ogMetadata: typeof ogMetadata;
  presence: typeof presence;
  "tables/channel": typeof tables_channel;
  "tables/chats": typeof tables_chats;
  "tables/comments": typeof tables_comments;
  "tables/frame": typeof tables_frame;
  "tables/messages": typeof tables_messages;
  "tables/nodes": typeof tables_nodes;
  "tables/notifications": typeof tables_notifications;
  "tables/ogMetadata": typeof tables_ogMetadata;
  "tables/user": typeof tables_user;
  "tables/visions": typeof tables_visions;
  user: typeof user;
  "utils/auth": typeof utils_auth;
  "utils/channel": typeof utils_channel;
  "utils/frame": typeof utils_frame;
  visions: typeof visions;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  presence: {
    public: {
      disconnect: FunctionReference<
        "mutation",
        "internal",
        { sessionToken: string },
        null
      >;
      heartbeat: FunctionReference<
        "mutation",
        "internal",
        {
          interval?: number;
          roomId: string;
          sessionId: string;
          userId: string;
        },
        { roomToken: string; sessionToken: string }
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; roomToken: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listRoom: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; roomId: string },
        Array<{ lastDisconnected: number; online: boolean; userId: string }>
      >;
      listUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; onlineOnly?: boolean; userId: string },
        Array<{ lastDisconnected: number; online: boolean; roomId: string }>
      >;
      removeRoom: FunctionReference<
        "mutation",
        "internal",
        { roomId: string },
        null
      >;
      removeRoomUser: FunctionReference<
        "mutation",
        "internal",
        { roomId: string; userId: string },
        null
      >;
    };
  };
  persistentTextStreaming: {
    lib: {
      addChunk: FunctionReference<
        "mutation",
        "internal",
        { final: boolean; streamId: string; text: string },
        any
      >;
      createStream: FunctionReference<"mutation", "internal", {}, any>;
      getStreamStatus: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        "pending" | "streaming" | "done" | "error" | "timeout"
      >;
      getStreamText: FunctionReference<
        "query",
        "internal",
        { streamId: string },
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          text: string;
        }
      >;
      setStreamStatus: FunctionReference<
        "mutation",
        "internal",
        {
          status: "pending" | "streaming" | "done" | "error" | "timeout";
          streamId: string;
        },
        any
      >;
    };
  };
};
