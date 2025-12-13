import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { authMiddleware } from './auth'
import { z } from 'zod'
import { send } from 'process'
import { Message, realtime } from '@/lib/realtime'
const rooms = new Elysia({prefix:"/room"}).post("/", async()=>{
    const roomId = nanoid()

    await redis.hset(`meta:${roomId}`,{
        connected:[],
        createdAt: Date.now()
    })

    await redis.expire(`meta:${roomId}`,60*10)

    return {roomId}
})

const messages = new Elysia({prefix:"/messages"})
.use(authMiddleware).post("/",async({body,auth})=>{
    const {sender,text} = body
    const {roomId} = auth
    const roomExists = await redis.exists(`meta:${roomId}`)
    if(!roomExists){
        throw new Error("Room does not exist")
    }

    const message: Message ={
        id: nanoid(),
        sender,
        text,
        timestamp: Date.now(),
        roomId
    }

    await redis.rpush(`messages:${roomId}`,{...message, token: auth.token})
    await realtime.channel(roomId).emit("chat.message",message)
    
    const remaining = await redis.ttl(`meta:${roomId}`)
    //30 minutes expiry





    await redis.expire(`messages:${roomId}`,remaining)
    await redis.expire(`history:${roomId}`,remaining)
    await redis.expire("roomId",remaining)

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
    
    return {messages: messages.map((m)=>({
        ...m,
        token: m.token===auth.token?auth.token:undefined,
    }))
}},{query:z.object({
    roomId: z.string()
})})
    



const app = new Elysia({ prefix: '/api' }).use(rooms).use(messages)

export const GET = app.fetch 
export const POST = app.fetch 

export type app = typeof app 