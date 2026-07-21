/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as advisories from "../advisories.js";
import type * as advisoriesHelpers from "../advisoriesHelpers.js";
import type * as alerts from "../alerts.js";
import type * as clearDemoData from "../clearDemoData.js";
import type * as dashboardQueries from "../dashboardQueries.js";
import type * as demo from "../demo.js";
import type * as evidence from "../evidence.js";
import type * as graph from "../graph.js";
import type * as seed from "../seed.js";
import type * as seedAdvisories from "../seedAdvisories.js";
import type * as vision from "../vision.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  advisories: typeof advisories;
  advisoriesHelpers: typeof advisoriesHelpers;
  alerts: typeof alerts;
  clearDemoData: typeof clearDemoData;
  dashboardQueries: typeof dashboardQueries;
  demo: typeof demo;
  evidence: typeof evidence;
  graph: typeof graph;
  seed: typeof seed;
  seedAdvisories: typeof seedAdvisories;
  vision: typeof vision;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
