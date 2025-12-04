'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface AIShowcaseProps {
  isVisible: boolean;
  onNext: () => void;
}

export default function AIShowcase({ isVisible, onNext }: AIShowcaseProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [showStats, setShowStats] = useState(false);

  const steps = [
    {
      prompt: 'Create an interactive lesson about photosynthesis for 7th grade students',
      response: 'Generated: "The Journey of Photosynthesis - An Interactive Adventure" with 5 engaging chapters, quiz questions, and visual diagrams. Average engagement time: 18 minutes per student.'
    },
    {
      prompt: 'Add a practice problem set for advanced algebra',
      response: 'Created: 15 adaptive practice problems with step-by-step solutions and hints. 89% of students completed all problems with improved understanding.'
    },
    {
      prompt: 'Generate a final assessment for the unit on ecosystems',
      response: 'Designed: Comprehensive assessment with 20 questions, real-world scenarios, and automated grading. Average score improvement: 23% over traditional tests.'
    }
  ];

  useEffect(() => {
    if (isVisible && currentStep === 0) {
      setDisplayText('');
      setShowStats(false);
      const text = steps[0].response;
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowStats(true), 500);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isVisible, currentStep]);

  // Reset typing animation when step changes
  useEffect(() => {
    if (currentStep > 0) {
      setDisplayText('');
      setShowStats(false);
      const text = steps[currentStep].response;
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowStats(true), 500);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setDisplayText('');
      setShowStats(false);
    } else {
      onNext();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <span className="text-sm opacity-80">AI Course Generation Demo</span>
              </div>
              <div className="bg-white/20 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Teacher Prompt:</p>
                <p className="text-lg">{steps[currentStep].prompt}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
                  <p className="text-sm font-medium text-gray-600">AI is generating your content...</p>
                </div>

                <motion.div
                  className="bg-gray-50 rounded-lg p-6 min-h-[200px]"
                  key={currentStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-gray-800 text-lg leading-relaxed">
                    {displayText}
                    <motion.span
                      className="inline-block ml-1 w-0.5 h-6 bg-purple-600"
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </p>
                </motion.div>
              </div>

              <AnimatePresence>
                {showStats && (
                  <motion.div
                    className="grid grid-cols-3 gap-4 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">89%</p>
                      <p className="text-sm text-gray-600">Engagement Rate</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">23%</p>
                      <p className="text-sm text-gray-600">Score Improvement</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">18min</p>
                      <p className="text-sm text-gray-600">Avg. Completion</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={handleNext}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-medium hover:shadow-lg transition"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>{currentStep < steps.length - 1 ? 'Next Example' : 'See How It Works'}</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
