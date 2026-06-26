import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { nanoid } from "nanoid";

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
  
  const meta = await redis.hgetall<{connected: string[],createdAt:number}>(`meta:${roomId}`);

  if(!meta){
    return NextResponse.redirect(new URL("/?error=room-not-found",req.url));
  }

  const cookieName = `x-auth-token-${roomId}`;
  const existingTokens = req.cookies.get(cookieName)?.value;
  if(existingTokens && meta.connected.includes(existingTokens)){
    return NextResponse.next();
  }

  if(meta.connected.length>=3){
    return NextResponse.redirect(new URL("/?error=room-full",req.url));
  }

  const response = NextResponse.next();
  const token = nanoid();

  response.cookies.set(cookieName,token,{
    path:"/",
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"strict"
  });

  await redis.hset(`meta:${roomId}`,{
    connected: [...meta.connected, token]
  });
  
  return response;
};

export const config = {
  matcher: "/room/:path*"
};

