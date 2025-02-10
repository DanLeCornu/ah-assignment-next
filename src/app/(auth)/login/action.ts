"use server"
import { createAction } from "@/server/utils/actions"

 // WARNING: THIS CREATES A PUBLIC ENDPOINT

export const login = createAction()
  .input({})
	.handler(async ({ input }) => {
	})