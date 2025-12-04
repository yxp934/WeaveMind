'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RetroText } from './RetroText';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="text-3xl">
            <RetroText text="WeaveMind" />
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/auth/login"
              className="px-4 py-2 text-gray-600 hover:text-[var(--color-primary)] transition font-medium"
            >
              Login
            </a>
            <a
              href="/auth/signup"
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition font-medium"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
