'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Zap, Target } from 'lucide-react';

const steps = [
  {
    icon: BookOpen,
    title: 'Create Your Course',
    description: 'Enter your course topic and target grade level. Our AI understands your curriculum needs.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Users,
    title: 'AI Generates Content',
    description: 'Advanced AI agents create comprehensive lessons, interactive components, and assessments.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Zap,
    title: 'Review & Customize',
    description: 'Fine-tune the generated content with our intuitive editor. Add your personal touch.',
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    icon: Target,
    title: 'Launch & Monitor',
    description: 'Publish your course and track student progress with real-time analytics.',
    color: 'from-pink-500 to-pink-600'
  }
];

function StepCard({ step, index }: any) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
    >
      {/* Step number */}
      <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg z-10">
        {index + 1}
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow h-full">
        <motion.div
          className={`w-16 h-16 rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center mb-6`}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <step.icon className="w-8 h-8 text-white" />
        </motion.div>

        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {step.title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {step.description}
        </p>
      </div>

      {/* Connector line */}
      {index < steps.length - 1 && (
        <div className="hidden lg:block absolute top-6 left-full w-full h-0.5 bg-gradient-to-r from-purple-300 to-transparent z-0" />
      )}
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How WeaveMind Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your teaching with AI-powered course creation in just four simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
