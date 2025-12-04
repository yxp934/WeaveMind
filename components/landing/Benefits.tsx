'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, Users, Award, BookOpen, Zap } from 'lucide-react';

const stats = [
  {
    icon: Clock,
    value: '10x',
    label: 'Faster Course Creation',
    description: 'Generate complete lessons in minutes, not hours'
  },
  {
    icon: TrendingUp,
    value: '85%',
    label: 'Student Engagement',
    description: 'Interactive components boost participation'
  },
  {
    icon: Users,
    value: '50K+',
    label: 'Active Teachers',
    description: 'Educators trust WeaveMind worldwide'
  },
  {
    icon: Award,
    value: '95%',
    label: 'Satisfaction Rate',
    description: 'Teachers love the ease and quality'
  },
  {
    icon: BookOpen,
    value: '1M+',
    label: 'Courses Created',
    description: 'Vast library of AI-generated content'
  },
  {
    icon: Zap,
    value: '24/7',
    label: 'AI Assistant',
    description: 'Round-the-clock educational support'
  }
];

const additionalStats = [
  { value: '200+', label: 'Schools' },
  { value: '4.9/5', label: 'User Rating' },
  { value: '50+', label: 'Subjects' },
  { value: '30+', label: 'Countries' }
];

function StatCard({ icon: Icon, value, label, description, delay = 0 }: any) {
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
      <motion.div
        className="w-16 h-16 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center mb-6"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-8 h-8 text-white" />
      </motion.div>

      <motion.div
        className="text-5xl font-bold text-white mb-2"
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: delay + 0.3 }}
      >
        {value}
      </motion.div>

      <h3 className="text-xl font-semibold text-white mb-2">
        {label}
      </h3>
      <p className="text-gray-300">
        {description}
      </p>
    </motion.div>
  );
}

export default function Benefits() {
  return (
    <section id="benefits" className="py-24 bg-gray-900 relative overflow-hidden">
      {/* Animated background spheres */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Empowering Educators Worldwide
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Join thousands of teachers who are transforming education with AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              description={stat.description}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Additional stats */}
        <motion.div
          className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-8 border border-white/20 backdrop-blur-lg"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {additionalStats.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {item.value}
                </div>
                <div className="text-gray-300">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
