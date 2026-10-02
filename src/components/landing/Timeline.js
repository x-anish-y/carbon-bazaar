'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

/**
 * Timeline — Horizontal numbered step strip with rich visual photo cards.
 * Guides sellers through registration, listing, negotiation, and settlement.
 */
export default function Timeline({ steps, className = '' }) {
  return (
    <div className={`${className}`}>
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:block">
        {/* Connecting line */}
        <div className="relative">
          <div className="absolute top-6 left-0 right-0 h-0.5 bg-[#1B4332]/20" />
          <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="text-center group"
              >
                {/* Step number circle */}
                <div className="relative z-10 mx-auto w-12 h-12 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-display text-lg font-bold mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  {i + 1}
                </div>

                {/* Photo card container */}
                <div className="mx-auto w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 bg-white border border-[#1B4332]/15 shadow-md relative group-hover:shadow-xl transition-all">
                  {step.image ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F17]/80 via-transparent to-transparent" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px]">
                          Step {i + 1}
                        </span>
                        <span className="text-lg">{step.icon}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1B4332]/10 via-[#606C38]/10 to-[#DDA15E]/15 flex items-center justify-center">
                      <span className="text-3xl">{step.icon}</span>
                    </div>
                  )}
                </div>

                <h4 className="font-display font-bold text-[#0B1F17] text-base mb-1.5">{step.title}</h4>
                <p className="text-zinc-600 text-xs leading-relaxed px-1">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Vertical layout */}
      <div className="md:hidden space-y-6">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex gap-4 p-4 bg-white rounded-2xl border border-[#1B4332]/10 shadow-sm"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#1B4332] text-white flex items-center justify-center font-display text-base font-bold shadow-md">
              {i + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{step.icon}</span>
                <h4 className="font-display font-bold text-[#0B1F17] text-sm">{step.title}</h4>
              </div>
              <p className="text-zinc-600 text-xs leading-relaxed">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
