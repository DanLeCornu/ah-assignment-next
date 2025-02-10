import { IS_DEV } from "@/lib/env"
import { getMaybeUser } from "@/server/models/user/auth"
import * as Sentry from "@sentry/nextjs"
import { createFullName } from "@/lib/helpers/text"
import { isNotFoundError } from "next/dist/client/components/not-found"
import { isRedirectError } from "next/dist/client/components/redirect"
import { headers } from "next/headers"
import { parseFormData } from "parse-nested-form-data"
import type { z } from "zod"

export class ActionError extends Error {}

type ActionSuccessResponse<T> = {
  ok: true
  formError: undefined
  fieldErrors: undefined
  data: T
}

type ActionErrorResponse = {
  ok: false
  formError?: string
  fieldErrors?: Record<string, string[] | undefined>
  data?: undefined
}

type ActionResponse<T> = ActionSuccessResponse<T> | ActionErrorResponse

export function formOk<T>(data?: T): ActionSuccessResponse<T> {
  return { ok: true, data: data || ({} as T), fieldErrors: undefined, formError: undefined }
}

export function formError(formError?: string): ActionErrorResponse {
  return { ok: false, formError, fieldErrors: undefined }
}

export type ActionHandler<TOutput> = (formData: FormData) => Promise<ActionResponse<TOutput>>

class Action<TSchema extends z.Schema | undefined> {
  private schema: TSchema

  constructor(schema: TSchema) {
    this.schema = schema
  }

  input<NewSchema extends z.Schema>(schema: NewSchema): Action<NewSchema> {
    return new Action(schema)
  }

  handler<TOutput>(
    fn: (args: {
      input: TSchema extends z.Schema ? z.infer<TSchema> : undefined
      formData: FormData
    }) => Promise<ActionResponse<TOutput>> | void | Promise<void>,
  ): ActionHandler<TOutput> {
    const wrapper = async (formData: FormData): Promise<ActionResponse<TOutput>> => {
      try {
        if (this.schema) {
          const data = parseFormData(formData, {
            transformEntry: (entry, defaultTransform) => ({
              path: defaultTransform(entry).path,
              value: entry[1] === "" ? null : defaultTransform(entry).value,
            }),
          })
          const result = await this.schema.safeParseAsync(data)
          if (!result.success) {
            return { ok: false, formError: undefined, data: undefined, fieldErrors: result.error.flatten().fieldErrors }
          }
          const res = await fn({ input: result.data, formData })
          if (res === undefined) return formOk<TOutput>()
          return res
          // biome-ignore lint: allow
        } else {
          const noSchemaRes = await fn({
            input: undefined as TSchema extends z.Schema ? z.infer<TSchema> : undefined,
            formData,
          })
          if (noSchemaRes === undefined) return formOk<TOutput>()
          return noSchemaRes
        }
      } catch (error) {
        return await this.handleError(error)
      }
    }
    return wrapper
  }

  private async handleError(error: unknown): Promise<ActionErrorResponse> {
    if (isRedirectError(error) || isNotFoundError(error)) throw error
    if (error instanceof ActionError) return formError(error.message)

    const headersList = headers()
    const referer = headersList.get("referer")

    // const user = await getMaybeUser().catch(void Sentry.captureException)
    // if (user) Sentry.setUser({ id: user.id, email: user.email, name: createFullName(user) })

    // Sentry.captureException(error, { extra: { referer } })

    if (IS_DEV) console.log(error)
    return formError("Something went wrong. We have been notified!")
  }
}

export function createAction() {
  return new Action<undefined>(undefined)
}
