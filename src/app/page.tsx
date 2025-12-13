"use client";
import { api } from "@/lib/eden";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useUsername } from "@/hooks/use-usename";
import { Suspense } from "react";

const Page =() => {
  return <Suspense><Home/></Suspense>

} 
export default Page;
 function Home() {
  const {username} = useUsername()
  const router = useRouter()
  
  const searchParams = useSearchParams()
  const wasDestroyed = searchParams.get("destroyed")==="true"
  const error = searchParams.get("error")


  const {mutate: createRoom} = useMutation({
    mutationFn:async()=>{
      const res = await api.room.post()
      if(res.status===200){
        router.push(`/room/${res.data?.roomId}`)
      }
    }
  })//tanstackQuery


  return (
<main className="flex min-h-screen flex-col items-center justify-center p-6 bg-neutral-950 relative overflow-hidden">
  {/* Organic background blobs - Cyan Theme */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-900/8 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-3xl animate-blob"></div>
    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-900/8 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] blur-3xl animate-blob animation-delay-2000"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-cyan-800/6 rounded-full blur-3xl"></div>
  </div>

  <div className="w-full max-w-md space-y-8 relative z-10">
    
    {/* Error Messages - Cyan Theme */}
    {wasDestroyed && (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-3xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-red-400 font-semibold text-sm">Room Closed</p>
            <p className="text-neutral-400 text-xs mt-0.5">All messages were permanently deleted</p>
          </div>
        </div>
      </div>
    )}

    {error === "room-not-found" && (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-3xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-red-400 font-semibold text-sm">Room Not Found</p>
            <p className="text-neutral-400 text-xs mt-0.5">This room may have expired or never existed</p>
          </div>
        </div>
      </div>
    )}

    {error === "room-full" && (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-3xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z" />
            </svg>
          </div>
          <div>
            <p className="text-red-400 font-semibold text-sm">Room Full</p>
            <p className="text-neutral-400 text-xs mt-0.5">This room is at maximum capacity</p>
          </div>
        </div>
      </div>
    )}

    {/* Header - Cyan Theme */}
    <div className="text-center space-y-4">
      <div className="inline-flex items-center gap-4">
        {/* Enhanced Icon */}
        <div className="relative group">
          <div className="absolute inset-0 bg-cyan-600/20 blur-2xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-700 animate-pulse"></div>
          <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-700 rounded-[40%] flex items-center justify-center shadow-2xl shadow-cyan-950/60 group-hover:shadow-cyan-900/70 group-hover:scale-110 transition-all duration-500 group-hover:rounded-[45%] rotate-6 group-hover:rotate-12 border border-cyan-500/20">
            <svg className="w-8 h-8 text-cyan-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        </div>
        
        {/* Logo Text - Enhanced */}
        <h1 className="text-5xl font-black tracking-tight">
          <span className="bg-gradient-to-r from-neutral-50 to-neutral-300 bg-clip-text text-transparent">Hidden</span>
          <span className="bg-gradient-to-r from-cyan-400 via-cyan-500 to-teal-500 bg-clip-text text-transparent">Talk</span>
        </h1>
      </div>
      
      <p className="text-neutral-400 text-base max-w-sm mx-auto leading-relaxed">
        Private conversations that disappear after you're done
      </p>
    </div>

    {/* Main Card - Enhanced */}
    <div className="relative group/card">
      {/* Animated glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600/10 via-teal-600/10 to-cyan-600/10 rounded-[34px] blur-xl opacity-0 group-hover/card:opacity-100 transition-all duration-700"></div>
      
      <div className="relative bg-gradient-to-br from-neutral-900/70 to-neutral-900/50 border border-neutral-800/60 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl hover:border-cyan-900/40 transition-all duration-700">
        <div className="space-y-6">
          
          {/* Username Display */}
          <div className="space-y-3">
            <label className="text-neutral-400 text-sm font-semibold flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              What should we call you?
            </label>
            <div className="relative group/input">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600/0 via-cyan-600/20 to-cyan-600/0 rounded-[20px] opacity-0 group-hover/input:opacity-100 transition-all duration-700"></div>
              <div className="relative bg-neutral-950/90 border border-neutral-800/80 rounded-[20px] px-5 py-4 text-neutral-100 font-medium hover:border-cyan-900/50 focus-within:border-cyan-700/60 transition-all duration-500 shadow-inner text-base">
                {username}
              </div>
            </div>
          </div>

          {/* Enhanced Create Room Button */}
          <button 
            onClick={() => createRoom()} 
            className="group/btn relative overflow-hidden w-full bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-700 hover:from-cyan-500 hover:via-cyan-600 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-[20px] transition-all duration-500 shadow-2xl shadow-cyan-950/50 hover:shadow-cyan-900/70 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 border border-cyan-600/30"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            {/* Button content */}
            <span className="relative flex items-center justify-center gap-2.5 text-base">
              <svg className="w-5 h-5 group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Start a Secret Chat</span>
              <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {/* Feature Pills - Enhanced */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-full text-xs text-neutral-400 border border-neutral-700/50 hover:border-cyan-800/50 hover:bg-cyan-950/20 transition-all duration-300 group/pill">
              <svg className="w-3.5 h-3.5 text-cyan-500 group-hover/pill:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              End-to-end encrypted
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-full text-xs text-neutral-400 border border-neutral-700/50 hover:border-cyan-800/50 hover:bg-cyan-950/20 transition-all duration-300 group/pill">
              <svg className="w-3.5 h-3.5 text-cyan-500 group-hover/pill:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Self-destructs
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-full text-xs text-neutral-400 border border-neutral-700/50 hover:border-cyan-800/50 hover:bg-cyan-950/20 transition-all duration-300 group/pill">
              <svg className="w-3.5 h-3.5 text-cyan-500 group-hover/pill:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
              No trace left
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Enhanced Footer */}
    <p className="text-center text-neutral-600 text-sm flex items-center justify-center gap-2">
      <svg className="w-3.5 h-3.5 text-cyan-700" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Your privacy matters. Always.
    </p>
  </div>
</main>
  );
}
