import { useEffect, useState } from "react"
import { nanoid } from "nanoid"
const THEBOYS = [
  "Hank",
  "BillyButcher",
  "Mother's Milk",
  "Frenchie",
  "Kimiko",
  "A-Train",
  "The Deep",
  "Starlight",
  "Homelander",
  "Black Noir",
  "Stormfront",
  "Queen Maeve"
];
const STORAGE_KEY = "chat_username"

const generateUsername = () => {
   const name = THEBOYS[Math.floor(Math.random() * THEBOYS.length)]
   return `${name}`
}
export const useUsername = () => {
    const [username, setUsername] = useState("");
    useEffect(() => {
    const main = () =>{
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored){
        setUsername(stored)
        return
      }
      const generated = generateUsername()
      localStorage.setItem(STORAGE_KEY,generated)
      setUsername(generated)
    }
    main();
  },[])
    return {username};

}