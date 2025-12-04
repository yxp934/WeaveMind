'use client';

import { motion } from 'motion/react';
import { useInView } from 'react-intersection-observer';
import { ArrowRight, Mail } from 'lucide-react';
import { RetroText } from './RetroText';

export function CTA() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <>
      <section className="relative py-24 bg-gradient-to-b from-white to-[var(--color-light)] overflow-hidden">
        {/* Animated Background Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/4 w-96 h-96 rounded-full bg-[var(--color-primary)] opacity-8 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[var(--color-primary)] opacity-8 blur-3xl"
        />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="p-12 lg:p-16 rounded-xl bg-white border border-gray-200 space-y-8 text-center"
          >
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl">
                <RetroText text="Ready to Transform Your Teaching?" />
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Join 10,000+ educators who are saving time and improving student outcomes with AI-powered lesson planning.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/auth/signup"
                className="group px-8 py-4 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-all flex items-center gap-2"
              >
                <span>Start Your Free Trial</span>
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="px-8 py-4 rounded-lg border border-gray-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-light)] transition-all">
                Schedule a Demo
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="size-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="size-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="size-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gray-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                  <span className="text-white text-xl">E</span>
                </div>
                <span className="text-xl text-gray-900">EduAI</span>
              </div>
              <p className="text-sm text-gray-600">
                Revolutionizing education with artificial intelligence.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#features" className="hover:text-[var(--color-primary)] transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">API</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-[var(--color-primary)] transition-colors">Contact</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm text-gray-900">Stay Updated</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
                />
                <button className="p-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity">
                  <Mail className="size-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>© 2025 EduAI. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[var(--color-primary)] transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
