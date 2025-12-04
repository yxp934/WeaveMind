'use client';

import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { Clock, TrendingUp, Users, Heart, BarChart3, Zap } from 'lucide-react';
import { RetroText } from './RetroText';

const benefits = [
  {
    icon: Clock,
    stat: '95%',
    label: 'Time Saved',
    description: 'Reduce preparation time from hours to minutes',
  },
  {
    icon: TrendingUp,
    stat: '87%',
    label: 'Better Engagement',
    description: 'Students show increased interest',
  },
  {
    icon: Users,
    stat: '10K+',
    label: 'Teachers',
    description: 'Educators trust our platform',
  },
  {
    icon: BarChart3,
    stat: '40%',
    label: 'Grade Improvement',
    description: 'Average increase in performance',
  },
  {
    icon: Heart,
    stat: '98%',
    label: 'Satisfaction',
    description: 'Teachers report better balance',
  },
  {
    icon: Zap,
    stat: '3s',
    label: 'Generation Time',
    description: 'From idea to complete materials',
  },
];

export function Benefits() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="benefits" className="relative py-24 bg-gradient-to-b from-[var(--color-light)] to-white overflow-hidden">
      {/* Animated Background Orb */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.05, 0.08, 0.05],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--color-primary)] blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl sm:text-5xl">
            <RetroText text="Measurable Impact" />
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real results from educators who have transformed their teaching with AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <BenefitCard key={index} benefit={benefit} index={index} inView={inView} />
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-20 p-12 rounded-xl bg-white border border-gray-200"
        >
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl text-gray-900">Why Teachers Love WeaveMind</h3>
              <ul className="space-y-4">
                {[
                  'Personalized content for every student level',
                  'Seamless integration with existing tools',
                  'Continuous learning and improvement',
                  'Dedicated support from education experts',
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="size-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-600">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '500K+', label: 'Lessons Created' },
                { value: '2M+', label: 'Students Impacted' },
                { value: '150+', label: 'Countries' },
                { value: '24/7', label: 'Support Available' },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                  className="p-6 rounded-lg bg-[var(--color-light)] border border-gray-200 text-center space-y-2"
                >
                  <div className="text-3xl text-[var(--color-primary)]">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit, index, inView }: { benefit: typeof benefits[0]; index: number; inView: boolean }) {
  const Icon = benefit.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-8 rounded-xl border border-gray-200 bg-white hover:border-[var(--color-primary)] transition-all duration-300 space-y-4"
    >
      <div className="flex items-start justify-between">
        <Icon className="size-8 text-[var(--color-primary)]" />
        <div className="text-right">
          <div className="text-4xl text-[var(--color-primary)]">
            {benefit.stat}
          </div>
          <div className="text-sm text-gray-500 mt-1">{benefit.label}</div>
        </div>
      </div>
      <p className="text-gray-600">{benefit.description}</p>
    </motion.div>
  );
}
