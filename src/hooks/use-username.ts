import { useEffect, useState } from "react"

const ADJECTIVES = [
  "Glitchy",
  "Secret",
  "Rogue",
  "Spicy",
  "Hidden",
  "Neon",
  "Silent",
  "Toxic",
  "Lucky",
  "Fuzzy",
  "Salty",
  "Crypto"
];

const NOUNS = [
  "Alien",
  "Agent",
  "Hacker",
  "Ghost",
  "Bot",
  "Ninja",
  "Pixel",
  "Shadow",
  "Vibe",
  "Sushi",
  "Panda",
  "Samurai"
];

const STORAGE_KEY = "chat_username"

const generateUsername = () => {
   const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
   const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
   return `${adj}${noun}`
}

export const useUsername = () => {
    const [username, setUsername] = useState("")
    
    useEffect(() => {
        const main = () =>{
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored){
                setUsername(stored)
                return
            }
            const generated = generateUsername()
            sessionStorage.setItem(STORAGE_KEY,generated)
            setUsername(generated)
        }
        main();
    },[])
    
    return {username};
}
