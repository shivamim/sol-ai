import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
    env: {
      ENCRYPTION_MASTER_KEY: Buffer.alloc(32, 7).toString("base64"),
      ENCRYPTION_KEY_VERSION: "1",
    },
  },
});
