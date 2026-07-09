/**
 * Cloudflare 配置主出口
 * 所有 Cloudflare 相關配置都從此導出
 */

export {
  CLOUDFLARE_ACCOUNT_ID,
  KV_NAMESPACES,
  getAllKVNamespaces,
  getKVNamespace,
  generateWranglerKVConfig,
  type KVNamespaceKey,
  type KVNamespaceConfig,
} from "./kv-namespace.js";

export { WORKERS, getWorkerConfig, type WorkerKey, type WorkerConfig } from "./workers.js";
