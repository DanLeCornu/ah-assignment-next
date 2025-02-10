import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  /*
   * Serverside Environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    // SECRETS
    APP_AUTH_SECRET: z.string(),
    APP_SECRET: z.string(),
    // DB
    DATABASE_URL: z.string(),
    // NODE
    NODE_ENV: z.string().optional(),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "test", "production"]).optional().default("development"),
    // PROD + STAGING
    NEXT_PUBLIC_WEB_URL: z.string().optional(),
  },
  /*
   * Due to how Next.js bundles environment variables on Edge and Client,
   * we need to manually destructure them to make sure all are included in bundle.
   *
   * 💡 You'll get type errors if not all variables from `server` & `client` are included here.
   */
  runtimeEnv: {
    APP_AUTH_SECRET: process.env.APP_AUTH_SECRET,
    APP_SECRET: process.env.APP_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
  },
})

export const IS_PRODUCTION = env.NEXT_PUBLIC_APP_ENV === "production"
export const IS_STAGING = env.NEXT_PUBLIC_APP_ENV === "staging"
export const IS_TEST = env.NEXT_PUBLIC_APP_ENV === "test"
export const IS_DEV = !IS_TEST && !IS_STAGING && !IS_PRODUCTION
