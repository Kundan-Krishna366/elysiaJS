import { z } from "zod";
import { InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { redis } from "@/lib/redis";

const message = z.object({
            id: z.string(),
            sender: z.string(),
            text: z.string(),
            timestamp: z.number(),
            roomId: z.string(),
            token: z.string().optional()
})

const typing = z.object({
            sender: z.string(),
            isTyping: z.boolean()
})

const schema = {
    chat: {
        message,
        destroy: z.object({
            isDestroyed: z.literal(true),
}),
        typing
}
}

export const realtime = new Realtime({schema,redis})
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
export type Message = z.infer<typeof message>
export type Typing = z.infer<typeof typing>