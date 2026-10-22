import { AsyncLocalStorage } from "node:async_hooks";

// Each request gets its own bindings; never copy a secret into process.env.
const runtime = new AsyncLocalStorage();
export const withRuntimeEnv = (env, callback) => runtime.run({ env, cache: new Map() }, callback);
export const getRuntimeEnv = () => runtime.getStore()?.env;
export const getRuntimeCache = () => runtime.getStore()?.cache;
