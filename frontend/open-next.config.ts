import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// R2 incremental cache is intentionally omitted until the traffic warrants it.
export default defineCloudflareConfig();
