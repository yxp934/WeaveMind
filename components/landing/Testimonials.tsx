'use client';

import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { Star } from 'lucide-react';
import { RetroText } from './RetroText';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'High School Science Teacher',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    content: 'EduAI has completely transformed how I prepare for classes. What used to take me 3-4 hours now takes minutes.',
    rating: 5,
  },
  {
    name: 'James Rodriguez',
    role: 'University Professor',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    content: 'The AI understands complex topics and generates materials that challenge students at the right level.',
    rating: 5,
  },
  {
    name: 'Emily Chen',
    role: 'Elementary School Teacher',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop',
    content: 'The personalized assignments it creates for each student\'s learning level are incredible.',
    rating: 5,
  },
  {
    name: 'Michael Thompson',
    role: 'Department Head',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    content: 'Teacher satisfaction is up, burnout is down, and student performance has never been better.',
    rating: 5,
  },
  {
    name: 'Dr. Lisa Park',
    role: 'Mathematics Instructor',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop',
    content: 'The AI-generated problem sets that adapt to student skill levels are revolutionary.',
    rating: 5,
  },
  {
    name: 'David Kumar',
    role: 'Language Arts Teacher',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
    content: 'Creating engaging literature discussions and writing prompts is now effortless.',
    rating: 5,
  },
];

export function Testimonials() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="testimonials" className="relative py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl sm:text-5xl">
            <RetroText text="Loved by Educators" />
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join thousands of teachers who are revolutionizing education with AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, index, inView }: { testimonial: typeof testimonials[0]; index: number; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-8 rounded-xl border border-gray-200 bg-white space-y-6"
    >
      {/* Rating */}
      <div className="flex gap-1">
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star key={i} className="size-5 fill-amber-400 text-amber-400" />
        ))}
      </div>

      {/* Content */}
      <p className="text-gray-600 leading-relaxed">{testimonial.content}</p>

      {/* Author */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="size-12 rounded-full object-cover"
        />
        <div>
          <div className="text-gray-900">{testimonial.name}</div>
          <div className="text-sm text-gray-500">{testimonial.role}</div>
        </div>
      </div>
    </motion.div>
  );
}
