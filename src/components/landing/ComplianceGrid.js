'use client';

import { motion } from 'framer-motion';

/**
 * ComplianceGrid — Airy icon+label grid with minimal borders.
 * Used for the Compliance section.
 */
export default function ComplianceGrid({ items, className = '' }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${className}`}>
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="group p-5 md:p-6 rounded-xl bg-white/60 hover:bg-white hover:shadow-lg hover:shadow-forest/5 transition-all duration-300 border border-forest/5 hover:border-forest/15"
        >
          <div className="w-10 h-10 rounded-lg bg-forest/10 flex items-center justify-center mb-4 group-hover:bg-forest group-hover:text-white transition-colors duration-300">
            <span className="text-lg">{item.icon}</span>
          </div>
          <h4 className="font-semibold text-forest-dark text-sm mb-1.5">{item.title}</h4>
          <p className="text-muted text-xs leading-relaxed">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
