/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as tables_channel from "../tables/channel.js";
import type * as tables_frame from "../tables/frame.js";
import type * as tables_nodes from "../tables/nodes.js";
import type * as tables_visions from "../tables/visions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "tables/channel": typeof tables_channel;
  "tables/frame": typeof tables_frame;
  "tables/nodes": typeof tables_nodes;
  "tables/visions": typeof tables_visions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
