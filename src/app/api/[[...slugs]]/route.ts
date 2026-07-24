import { Elysia } from 'elysia'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { authMiddleware } from './auth'
import { z } from 'zod'
import { Message, realtime } from '@/lib/realtime'

const rooms = new Elysia({prefix:"/room"}).post("/", async()=>{
const roomId = nanoid()
await Promise.all([
    redis.hset(`meta:${roomId}`,{
      connected:[],
      createdAt: Date.now()
}),
    redis.expire(`meta:${roomId}`, 60*30)
  ])
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
}).get("/ttl",async({auth})=>{
const ttl = await redis.ttl(`meta:${auth.roomId}`)
return {ttl: ttl>0?ttl:0}
},{
  query: z.object({
    roomId: z.string()
})
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
const {sender,text} = body
const {roomId, token} = auth
const usersKey = `room:${roomId}:users`
// These reads do not depend on one another. Keeping them parallel removes one
// Redis network round trip from every message send.
const [remaining, storedUsername] = await Promise.all([
  redis.ttl(`meta:${roomId}`),
  redis.hget<string>(usersKey, token)
])
if (storedUsername) {
if (storedUsername !== sender) {
      set.status = 400
return { error: "Sender name mismatch / Spoofing detected" }
}
} else {

const allUsers = await redis.hgetall<Record<string, string>>(usersKey) || {}
const isTaken = Object.values(allUsers).includes(sender)
if (isTaken) {
      set.status = 409
return { error: "Username already taken in this room" }
}
const registration = redis.pipeline()
registration.hset(usersKey, { [token]: sender })
if (remaining > 0) registration.expire(usersKey, remaining)
await registration.exec()
}
const message: Message = {
    id: nanoid(),
    sender,
    text,
    timestamp: Date.now(),
    roomId
}
await Promise.all([
    redis.rpush(`messages:${roomId}`,{...message, token: auth.token}),
    remaining > 0 ? redis.expire(`messages:${roomId}`, remaining) : null,
    realtime.channel(roomId).emit("chat.message", message)
  ])
return { message }
},
{
  query: z.object({
    roomId: z.string()
}),
  body: z.object({
    sender: z.string().min(1).max(30),
    text: z.string().min(1).max(1000)
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
  const usersKey = `room:${auth.roomId}:users`
  const storedUsername = await redis.hget<string>(usersKey, auth.token)

  if (storedUsername) {
    if (storedUsername !== sender) {
      set.status = 400
      return { error: "Sender name mismatch / Spoofing detected" }
    }
    return { ok: true }
  }

  const [allUsers, remaining] = await Promise.all([
    redis.hgetall<Record<string, string>>(usersKey),
    redis.ttl(`meta:${auth.roomId}`),
  ])
  if (Object.values(allUsers || {}).includes(sender)) {
    set.status = 409
    return { error: "Username already taken in this room" }
  }

  const registration = redis.pipeline()
  registration.hset(usersKey, { [auth.token]: sender })
  if (remaining > 0) registration.expire(usersKey, remaining)
  await registration.exec()
  return { ok: true }
}, {
  query: z.object({ roomId: z.string() }),
  body: z.object({ sender: z.string().min(1).max(30) }),
})

const typing = new Elysia({prefix:"/room/typing"})
.use(authMiddleware).post("/", async ({body, auth}) => {
const {sender, isTyping} = body
const {roomId, token} = auth

const usersKey = `room:${roomId}:users`
const storedUsername = await redis.hget<string>(usersKey, token)
if (storedUsername && storedUsername !== sender) {
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
