'use client';

import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { MessageCircle, Wand2, CheckCircle2, ArrowRight } from 'lucide-react';
import { RetroText } from './RetroText';

interface AIShowcaseProps {
  onNext: () => void;
}

export function AIShowcase({ onNext }: AIShowcaseProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const fullText = "I'll create a 15-slide presentation covering light reaction, dark reaction, and real-world applications. Including animations, diagrams, and quiz questions. Ready in 3 seconds...";

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => setShowSuccess(true), 500);
      }
    }, 30); // Adjust speed here (lower = faster)

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center py-24 bg-gradient-to-b from-white to-[var(--color-light)] overflow-hidden">
      {/* Animated Background Orb */}
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--color-primary)] opacity-5 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl sm:text-5xl">
            <RetroText text="Watch AI Create in Real-Time" />
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how AI collaborates with teachers to generate complete lessons in seconds
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* AI Conversation Demo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="space-y-4 p-6 rounded-xl bg-white border border-gray-200">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="size-5 text-gray-600" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-gray-500">Teacher</div>
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    I need a slideshow about photosynthesis for 9th graders. Make it engaging with visuals.
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex items-start gap-4"
              >
                <div className="size-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Wand2 className="size-5 text-white" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-sm text-gray-500">EduAI</div>
                  <div className="p-4 rounded-lg bg-[var(--color-light)] border border-[var(--color-primary)]/20 min-h-[100px]">
                    {displayedText}
                    {displayedText.length < fullText.length && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-0.5 h-4 bg-[var(--color-primary)] ml-1"
                      />
                    )}
                  </div>
                </div>
              </motion.div>

              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200"
                >
                  <CheckCircle2 className="size-5 text-green-600" />
                  <span className="text-green-700">Presentation created successfully!</span>
                </motion.div>
              )}
            </div>

            {showSuccess && (
              <div className="grid grid-cols-3 gap-4">
                {['15 Slides', '8 Diagrams', '5 Quizzes'].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="p-4 rounded-lg bg-white border border-gray-200 text-center"
                  >
                    <div className="text-2xl text-[var(--color-primary)]">
                      {item.split(' ')[0]}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.split(' ')[1]}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Generated Content Preview */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="relative aspect-video rounded-xl bg-white border border-gray-200 overflow-hidden"
            >
              {/* Slide Preview */}
              <div className="absolute inset-0 p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Slide 1 of 15</div>
                  <h3 className="text-3xl">
                    <RetroText text="Photosynthesis" />
                  </h3>
                  <p className="text-gray-600">Converting light energy into chemical energy</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square rounded-lg bg-green-50 border border-green-200 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="size-12 mx-auto rounded-full bg-green-200" />
                      <div className="text-xs text-gray-600">Light Reaction</div>
                    </div>
                  </div>
                  <div className="aspect-square rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="size-12 mx-auto rounded-full bg-blue-200" />
                      <div className="text-xs text-gray-600">Dark Reaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                <div className="p-4 rounded-lg bg-white border border-gray-200 space-y-2">
                  <div className="text-sm text-gray-600">Schedule</div>
                  <div className="space-y-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="h-2 bg-[var(--color-primary)]/20 rounded-full"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '50%' }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="h-2 bg-[var(--color-primary)]/20 rounded-full"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '66%' }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="h-2 bg-[var(--color-primary)]/20 rounded-full"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-white border border-gray-200 space-y-2">
                  <div className="text-sm text-gray-600">Assignments</div>
                  <div className="space-y-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '66%' }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="h-2 bg-[var(--color-primary)]/20 rounded-full"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="h-2 bg-[var(--color-primary)]/20 rounded-full"
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '50%' }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="h-2 bg-[var(--color-primary)]/20 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Next Button */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex justify-center mt-12"
          >
            <button
              onClick={onNext}
              className="group px-8 py-4 rounded-lg bg-[var(--color-primary)] hover:opacity-90 transition-all flex items-center gap-2"
            >
              <RetroText text="Next" />
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform text-white" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
