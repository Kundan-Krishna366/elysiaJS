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
}).use(authMiddleware).get("/ttl",async({auth})=>{
  const ttl = await redis.ttl(`meta:${auth.roomId}`)
  return {ttl: ttl>0?ttl:0}
},{
  query: z.object({
    roomId: z.string()
  })
}).delete("/", async ({auth}) => {
  await Promise.all([
    realtime.channel(auth.roomId).emit("chat.destroy",{isDestroyed:true}),
    redis.del(`meta:${auth.roomId}`),
    redis.del(`messages:${auth.roomId}`),
    redis.del(`room:${auth.roomId}:users`)
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
  
  const remaining = await redis.ttl(`meta:${roomId}`)
  
  // Enforce username mapping to prevent sender spoofing
  const usersKey = `room:${roomId}:users`
  const storedUsername = await redis.hget<string>(usersKey, token)
  
  if (storedUsername) {
    if (storedUsername !== sender) {
      set.status = 400
      return { error: "Sender name mismatch / Spoofing detected" }
    }
  } else {
    // Check if this username is already claimed by another token
    const allUsers = await redis.hgetall<Record<string, string>>(usersKey) || {}
    const isTaken = Object.values(allUsers).includes(sender)
    if (isTaken) {
      set.status = 409
      return { error: "Username already taken in this room" }
    }
    // Claim the username for this token
    await redis.hset(usersKey, { [token]: sender })
    if (remaining > 0) {
      await redis.expire(usersKey, remaining)
    }
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

const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages)

export const GET = app.fetch 
export const POST = app.fetch
export const DELETE = app.fetch

export type app = typeof app