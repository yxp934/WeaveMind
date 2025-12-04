'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface RetroTextProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  fontSize?: string;
}

export default function RetroText({
  children,
  className = '',
  color = '#9333EA',
  fontSize = 'text-6xl'
}: RetroTextProps) {
  return (
    <div className={`relative inline-block ${fontSize} font-black ${className}`}>
      {/* Background layers for retro effect */}
      <motion.div
        className="absolute inset-0 blur-md opacity-30"
        style={{ color }}
        initial={{ x: -10, y: -10 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.div>

      <motion.div
        className="absolute inset-0 blur-sm opacity-50"
        style={{ color }}
        initial={{ x: -5, y: -5 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {children}
      </motion.div>

      {/* Main text */}
      <motion.div
        className="relative z-10"
        initial={{ x: 0, y: 0 }}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
