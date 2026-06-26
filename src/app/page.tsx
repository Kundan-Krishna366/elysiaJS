"use client";
import { api } from "@/lib/eden";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useUsername } from "@/hooks/use-username";
import { Suspense } from "react";

const Page = () => {
  return <Suspense><Home/></Suspense>
}

export default Page;

function Home() {
  const {username} = useUsername()
  const router = useRouter()
  
  const searchParams = useSearchParams()
  const wasDestroyed = searchParams.get("destroyed") === "true"
  const error = searchParams.get("error")

  const {mutate: createRoom, isPending} = useMutation({
    mutationFn: async() => {
      const res = await api.room.post()
      return res
    },
    onSuccess: (res) => {
      if(res.status === 200 && res.data?.roomId){
        router.push(`/room/${res.data.roomId}`)
      }
    }
  })

  const clearErrorsAndGoHome = () => {
    router.push('/')
  }

  return (
    <div className="flex flex-col h-[100vh] h-[100dvh] w-full overflow-hidden bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      <nav className="shrink-0 border-b border-zinc-900 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:px-6 h-12 sm:h-14 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-zinc-700 rounded-sm"
            aria-label="HiddenTalk Home"
          >
            <div className="w-5 h-5 bg-white rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-black rounded-full" />
            </div>
            <span className="font-bold tracking-tight text-sm">HiddenTalk</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-3 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:p-6 relative overflow-y-auto min-h-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
        
        <div className="w-full max-w-[420px] relative z-10 flex flex-col gap-6 sm:gap-8 my-auto py-4">
          
          {(wasDestroyed || error) && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-md shadow-lg">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded text-zinc-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{wasDestroyed ? "Session Terminated" : "Connection Error"}</p>
                  <p className="text-xs text-zinc-500 truncate">{wasDestroyed ? "Room data permanently erased." : "Room unavailable or full."}</p>
                </div>
                <button 
                  onClick={clearErrorsAndGoHome} 
                  aria-label="Dismiss message"
                  className="w-11 h-11 -mr-3 -my-3 flex items-center justify-center hover:bg-zinc-800 rounded transition-colors text-zinc-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 animate-in fade-in duration-700">
              HiddenTalk.
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto">
              Ephemeral messaging. No logs, no tracking, complete anonymity for sensitive communications.
            </p>
          </div>

          <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-xl p-1 shadow-2xl">
            <div className="bg-black/40 rounded-lg p-4 sm:p-6 space-y-5 sm:space-y-6 border border-white/5">
              <div className="space-y-2">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 tracking-wider pl-1">Identified As</span>
                {!username ? (
                  <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg group transition-colors">
                    <div className="w-8 h-8 rounded bg-zinc-800 animate-pulse flex items-center justify-center text-transparent font-bold text-xs shadow-sm">
                      U
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-4 w-28 bg-zinc-800 rounded animate-pulse"></div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-zinc-800 animate-pulse"></div>
                        <p className="text-[10px] text-zinc-600 font-mono">ENCRYPTED</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-zinc-100 to-zinc-400 flex items-center justify-center text-black font-bold text-xs shadow-sm">
                      {username?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{username}</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                        <p className="text-[10px] text-zinc-500 font-mono">ENCRYPTED</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-zinc-800/50 w-full my-2"></div>

              <button 
                onClick={() => createRoom()} 
                disabled={isPending || !username}
                className="w-full relative group overflow-hidden bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 font-semibold py-3.5 rounded-lg transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-black cursor-pointer disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  {isPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Initializing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm tracking-tight">Initialize Session</span>
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-2 px-1 sm:px-2 select-none">
            <div className="text-center space-y-1">
              <div className="mx-auto w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">End-to-End</p>
            </div>
            <div className="text-center space-y-1">
              <div className="mx-auto w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Zero Trace</p>
            </div>
            <div className="text-center space-y-1">
              <div className="mx-auto w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium">Instant</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="shrink-0 w-full py-4 sm:py-6 text-center z-10 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <p className="text-[10px] text-zinc-600 font-mono select-none">UI // V2.0</p>
      </footer>
    </div>
  );
}