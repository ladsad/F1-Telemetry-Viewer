import { motion } from "framer-motion"
import { useTheme } from "@/components/ThemeProvider"
import { forwardRef } from "react"

type AnimatedButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode
  variant?: "default" | "outline" | "ghost" | "primary"
  size?: "sm" | "md" | "lg"
  icon?: React.ReactNode
}

const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(({
  children,
  variant = "default",
  size = "md",
  icon,
  className = "",
  ...props
}, ref) => {
  const { colors } = useTheme()
  
  const sizeClasses = {
    sm: "px-3 py-2 text-responsive-sm",
    md: "px-4 py-3 text-responsive-base",
    lg: "px-6 py-4 text-responsive-lg"
  }
  
  const variantClasses = {
    default: "bg-card text-foreground border border-input hover:bg-accent",
    outline: "bg-transparent border border-input hover:bg-accent/10",
    ghost: "bg-transparent hover:bg-accent/10",
    primary: `bg-[${colors.primary}] text-white hover:bg-[${colors.primary}]/90`
  }
  
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`rounded font-formula1 tracking-wider uppercase button-press tap-target ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {icon}
        {children}
      </span>
    </motion.button>
  )
})

AnimatedButton.displayName = "AnimatedButton"

export default AnimatedButton