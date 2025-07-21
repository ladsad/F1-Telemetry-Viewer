import React from 'react'

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  label, 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }
  
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${sizeMap[size]} rounded-full border-2 border-t-transparent border-primary animate-spin`}></div>
      {label && <p className="text-sm text-muted-foreground mt-2">{label}</p>}
    </div>
  )
}