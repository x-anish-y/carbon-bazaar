'use client';

import Link from 'next/link';

/**
 * LandingFooter — Dark charcoal-green footer with minimal columns and thin dividers.
 * Matches the Stitch redesign footer aesthetic.
 */
export default function LandingFooter() {
  return (
    <footer className="bg-[#0B1F17] text-white/70 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center justify-center border border-white/10 shadow-sm">
                <span className="text-base text-white">🌾</span>
              </div>
              <span className="font-display text-xl font-bold text-white">Carbon Bazaar</span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Built for India&apos;s climate future. Connecting agricultural sellers directly to the national carbon economy.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-[#DDA15E] mb-4">
              Platform
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/marketplace" className="hover:text-white transition-colors">
                  Carbon Marketplace
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Seller Registration
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Enterprise Buyer Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-[#DDA15E] mb-4">
              Resources
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#problem" className="hover:text-white transition-colors">
                  The Problem
                </a>
              </li>
              <li>
                <a href="#solution" className="hover:text-white transition-colors">
                  Our Solution
                </a>
              </li>
              <li>
                <a href="#sellers" className="hover:text-white transition-colors">
                  Seller Stories & Impact
                </a>
              </li>
              <li>
                <a href="#compliance" className="hover:text-white transition-colors">
                  National Compliance
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold tracking-[0.18em] uppercase text-[#DDA15E] mb-4">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:partnerships@carbonbazaar.in" className="hover:text-white transition-colors">
                  Contact Partnerships
                </a>
              </li>
              <li>
                <a href="mailto:support@carbonbazaar.in" className="hover:text-white transition-colors">
                  Support & Verification Desk
                </a>
              </li>
              <li>
                <span className="inline-block px-3 py-1 bg-white/10 text-white/90 text-xs rounded-full border border-white/15">
                  🇮🇳 Made in India
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider + Copyright */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/50">
            © 2026 Carbon Bazaar India. Built for India&apos;s climate future.
          </p>
          <div className="flex gap-6 text-xs text-white/50">
            <span className="hover:text-white/80 transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white/80 transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-white/80 transition-colors cursor-pointer">Security Ledger</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
