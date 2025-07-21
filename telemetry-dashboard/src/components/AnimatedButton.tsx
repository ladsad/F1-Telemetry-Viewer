"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { AnimatedButtonProps } from "@/types";

export default function AnimatedButton({
  variant = "default",
  size = "md",
  onClick,
  disabled = false,
  className = "",
  children,
  icon,
  ...props
}: AnimatedButtonProps) {
  const { colors } = useTheme();
  
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };
  
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "bg-transparent border border-input text-foreground hover:bg-accent hover:text-accent-foreground",
    ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  };
  
  // Handle dynamic primary color styling for default/primary variants
  const dynamicStyle = (variant === "default" || variant === "primary") ? {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  } : {};
  
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <button
        className={`
          inline-flex items-center justify-center gap-2 rounded-md font-medium 
          transition-colors focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-ring focus-visible:ring-offset-2 
          disabled:pointer-events-none disabled:opacity-50
          ${sizeClasses[size]} 
          ${variantClasses[variant]} 
          ${className}
        `}
        style={dynamicStyle}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </button>
    </motion.div>
  );
}