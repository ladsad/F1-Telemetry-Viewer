import { motion } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"

type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  variant?: "default" | "outline" | "ghost" | "primary"
  size?: "sm" | "md" | "lg"
  icon?: React.ReactNode
}

export default function AnimatedButton({
  children,
  variant = "default",
  size = "md",
  icon,
  ...props
}: AnimatedButtonProps) {
  const { colors } = useTheme()
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  }
  
  const variantClasses = {
    default: "bg-card text-foreground border border-input hover:bg-accent",
    outline: "bg-transparent border border-input hover:bg-accent/10",
    ghost: "bg-transparent hover:bg-accent/10",
    primary: `bg-[${colors.primary}] text-white hover:bg-[${colors.primary}]/90`
  }
  
  return (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`rounded font-formula1 tracking-wider uppercase button-press ${sizeClasses[size]} ${variantClasses[variant]}`}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {icon && <span className="animate-pulse">{icon}</span>}
        {children}
      </span>
    </motion.button>
  )
}