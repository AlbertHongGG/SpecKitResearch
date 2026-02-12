import { z } from 'zod'

export const postMessageSchema = z.object({
  content: z.string().min(1),
})

export const postInternalNoteSchema = z.object({
  content: z.string().min(1),
})

export type PostMessageDto = z.infer<typeof postMessageSchema>

export type PostInternalNoteDto = z.infer<typeof postInternalNoteSchema>
