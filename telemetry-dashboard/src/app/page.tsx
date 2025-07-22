"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AnimatedButton from "@/components/AnimatedButton"
import { ThemeProvider, useTheme } from "@/components/ThemeProvider"
import ThemeToggle from "@/components/ThemeToggle"
import TeamSelector from "@/components/TeamSelector"
import { 
  Activity, 
  History, 
  Map, 
  BarChart3, 
  Zap, 
  Radio,
  ArrowRight,
  Gauge,
  TrendingUp,
  Clock,
  Users,
  Globe,
  ChevronRight
} from "lucide-react"

// Feature cards data
const navigationCards = [
  {
    id: "live",
    title: "Live Dashboard",
    description: "Real-time F1 telemetry data with live driver positions, speed, and race analytics",
    href: "/dashboard/live",
    icon: Activity,
    gradient: "from-red-500 to-orange-500",
    features: ["Live Telemetry", "Real-time Positions", "Driver Analytics"],
    status: "Live",
    statusColor: "bg-green-500"
  },
  {
    id: "historic",
    title: "Historic Analysis",
    description: "Dive deep into historical race data with advanced playback and comparison tools",
    href: "/dashboard/historic",
    icon: History,
    gradient: "from-blue-500 to-cyan-500",
    features: ["Session Playback", "Data Analysis", "Race Comparison"],
    status: "Available",
    statusColor: "bg-blue-500"
  },
  {
    id: "track",
    title: "Track Map",
    description: "Interactive circuit layouts with driver positions and sector timing analysis",
    href: "/dashboard",
    icon: Map,
    gradient: "from-purple-500 to-pink-500",
    features: ["Circuit Layout", "Driver Tracking", "Sector Analysis"],
    status: "Interactive",
    statusColor: "bg-purple-500"
  },
  {
    id: "analytics",
    title: "Performance Analytics",
    description: "Advanced performance metrics and comparative analysis tools for F1 data",
    href: "/dashboard/analytics",
    icon: BarChart3,
    gradient: "from-green-500 to-teal-500",
    features: ["Lap Analysis", "Performance Metrics", "Driver Comparison"],
    status: "Enhanced",
    statusColor: "bg-teal-500"
  }
]

// Stats data
const statsData = [
  { label: "Live Sessions", value: "24/7", icon: Radio },
  { label: "Historical Races", value: "500+", icon: Clock },
  { label: "Data Points", value: "10M+", icon: TrendingUp },
  { label: "Active Users", value: "12K+", icon: Users }
]

