'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Zap, Cpu, Globe, Rocket, Infinity } from 'lucide-react'

export default function HammamPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 10,
    }))
    setParticles(newParticles)

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="min-h-screen bg-deep-space relative overflow-hidden">
      {/* Animated background gradient */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, 
            rgba(0, 245, 255, 0.15) 0%, 
            rgba(191, 0, 255, 0.1) 25%, 
            rgba(255, 0, 170, 0.05) 50%, 
            transparent 75%)`,
          transition: 'background 0.3s ease-out',
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="particle"
          initial={{ opacity: 0 }}
          animate={{
            y: [0, -1000],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Number.MAX_SAFE_INTEGER,
            delay: particle.delay,
          }}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
        />
      ))}

      {/* Grid lines */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 245, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 245, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center top',
        }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Orbiting rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="w-96 h-96 border border-neon-blue/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Number.MAX_SAFE_INTEGER, ease: "linear" }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] border border-neon-purple/20 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Number.MAX_SAFE_INTEGER, ease: "linear" }}
          />
          <motion.div
            className="absolute w-[600px] h-[600px] border border-neon-pink/10 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Number.MAX_SAFE_INTEGER, ease: "linear" }}
          />
        </div>

        {/* Central content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center max-w-4xl"
        >
          {/* Glowing orb */}
          <motion.div
            className="w-32 h-32 mx-auto mb-8 relative"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 360],
            }}
            transition={{
              duration: 4,
              repeat: Number.MAX_SAFE_INTEGER,
              ease: "easeInOut",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink rounded-full blur-xl opacity-60 animate-pulse-slow" />
            <div className="absolute inset-2 bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink rounded-full blur-lg opacity-80" />
            <div className="absolute inset-4 bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink rounded-full flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          {/* Main title */}
          <motion.h1
            className="text-7xl md:text-9xl font-bold mb-4 text-glow tracking-tighter"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              HAMMAM
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-2xl md:text-4xl text-gray-300 mb-8 font-light tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            HELLO, THIS IS HAMMAM PAGE
          </motion.p>

          {/* Decorative line */}
          <motion.div
            className="w-64 h-1 mx-auto mb-12 bg-gradient-to-r from-transparent via-neon-blue to-transparent"
            initial={{ width: 0 }}
            animate={{ width: 256 }}
            transition={{ duration: 1.5, delay: 0.8 }}
          />

          {/* Feature icons */}
          <motion.div
            className="flex justify-center gap-8 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
          >
            {[
              { icon: Cpu, label: 'NEURAL', color: 'text-neon-blue' },
              { icon: Globe, label: 'CONNECTED', color: 'text-neon-purple' },
              { icon: Rocket, label: 'INNOVATION', color: 'text-neon-pink' },
              { icon: Infinity, label: 'LIMITLESS', color: 'text-neon-green' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                className="flex flex-col items-center gap-2"
                whileHover={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <item.icon className={`w-8 h-8 ${item.color} animate-pulse-slow`} />
                <span className="text-xs text-gray-400 tracking-wider">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating text elements */}
          <div className="relative h-32">
            {['FUTURE', 'VISION', '2030', 'BEYOND'].map((text, index) => (
              <motion.span
                key={text}
                className="absolute text-sm text-gray-500 tracking-[0.5em] font-light"
                style={{
                  left: `${20 + index * 20}%`,
                  top: '50%',
                }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Number.MAX_SAFE_INTEGER,
                  delay: index * 0.5,
                }}
              >
                {text}
              </motion.span>
            ))}
          </div>

          {/* Bottom decorative elements */}
          <motion.div
            className="mt-16 flex justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-neon-blue"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.MAX_SAFE_INTEGER,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Corner decorations */}
        <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-neon-blue/50" />
        <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-neon-purple/50" />
        <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-neon-pink/50" />
        <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-neon-green/50" />

        {/* Scanning line */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: [
              'linear-gradient(transparent 0%, transparent 100%)',
              'linear-gradient(transparent 0%, rgba(0, 245, 255, 0.03) 50%, transparent 100%)',
              'linear-gradient(transparent 0%, transparent 100%)',
            ],
          }}
          transition={{
            duration: 4,
            repeat: Number.MAX_SAFE_INTEGER,
            ease: "linear",
          }}
        />
      </div>

      {/* Bottom status bar */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2, delay: 1 }}
      />
    </div>
  )
}
