'use client';

import { motion } from 'framer-motion';
import { MEDIA } from '@/config/media';

/**
 * StatPanel — "Real Climate Impact" panel backed by ambient twilight video loop.
 */
export default function StatPanel({ stats, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-3xl bg-[#0B1F17] shadow-2xl border border-white/15 ${className}`}
    >
      {/* High-Clarity Ambient Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster={MEDIA.solution.poster}
          className="w-full h-full object-cover opacity-70 filter brightness-95 saturate-150 scale-105"
        >
          <source src={MEDIA.solution.video} type="video/mp4" />
        </video>
        {/* Soft vignette to guarantee metric legibility while letting the video shine */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F17] via-[#0B1F17]/65 to-[#0B1F17]/35" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-8 md:p-10">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-[#DDA15E] text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            Impact Metrics
          </span>
          <span className="text-white/90 text-xs font-semibold px-3 py-1 rounded-full bg-[#1B4332]/80 backdrop-blur-md border border-white/15">
            🌍 Carbon Mitigation
          </span>
        </div>

        <h3 className="font-display text-2xl md:text-3xl font-bold text-white mt-3 mb-6 drop-shadow-md">
          Real Climate Impact
        </h3>

        <div className="grid grid-cols-2 gap-4 md:gap-5">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="p-5 rounded-2xl bg-[#0B1F17]/75 border border-white/20 backdrop-blur-md hover:bg-[#0B1F17]/85 transition-all shadow-lg"
            >
              <p className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-sm">
                {stat.value}
              </p>
              <p className="text-white/90 text-xs sm:text-sm mt-1.5 font-semibold">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