function HomePage() {
  const { colors, getTeamGradient, team } = useTheme()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second for live feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: getTeamGradient() }}
            >
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <span className="font-formula1 font-bold text-xl tracking-wider uppercase">
              F1 Telemetry
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard">
              <AnimatedButton variant="default" className="font-formula1">
                Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </AnimatedButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{ background: getTeamGradient() }}
        />
        
        <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1, type: "spring" }}
              className="mb-8"
            >
              <Badge 
                variant="outline" 
                className="mb-6 text-sm font-formula1"
                style={{ borderColor: colors.primary, color: colors.primary }}
              >
                <Radio className="w-4 h-4 mr-2 animate-pulse" />
                LIVE F1 TELEMETRY SYSTEM
              </Badge>
              
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-formula1 mb-6 tracking-tight">
                <span 
                  className="bg-gradient-to-r bg-clip-text text-transparent"
                  style={{ backgroundImage: getTeamGradient() }}
                >
                  FORMULA 1
                </span>
                <br />
                <span className="text-foreground">TELEMETRY HUB</span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
            >
              Experience the thrill of Formula 1 with real-time telemetry data, 
              comprehensive race analysis, and interactive track visualization.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/dashboard/live">
                <AnimatedButton
                  size="lg"
                  className="font-formula1 text-lg px-8 py-6"
                  animationIntensity="intense"
                  showRipple={true}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  GO LIVE
                </AnimatedButton>
              </Link>
              
              <Link href="/dashboard">
                <AnimatedButton
                  variant="outline"
                  size="lg"
                  className="font-formula1 text-lg px-8 py-6"
                >
                  <BarChart3 className="w-5 h-5 mr-2" />
                  EXPLORE DASHBOARD
                </AnimatedButton>
              </Link>
            </motion.div>

            {/* Live Status */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>System Online</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Global Coverage</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="font-mono">
                {currentTime.toLocaleTimeString()}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-formula1 mb-4">
              CHOOSE YOUR EXPERIENCE
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Access comprehensive F1 data through our specialized dashboards designed for every racing enthusiast.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {navigationCards.map((card, index) => {
              const IconComponent = card.icon
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <Link href={card.href}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden relative">
                      {/* Background gradient overlay */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} 
                      />
                      
                      <CardHeader className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div 
                            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} p-3 shadow-lg`}
                          >
                            <IconComponent className="w-full h-full text-white" />
                          </div>
                          
                          <Badge 
                            variant="secondary" 
                            className={`${card.statusColor} text-white font-formula1 text-xs`}
                          >
                            {card.status}
                          </Badge>
                        </div>

                        <CardTitle className="text-2xl font-formula1 group-hover:text-primary transition-colors duration-300">
                          {card.title}
                        </CardTitle>
                        
                        <CardDescription className="text-base leading-relaxed">
                          {card.description}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="relative z-10">
                        {/* Features list */}
                        <div className="space-y-2 mb-6">
                          {card.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ChevronRight className="w-4 h-4 text-primary" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA Button */}
                        <AnimatedButton
                          variant="ghost"
                          className="w-full group-hover:bg-primary/10 transition-colors duration-300 font-formula1"
                          animationIntensity="subtle"
                        >
                          ENTER {card.title.toUpperCase()}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                        </AnimatedButton>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-formula1 mb-4">
              BY THE NUMBERS
            </h2>
            <p className="text-lg text-muted-foreground">
              Powering the global F1 community with comprehensive data insights.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statsData.map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
                    <div 
                      className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                      style={{ background: getTeamGradient() }}
                    >
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="text-3xl font-bold font-mono mb-2" style={{ color: colors.primary }}>
                      {stat.value}
                    </div>
                    
                    <div className="text-sm text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Theme Selector */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-formula1 mb-4">
              CHOOSE YOUR TEAM
            </h2>
            <p className="text-lg text-muted-foreground">
              Customize your experience with official F1 team colors and branding.
            </p>
          </motion.div>

          <Card className="p-8">
            <TeamSelector />
            
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Currently representing: <span className="font-bold capitalize" style={{ color: colors.primary }}>{team}</span>
              </p>
              
              <Link href="/dashboard">
                <AnimatedButton 
                  className="font-formula1"
                  customColor={colors.primary}
                >
                  APPLY & ENTER DASHBOARD
                </AnimatedButton>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: getTeamGradient() }}
                >
                  <Gauge className="w-5 h-5 text-white" />
                </div>
                <span className="font-formula1 font-bold text-lg">F1 Telemetry</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The ultimate destination for Formula 1 telemetry data and race analysis.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4 font-formula1">Features</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard/live" className="hover:text-primary transition-colors">Live Telemetry</Link></li>
                <li><Link href="/dashboard/historic" className="hover:text-primary transition-colors">Historic Analysis</Link></li>
                <li><Link href="/dashboard/analytics" className="hover:text-primary transition-colors">Performance Analytics</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary transition-colors">Track Maps</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4 font-formula1">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/settings" className="hover:text-primary transition-colors">Settings</Link></li>
                <li><a href="https://openf1.org" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">OpenF1 API</a></li>
                <li><span>Real-time Data</span></li>
                <li><span>Global Coverage</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 F1 Telemetry Hub. Data provided by OpenF1.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function HomePageWithProvider() {
  return (
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  )
}