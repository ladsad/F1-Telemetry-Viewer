import { useTheme } from "@/components/ThemeProvider"
import { Moon, Sun } from "lucide-react"
import { motion } from "framer-motion"

export default function ThemeToggle() {
  const { mode, setMode } = useTheme()
  
  return (
    <motion.button
      aria-label="Toggle dark/light mode"
      className="p-2 rounded transition-colors hover:bg-accent"
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      whileHover={{ scale: 1.1, rotate: 15 }}
      whileTap={{ scale: 0.9 }}
      type="button"
    >
      <motion.div
        initial={false}
        animate={{ rotate: mode === "dark" ? 0 : 180 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
      >
        {mode === "dark" ? 
          <Sun className="w-5 h-5 text-yellow-300" /> : 
          <Moon className="w-5 h-5 text-indigo-400" />
        }
      </motion.div>
    </motion.button>
  )
}