'use client';

import { motion } from 'motion/react';
import { ArrowRight, MessageCircle, Wand2 } from 'lucide-react';
import { RetroText } from './RetroText';

interface HeroProps {
  onClickDemo: () => void;
}

export function Hero({ onClickDemo }: HeroProps) {
  const handleSectionClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking the Start Free Trial button
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-trigger]')) {
      return;
    }
    onClickDemo();
  };

  return (
    <section
      onClick={handleSectionClick}
      className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-light)] to-white" />

      {/* Animated Background Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[var(--color-primary)] opacity-10 blur-3xl"
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--color-primary)] opacity-10 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side - Title and CTA */}
          <div className="relative z-20 space-y-8 -mt-20 lg:-mt-28">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl leading-tight"
            >
              <div>
                <RetroText text="Intelligent Content." />
              </div>
              <div>
                <RetroText text="Woven." />
              </div>
            </motion.h1>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200"
            >
              <div className="size-2 rounded-full bg-[var(--color-primary)]" />
              <span className="text-sm text-gray-600">AI-Powered Learning Management</span>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 leading-relaxed"
            >
              WeaveMind bridges the gap between teaching and learning through AI-driven content creation. We empower educators to design high-quality materials efficiently, while enabling students to navigate personalized learning paths that adapt to their unique needs.
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <a
                href="/auth/signup"
                data-no-trigger
                className="group px-8 py-4 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-all flex items-center gap-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </div>

          {/* Right Side - AI Chat Demo */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative z-10 space-y-4"
          >
            <div className="space-y-4 p-6 rounded-xl bg-white border border-gray-200 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="size-5 text-gray-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-gray-500">Teacher</div>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    I need a slideshow about photosynthesis for 9th graders. Make it engaging with visuals.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 opacity-40">
                <div className="size-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Wand2 className="size-5 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-gray-500">EduAI</div>
                  <div className="p-4 rounded-lg bg-[var(--color-light)] border border-[var(--color-primary)]/20">
                    I will create a 15-slide presentation covering light reaction, dark reaction, and real-world applications...
                  </div>
                </div>
              </div>

              {/* Click Me Button */}
              <div className="pt-4 text-center">
                <motion.button
                  onClick={onClickDemo}
                  animate={{
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(63, 161, 27, 0)',
                      '0 0 0 10px rgba(63, 161, 27, 0)',
                      '0 0 0 0 rgba(63, 161, 27, 0)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="group px-8 py-4 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
                >
                  <span>Click Me</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ArrowRight className="size-5" />
                  </motion.div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
