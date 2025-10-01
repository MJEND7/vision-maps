/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as channels_functions from "../channels/functions.js";
import type * as channels_table from "../channels/table.js";
import type * as chats_functions from "../chats/functions.js";
import type * as chats_table from "../chats/table.js";
import type * as comments_functions from "../comments/functions.js";
import type * as comments_table from "../comments/table.js";
import type * as edges_functions from "../edges/functions.js";
import type * as edges_table from "../edges/table.js";
import type * as frames_framed_node_table from "../frames/framed_node_table.js";
import type * as frames_functions from "../frames/functions.js";
import type * as frames_table from "../frames/table.js";
import type * as http from "../http.js";
import type * as messages_functions from "../messages/functions.js";
import type * as messages_table from "../messages/table.js";
import type * as migrations_migrateTranscriptionNodes from "../migrations/migrateTranscriptionNodes.js";
import type * as nodes_functions from "../nodes/functions.js";
import type * as nodes_table from "../nodes/table.js";
import type * as notifications_functions from "../notifications/functions.js";
import type * as notifications_table from "../notifications/table.js";
import type * as ogMetadata_functions from "../ogMetadata/functions.js";
import type * as ogMetadata_table from "../ogMetadata/table.js";
import type * as permissions from "../permissions.js";
import type * as presence from "../presence.js";
import type * as reactflow_types from "../reactflow/types.js";
import type * as users_functions from "../users/functions.js";
import type * as users_paste_bin_functions from "../users/paste_bin_functions.js";
import type * as users_paste_bin_table from "../users/paste_bin_table.js";
import type * as users_table from "../users/table.js";
import type * as users_trials_functions from "../users/trials_functions.js";
import type * as users_trials_table from "../users/trials_table.js";
import type * as utils_auth from "../utils/auth.js";
import type * as utils_channel from "../utils/channel.js";
import type * as utils_context from "../utils/context.js";
import type * as utils_frame from "../utils/frame.js";
import type * as utils_youtube from "../utils/youtube.js";
import type * as visions_functions from "../visions/functions.js";
import type * as visions_table from "../visions/table.js";

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
  auth: typeof auth;
  "channels/functions": typeof channels_functions;
  "channels/table": typeof channels_table;
  "chats/functions": typeof chats_functions;
  "chats/table": typeof chats_table;
  "comments/functions": typeof comments_functions;
  "comments/table": typeof comments_table;
  "edges/functions": typeof edges_functions;
  "edges/table": typeof edges_table;
  "frames/framed_node_table": typeof frames_framed_node_table;
  "frames/functions": typeof frames_functions;
  "frames/table": typeof frames_table;
  http: typeof http;
  "messages/functions": typeof messages_functions;
  "messages/table": typeof messages_table;
  "migrations/migrateTranscriptionNodes": typeof migrations_migrateTranscriptionNodes;
  "nodes/functions": typeof nodes_functions;
  "nodes/table": typeof nodes_table;
  "notifications/functions": typeof notifications_functions;
  "notifications/table": typeof notifications_table;
  "ogMetadata/functions": typeof ogMetadata_functions;
  "ogMetadata/table": typeof ogMetadata_table;
  permissions: typeof permissions;
  presence: typeof presence;
  "reactflow/types": typeof reactflow_types;
  "users/functions": typeof users_functions;
  "users/paste_bin_functions": typeof users_paste_bin_functions;
  "users/paste_bin_table": typeof users_paste_bin_table;
  "users/table": typeof users_table;
  "users/trials_functions": typeof users_trials_functions;
  "users/trials_table": typeof users_trials_table;
  "utils/auth": typeof utils_auth;
  "utils/channel": typeof utils_channel;
  "utils/context": typeof utils_context;
  "utils/frame": typeof utils_frame;
  "utils/youtube": typeof utils_youtube;
  "visions/functions": typeof visions_functions;
  "visions/table": typeof visions_table;
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
