import { Elysia } from 'elysia'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { authMiddleware } from './auth'
import { z } from 'zod'
import { Message, realtime } from '@/lib/realtime'
import { claimUsername } from '@/lib/room-identity'
import { isWithinRateLimit } from '@/lib/rate-limit'

export const dynamic = "force-dynamic"
export const revalidate = 0

const rooms = new Elysia({prefix:"/room"}).post("/", async()=>{
const roomId = nanoid()
const room = redis.pipeline()
room.hset(`meta:${roomId}`,{
      connected:[],
      createdAt: Date.now()
})
room.expire(`meta:${roomId}`, 60*30)
await room.exec()
return {roomId}
}).use(authMiddleware).get("/bootstrap",async({auth})=>{
const [ttl, messages] = await Promise.all([
  redis.ttl(`meta:${auth.roomId}`),
  redis.lrange<Message>(`messages:${auth.roomId}`,0,-1)
])
return {
  ttl: ttl > 0 ? ttl : 0,
  messages: messages.map((message) => ({
    ...message,
    token: message.token === auth.token ? auth.token : undefined,
  })),
}
}).delete("/", async ({auth}) => {
await Promise.all([
    realtime.channel(auth.roomId).emit("chat.destroy", { isDestroyed: true }),
    redis.del(
`meta:${auth.roomId}`,
`messages:${auth.roomId}`,
`room:${auth.roomId}:users`
    )
  ])
}, {
  query: z.object({
    roomId: z.string()
})
})

const messages = new Elysia({prefix:"/messages"})
.use(authMiddleware).post("/",async({body,auth,set})=>{
const {sender,text,clientId} = body
const {roomId, token} = auth
const usersKey = `room:${roomId}:users`
const [allowed, [remaining, storedUsername]] = await Promise.all([
  isWithinRateLimit(`rate:${roomId}:${token}:messages`, 4, 1),
  Promise.all([
    redis.ttl(`meta:${roomId}`),
    redis.hget<string>(usersKey, token),
  ]),
])
if (!allowed) {
  set.status = 429
  return { error: "Too many messages" }
}
if (remaining <= 0) {
  set.status = 404
  return { error: "Room has expired" }
}
if (storedUsername) {
if (storedUsername !== sender) {
      set.status = 400
return { error: "Sender name mismatch / Spoofing detected" }
}
} else {
const usernameClaim = await claimUsername(roomId, token, sender, remaining)
if (usernameClaim === "taken") {
      set.status = 409
return { error: "Username already taken in this room" }
}
if (usernameClaim === "mismatch") {
      set.status = 400
return { error: "Sender name mismatch / Spoofing detected" }
}
}
const message: Message = {
    id: nanoid(),
    sender,
    text,
    timestamp: Date.now(),
    roomId,
    clientId,
}
const persistence = redis.pipeline()
persistence.rpush(`messages:${roomId}`,{...message, token: auth.token})
persistence.expire(`messages:${roomId}`, remaining)
await Promise.all([
  persistence.exec(),
  realtime.channel(roomId).emit("chat.message", message),
])
return { message }
},
{
  query: z.object({
    roomId: z.string()
}),
  body: z.object({
    sender: z.string().min(1).max(30),
    text: z.string().trim().min(1).max(1000),
    clientId: z.string().uuid()
})
}).get("/",async({auth})=>{
const messages = await redis.lrange<Message>(`messages:${auth.roomId}`,0,-1)
return {
    messages: messages.map((m)=>({
...m,
      token: m.token===auth.token?auth.token:undefined,
}))
}
},{
  query:z.object({
    roomId: z.string()
})
})

// Claim the session username as soon as the room hydrates. Message delivery no
// longer has to do the first-message registration work on its critical path.
const join = new Elysia({prefix:"/room/join"})
.use(authMiddleware).post("/", async ({body, auth, set}) => {
  const { sender } = body
  const remaining = await redis.ttl(`meta:${auth.roomId}`)
  if (remaining <= 0) {
    set.status = 404
    return { error: "Room has expired" }
  }
  const usernameClaim = await claimUsername(auth.roomId, auth.token, sender, remaining)
  if (usernameClaim === "taken") {
    set.status = 409
    return { error: "Username already taken in this room" }
  }
  if (usernameClaim === "mismatch") {
    set.status = 400
    return { error: "Sender name mismatch / Spoofing detected" }
  }
  return { ok: true }
}, {
  query: z.object({ roomId: z.string() }),
  body: z.object({ sender: z.string().min(1).max(30) }),
})

const typing = new Elysia({prefix:"/room/typing"})
.use(authMiddleware).post("/", async ({body, auth, set}) => {
const {sender, isTyping} = body
const {roomId, token} = auth

const usersKey = `room:${roomId}:users`
const storedUsername = await redis.hget<string>(usersKey, token)
if (storedUsername !== sender) {
set.status = 400
return { error: "Sender name mismatch / Spoofing detected" }
}

await realtime.channel(roomId).emit("chat.typing", { sender, isTyping })
return { ok: true }
},
{
  query: z.object({
    roomId: z.string()
}),
  body: z.object({
    sender: z.string().min(1).max(30),
    isTyping: z.boolean()
})
})

const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages).use(join).use(typing)
export const GET = app.fetch 
export const POST = app.fetch
export const DELETE = app.fetch
export type app = typeof app
