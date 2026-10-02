'use client';

import { motion } from 'framer-motion';

/**
 * PlaceholderImage — Warm-toned photo placeholder with gradient overlay.
 * Ready for real image drop-in later via the `src` prop.
 */
export default function PlaceholderImage({
  aspect = '16/9',
  className = '',
  alt = 'Placeholder',
  gradient = 'from-forest-dark/40 via-forest/20 to-wheat-gold/10',
  bgColor = 'bg-forest-muted',
  children,
  src,
}) {
  return (
    <div
      className={`relative overflow-hidden ${bgColor} ${className}`}
      style={{ aspectRatio: aspect }}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      {children && (
        <div className="relative z-10 flex items-center justify-center h-full">
          {children}
        </div>
      )}
    </div>
  );
}
