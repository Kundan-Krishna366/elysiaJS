import { Elysia, t } from 'elysia'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
const rooms = new Elysia({prefix:"/room"}).post("/", async()=>{
    const roomId = nanoid()

    await redis.hset(`meta:${roomId}`,{
        connected:[],
        createdAt: Date.now()
    })

    await redis.expire(`meta:${roomId}`,60*10)

    return {roomId}
})
const app = new Elysia({ prefix: '/api' }).use(rooms)

export const GET = app.fetch 
export const POST = app.fetch 

export type app = typeof app 