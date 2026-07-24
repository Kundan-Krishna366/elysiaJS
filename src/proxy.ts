import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

// Keep admission in one Redis operation. The old read-then-write sequence made
// every new room visit wait for two cross-region REST round trips and could let
// concurrent requests overfill a room.
const admitToRoom = `
local connected = redis.call("HGET", KEYS[1], "connected")
if not connected then return -1 end
local tokens = cjson.decode(connected)
for _, existing in ipairs(tokens) do
  if existing == ARGV[1] then return 0 end
end
if #tokens >= 3 then return -2 end
table.insert(tokens, ARGV[1])
redis.call("HSET", KEYS[1], "connected", cjson.encode(tokens))
return 1
`;

export const proxy = async (req: NextRequest)=> {
  const pathname = req.nextUrl.pathname;
  const roomMatch = pathname.match(/^\/room\/([^\/]+)$/);
  
  if(!roomMatch){
    return NextResponse.redirect(new URL("/",req.url));
  }

  // Bypass database checks and token generation for Next.js prefetch requests
  if (req.headers.get("x-middleware-prefetch") || req.headers.get("purpose") === "prefetch") {
    return NextResponse.next();
  }

  const roomId = roomMatch[1];
  
  const cookieName = `x-auth-token-${roomId}`;
  const existingToken = req.cookies.get(cookieName)?.value;
  const token = existingToken ?? nanoid();
  const admission = await redis.eval<[string], number>(admitToRoom, [`meta:${roomId}`], [token]);

  if (admission === -1) {
    return NextResponse.redirect(new URL("/?error=room-not-found",req.url));
  }
  if (admission === -2) {
    return NextResponse.redirect(new URL("/?error=room-full",req.url));
  }

  const response = NextResponse.next();
  if (!existingToken) {
    response.cookies.set(cookieName,token,{
    path:"/",
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"strict"
    });
  }
  
  return response;
};

export const config = {
  matcher: "/room/:path*"
};
