'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hero } from '@/components/landing/Hero';
import { AIShowcase } from '@/components/landing/AIShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Benefits } from '@/components/landing/Benefits';
import { Testimonials } from '@/components/landing/Testimonials';
import { CTA } from '@/components/landing/CTA';
import { Navigation } from '@/components/landing/Navigation';

export default function Home() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showAIShowcase, setShowAIShowcase] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = scrolled / documentHeight;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic color palette based on scroll - lighter greens
  const getColorPalette = (progress: number) => {
    if (progress < 0.25) {
      return {
        primary: '#3fa11b',
        light: '#e8f4e4',
      };
    } else if (progress < 0.5) {
      return {
        primary: '#2d8a15',
        light: '#f0f9ec',
      };
    } else if (progress < 0.75) {
      return {
        primary: '#45b525',
        light: '#e3f5df',
      };
    } else {
      return {
        primary: '#3fa11b',
        light: '#ecf7e9',
      };
    }
  };

  const palette = getColorPalette(scrollProgress);

  const handleClickDemo = () => {
    setShowAIShowcase(true);
  };

  const handleNext = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-white text-gray-900 overflow-x-hidden">
      <style>{`
        :root {
          --color-primary: ${palette.primary};
          --color-light: ${palette.light};
        }
        body {
          overflow-x: hidden;
        }
      `}</style>

      <Navigation />

      <AnimatePresence mode="wait">
        {!showAIShowcase ? (
          <motion.div
            key="hero"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <Hero onClickDemo={handleClickDemo} />
          </motion.div>
        ) : (
          <motion.div
            key="showcase"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <AIShowcase onNext={handleNext} />
          </motion.div>
        )}
      </AnimatePresence>

      {showAIShowcase && (
        <div ref={howItWorksRef}>
          <HowItWorks />
          <Benefits />
          <Testimonials />
          <CTA />
        </div>
      )}
    </div>
  );
}
