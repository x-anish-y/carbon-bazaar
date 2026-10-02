'use client';

import { motion } from 'framer-motion';

/**
 * SectionHeading — Small tracked-out eyebrow label + large serif heading.
 * Used across Problem, Solution, Farmers, Compliance sections.
 */
export default function SectionHeading({
  eyebrow,
  heading,
  description,
  align = 'left',
  light = false,
  className = '',
}) {
  const alignClass = align === 'center' ? 'text-center' : 'text-left';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`mb-12 md:mb-16 ${alignClass} ${className}`}
    >
      {eyebrow && (
        <span className={`eyebrow ${light ? 'text-wheat-gold/80' : ''}`}>
          {eyebrow}
        </span>
      )}
      <h2
        className={`font-display text-3xl sm:text-4xl md:text-5xl font-bold mt-3 leading-tight tracking-tight ${
          light ? 'text-white' : 'text-forest-dark'
        }`}
      >
        {heading}
      </h2>
      {description && (
        <p
          className={`mt-4 text-base md:text-lg max-w-2xl leading-relaxed ${
            light ? 'text-white/70' : 'text-muted'
          } ${align === 'center' ? 'mx-auto' : ''}`}
        >
          {description}
        </p>
      )}
    </motion.div>
  );
}
