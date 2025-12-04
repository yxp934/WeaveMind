'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import AIShowcase from './AIShowcase';

export default function Hero() {
  const [showAIShowcase, setShowAIShowcase] = useState(false);

  return (
    <>
      <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-b from-purple-50 to-white">
        {/* Animated background spheres */}
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, -40, 0],
            scale: [1, 0.8, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />

        <div className="container mx-auto px-6 py-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.h1
                className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                AI-Powered
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent block">
                  Learning Made Simple
                </span>
              </motion.h1>

              <motion.p
                className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Create engaging courses in minutes with our intelligent AI assistant.
               因材织学 - Personalized education for every student.
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Link
                  href="/auth/signup"
                  className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-xl transition flex items-center justify-center space-x-2"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </Link>
                <button
                  onClick={() => setShowAIShowcase(true)}
                  className="group px-8 py-4 bg-white text-purple-600 border-2 border-purple-600 rounded-xl font-semibold text-lg hover:bg-purple-50 transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>See It In Action</span>
                </button>
              </motion.div>

              <motion.div
                className="mt-12 flex items-center space-x-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">50K+</div>
                  <div className="text-gray-600">Teachers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">1M+</div>
                  <div className="text-gray-600">Courses Created</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">200+</div>
                  <div className="text-gray-600">Schools</div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right side - AI Demo */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <motion.div
                className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100"
                whileHover={{ y: -10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-4 text-sm text-gray-500">AI Course Generator</span>
                </div>

                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-600">
                    <p className="text-sm text-gray-600 mb-2">Teacher Input:</p>
                    <p className="text-gray-900">Create an interactive lesson about photosynthesis for 7th grade students...</p>
                  </div>

                  <motion.div
                    className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-600"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                  >
                    <p className="text-sm text-gray-600 mb-2">AI is thinking...</p>
                    <div className="flex space-x-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-blue-600 rounded-full"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-600">
                    <p className="text-sm text-gray-600 mb-2">Generated:</p>
                    <p className="text-gray-900">The Journey of Photosynthesis - 5 chapters, interactive diagrams, quiz questions...</p>
                  </div>
                </div>

                <motion.button
                  onClick={() => setShowAIShowcase(true)}
                  className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Click Me for Demo
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <AIShowcase
        isVisible={showAIShowcase}
        onNext={() => setShowAIShowcase(false)}
      />
    </>
  );
}
