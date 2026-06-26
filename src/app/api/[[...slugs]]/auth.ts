import { Elysia } from "elysia";
import { redis } from "@/lib/redis";

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  } 
}

export const authMiddleware = new Elysia({
    name: "auth"
}).error({AuthError}).onError(({code, set})=> {
    if(code==="AuthError"){
        set.status = 401;
        return {error: "Unauthorized"}
}
})
.derive({as:"scoped"},async({query,cookie
})=>{
    const roomId = query.roomId
    if (!roomId) {
        throw new AuthError("Missing roomId")
    }
    const token = cookie[`x-auth-token-${roomId}`].value as string | undefined
    if(!token){
        throw new AuthError("Missing token")
    }

    const connected = await redis.hget<string[]>(`meta:${roomId}`,"connected")
    
    if(!connected?.includes(token)){
        throw new AuthError("Invalid token for room")
    }
    
    return {auth:{roomId,token,connected}}
})