'use client';

import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { MessageSquare, Sparkles, Download, CheckCircle } from 'lucide-react';
import { RetroText } from './RetroText';

const steps = [
  {
    icon: MessageSquare,
    title: 'Discuss Your Needs',
    description: 'Have a natural conversation with AI about your teaching goals and student requirements.',
  },
  {
    icon: Sparkles,
    title: 'AI Generates Content',
    description: 'Watch as AI creates slides, schedules, and assignments tailored to your specifications in seconds.',
  },
  {
    icon: CheckCircle,
    title: 'Review & Customize',
    description: 'Review the generated content and make adjustments. AI learns from your preferences.',
  },
  {
    icon: Download,
    title: 'Deploy & Teach',
    description: 'Export your materials in any format and share with students. Focus on teaching.',
  },
];

export function HowItWorks() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="how-it-works" className="relative py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-20"
        >
          <h2 className="text-4xl sm:text-5xl">
            <RetroText text="How It Works" />
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From conversation to complete curriculum in four simple steps
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ step, index, inView }: { step: typeof steps[0]; index: number; inView: boolean }) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="relative"
    >
      <div className="relative p-8 rounded-xl border border-gray-200 bg-white space-y-4">
        {/* Step Number */}
        <div className="absolute -top-4 -left-4 size-12 rounded-full bg-white border-2 border-[var(--color-primary)] flex items-center justify-center">
          <span className="text-xl text-[var(--color-primary)]">{index + 1}</span>
        </div>

        {/* Icon */}
        <div className="inline-flex p-3 rounded-lg bg-[var(--color-primary)]">
          <Icon className="size-6 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-xl text-gray-900">{step.title}</h3>
        <p className="text-gray-600 leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
}
