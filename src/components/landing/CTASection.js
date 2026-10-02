'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { MEDIA } from '@/config/media';

/**
 * CTASection — Full-bleed closing section with high-visibility ambient video loop.
 */
export default function CTASection({
  heading = "Ready to Scale Impact?",
  description,
  primaryCTA = { label: 'Get Started', href: '/register' },
  secondaryCTA = { label: 'Contact Sales', href: 'mailto:partnerships@carbonbazaar.in' },
  children,
  className = '',
}) {
  return (
    <section className={`relative overflow-hidden py-24 md:py-32 bg-[#0B1F17] ${className}`}>
      {/* High-Visibility Ambient Background Video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={MEDIA.cta.poster}
          className="w-full h-full object-cover opacity-55 filter brightness-95 saturate-125 scale-105"
        >
          <source src={MEDIA.cta.video} type="video/mp4" />
        </video>
        {/* Soft gradient overlay for text readability without washing out the video */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F17]/95 via-[#0B1F17]/65 to-[#0B1F17]/85" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight drop-shadow-md"
        >
          {heading}
        </motion.h2>
        
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 text-white/90 text-base md:text-lg leading-relaxed max-w-xl mx-auto drop-shadow-sm font-medium"
          >
            {description}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            href={primaryCTA.href}
            className="btn-pill bg-white !text-[#0B1F17] hover:bg-[#FEFAE0] font-bold shadow-xl shadow-black/30"
          >
            {primaryCTA.label}
          </Link>
          {secondaryCTA && (
            <Link
              href={secondaryCTA.href}
              className="btn-pill btn-pill-ghost-white font-semibold shadow-lg"
            >
              {secondaryCTA.label}
            </Link>
          )}
        </motion.div>

        {children}
      </div>
    </section>
  );
}
