"use client"

import React from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { useTheme } from "@/components/ThemeProvider"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

// Enhanced button variants using cva (same as shadcn/ui)
const animatedButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // F1-specific variants
        primary: "text-primary-foreground shadow hover:opacity-90",
        success: "bg-green-600 text-white shadow hover:bg-green-700",
        warning: "bg-yellow-600 text-white shadow hover:bg-yellow-700",
        danger: "bg-red-600 text-white shadow hover:bg-red-700"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-9 w-9"
      },
      loading: {
        true: "cursor-not-allowed",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false
    }
  }
)

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof animatedButtonVariants> {
  /**
   * Icon to display before the button text
   */
  icon?: React.ReactNode
  /**
   * Icon to display after the button text
   */
  iconAfter?: React.ReactNode
  /**
   * Loading state - shows spinner and disables interaction
   */
  loading?: boolean
  /**
   * Custom loading text to show when loading is true
   */
  loadingText?: string
  /**
   * Animation intensity for hover/tap effects
   */
  animationIntensity?: "subtle" | "normal" | "intense"
  /**
   * Whether to show ripple effect on click
   */
  showRipple?: boolean
  /**
   * Custom color override for primary/default variants
   */
  customColor?: string
}

export default function AnimatedButton({
  className,
  variant = "default",
  size = "default",
  loading = false,
  loadingText,
  icon,
  iconAfter,
  animationIntensity = "normal",
  showRipple = false,
  customColor,
  disabled,
  onClick,
  children,
  ...props
}: AnimatedButtonProps) {
  const { colors } = useTheme()
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])
  
  // Animation configurations based on intensity
  const animations = {
    subtle: {
      hover: { scale: 1.02 },
      tap: { scale: 0.98 }
    },
    normal: {
      hover: { scale: 1.05 },
      tap: { scale: 0.96 }
    },
    intense: {
      hover: { scale: 1.08, rotate: 1 },
      tap: { scale: 0.92, rotate: -1 }
    }
  }

  // Handle ripple effect
  const handleRippleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (showRipple && !disabled && !loading) {
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const newRipple = { x, y, id: Date.now() }
      
      setRipples(prev => [...prev, newRipple])
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
      }, 600)
    }
    
    if (onClick && !disabled && !loading) {
      onClick(event)
    }
  }

  // Dynamic styles for custom color and F1 theme integration
  const dynamicStyle = React.useMemo(() => {
    const baseStyle: React.CSSProperties = {}
    
    if ((variant === "default" || variant === "primary") && (customColor || colors.primary)) {
      const color = customColor || colors.primary
      baseStyle.backgroundColor = color
      baseStyle.borderColor = color
      // Ensure good contrast for text
      baseStyle.color = "#ffffff"
    }
    
    return baseStyle
  }, [variant, customColor, colors.primary])

  // Determine if button should be disabled
  const isDisabled = disabled || loading

  return (
    <motion.div
      whileHover={!isDisabled ? animations[animationIntensity].hover : {}}
      whileTap={!isDisabled ? animations[animationIntensity].tap : {}}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 1
      }}
      className="inline-block"
    >
      <button
        className={cn(
          animatedButtonVariants({ variant, size, loading }),
          "relative overflow-hidden touch-manipulation",
          className
        )}
        style={dynamicStyle}
        disabled={isDisabled}
        onClick={handleRippleClick}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </motion.div>
        )}
        
        {/* Leading icon */}
        {!loading && icon && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            {icon}
          </motion.span>
        )}
        
        {/* Button content */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="flex items-center"
        >
          {loading && loadingText ? loadingText : children}
        </motion.span>
        
        {/* Trailing icon */}
        {!loading && iconAfter && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center"
          >
            {iconAfter}
          </motion.span>
        )}
        
        {/* Ripple effects */}
        {showRipple && ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full pointer-events-none"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 10, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
        
        {/* Enhanced focus ring */}
        <motion.div
          className="absolute inset-0 rounded-md border-2 border-transparent pointer-events-none"
          whileFocus={{
            borderColor: colors.primary + "80",
            boxShadow: `0 0 0 2px ${colors.primary}40`
          }}
        />
      </button>
    </motion.div>
  )
}

// Export useful variants for common F1 use cases
export const F1PrimaryButton = (props: Omit<AnimatedButtonProps, 'variant'>) => (
  <AnimatedButton variant="primary" {...props} />
)

export const F1ActionButton = (props: Omit<AnimatedButtonProps, 'variant' | 'animationIntensity' | 'showRipple'>) => (
  <AnimatedButton 
    variant="default" 
    animationIntensity="intense" 
    showRipple={true} 
    {...props} 
  />
)

export const F1LoadingButton = (props: Omit<AnimatedButtonProps, 'loading'>) => (
  <AnimatedButton loading={true} loadingText="Processing..." {...props} />
)