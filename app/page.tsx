'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/landing/Navigation';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Benefits from '@/components/landing/Benefits';
import CTA from '@/components/landing/CTA';

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const currentProgress = window.scrollY;
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      if (scrollHeight) {
        setScrollProgress((currentProgress / scrollHeight) * 100);
      }
    };

    // Update progress on scroll
    window.addEventListener('scroll', updateScrollProgress);
    // Initial update
    updateScrollProgress();

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
    };
  }, []);

  // Update CSS custom properties based on scroll progress
  useEffect(() => {
    const hue = Math.min(280 + scrollProgress * 0.5, 320);
    const lightness = Math.max(85 - scrollProgress * 0.2, 70);
    document.documentElement.style.setProperty('--color-primary', `hsl(${hue}, 85%, 60%)`);
    document.documentElement.style.setProperty('--color-light', `hsl(${hue}, 85%, ${lightness}%)`);
  }, [scrollProgress]);

  return (
    <div className="relative min-h-screen">
      <Navigation />
      <Hero />
      <HowItWorks />
      <Benefits />
      <CTA />
    </div>
  );
}
