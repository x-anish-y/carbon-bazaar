'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SectionHeading,
  StatPanel,
  Timeline,
  ComplianceGrid,
  CTASection,
  LandingFooter,
} from '@/components/landing';
import { MEDIA } from '@/config/media';

/* ═══════════════════════════════════════════════════════════════
   Homepage — Carbon Bazaar
   Integrated with user-specified photography & video assets
   ═══════════════════════════════════════════════════════════════ */

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data) setUser(data.data);
        })
        .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    document.cookie = 'authToken=; path=/; max-age=0;';
    setUser(null);
    router.refresh();
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  const getDashboardLink = () => {
    if (user?.role === 'ADMIN') return '/admin/dashboard';
    if (user?.role === 'BUYER' || user?.role === 'COMPANY') return '/buyer/dashboard';
    return '/seller/dashboard';
  };

  /* ─── Animation variants ─── */
  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  };

  const stagger = {
    animate: { transition: { staggerChildren: 0.12 } },
  };

  return (
    <div className="w-full bg-[#FAF8F2] text-[#0B1F17]">
      {/* ═══════════════════════════════════════════════
          Navigation
          ═══════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-[#FAF8F2]/90 backdrop-blur-xl border-b border-[#1B4332]/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#1B4332] flex items-center justify-center shadow-md">
              <span className="text-sm text-white">🌾</span>
            </div>
            <span className="font-display text-xl font-bold text-[#0B1F17]">Carbon Bazaar</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/marketplace" className="text-sm font-semibold text-[#1B4332] hover:text-[#0B1F17] transition-colors">
              Marketplace
            </Link>
            <a href="#problem" className="text-sm font-medium text-zinc-600 hover:text-[#0B1F17] transition-colors">
              Problem
            </a>
            <a href="#solution" className="text-sm font-medium text-zinc-600 hover:text-[#0B1F17] transition-colors">
              Solution
            </a>
            <a href="#sellers" className="text-sm font-medium text-zinc-600 hover:text-[#0B1F17] transition-colors">
              Sellers
            </a>
            <a href="#compliance" className="text-sm font-medium text-zinc-600 hover:text-[#0B1F17] transition-colors">
              Compliance
            </a>
          </div>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href={getDashboardLink()} className="btn-pill btn-pill-solid text-xs !py-2.5 !px-5 shadow-sm">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs font-medium text-zinc-500 hover:text-[#0B1F17] transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-zinc-600 hover:text-[#0B1F17] transition-colors">
                  Login
                </Link>
                <Link href="/register" className="btn-pill btn-pill-solid text-xs !py-2.5 !px-5 shadow-sm">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center"
          >
            <div className="space-y-1.5">
              <span className={`block w-5 h-0.5 bg-[#0B1F17] transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-[#0B1F17] transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-[#0B1F17] transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden bg-[#FAF8F2] border-t border-[#1B4332]/10"
            >
              <div className="px-6 py-4 space-y-3">
                <Link href="/marketplace" className="block text-sm font-semibold text-[#1B4332]" onClick={() => setMobileMenuOpen(false)}>Marketplace</Link>
                <a href="#problem" className="block text-sm text-zinc-600" onClick={() => setMobileMenuOpen(false)}>Problem</a>
                <a href="#solution" className="block text-sm text-zinc-600" onClick={() => setMobileMenuOpen(false)}>Solution</a>
                <a href="#sellers" className="block text-sm text-zinc-600" onClick={() => setMobileMenuOpen(false)}>Sellers</a>
                <a href="#compliance" className="block text-sm text-zinc-600" onClick={() => setMobileMenuOpen(false)}>Compliance</a>
                <div className="pt-3 border-t border-[#1B4332]/10 flex gap-3">
                  {user ? (
                    <Link href={getDashboardLink()} className="btn-pill btn-pill-solid text-xs !py-2 flex-1 text-center">Dashboard</Link>
                  ) : (
                    <>
                      <Link href="/login" className="btn-pill btn-pill-ghost text-xs !py-2 flex-1 text-center">Login</Link>
                      <Link href="/register" className="btn-pill btn-pill-solid text-xs !py-2 flex-1 text-center">Register</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ═══════════════════════════════════════════════
          Hero Section — Farmland Drone Video (99867-658725791_medium.mp4)
          ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#0B1F17]">
        {/* High-Clarity Farmland Drone Ambient Video */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={MEDIA.hero.poster}
            className="w-full h-full object-cover opacity-85 filter brightness-100 saturate-125"
          >
            <source src={MEDIA.hero.video} type="video/mp4" />
          </video>
          
          {/* Directional scrim: dark on left for text legibility, open and transparent on right to showcase aerial farm video */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F17] via-[#0B1F17]/80 md:via-[#0B1F17]/65 to-transparent z-[1]" />
          <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#FAF8F2] via-[#FAF8F2]/40 to-transparent z-[2]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 md:py-32 w-full">
          <motion.div
            initial="initial"
            animate="animate"
            variants={stagger}
            className="max-w-2xl"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-semibold mb-6 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              National Regulated Carbon Registry
            </motion.div>
            
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight drop-shadow-lg"
            >
              Connecting Indian Sellers to the Carbon Economy
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-6 text-base sm:text-lg text-white/90 leading-relaxed max-w-lg drop-shadow-md font-medium"
            >
              A regulated, transparent marketplace for high-quality carbon credits from Indian regenerative sellers. Scale impact. Meet compliance.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Link href="/marketplace" className="btn-pill bg-white text-[#0B1F17] font-bold hover:bg-[#FEFAE0] transition-colors shadow-2xl">
                Browse Credits
              </Link>
              <button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-pill btn-pill-ghost-white font-semibold shadow-lg"
              >
                Learn More
              </button>
            </motion.div>
          </motion.div>

          {/* Stat strip */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 flex flex-wrap gap-8 md:gap-16"
          >
            {[
              { icon: '🌾', value: '500+', label: 'Sellers' },
              { icon: '🌍', value: '2.5M', label: 'tCO2e Sequestered' },
              { icon: '₹', value: '₹250Cr+', label: 'Carbon Trade Volume' },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <span className="font-display text-2xl md:text-3xl font-extrabold text-white">{stat.value}</span>
                  {stat.label && <span className="ml-2 text-xs text-white/80 font-medium">{stat.label}</span>}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Problem Section — High-Definition Photo Cards
          ═══════════════════════════════════════════════ */}
      <section id="problem" className="py-20 md:py-28 bg-[#FAF8F2]">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Problem"
            heading="The Challenge: India's Carbon Credit Gap"
          />

          <div className="grid gap-8 md:grid-cols-3">
            {/* Card 1: Fragmented Market (Farmers Reviewing Data) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl overflow-hidden border border-[#1B4332]/10 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
            >
              {/* Full-Color Photo Container */}
              <div className="relative w-full h-52 overflow-hidden">
                <Image
                  src={MEDIA.problem.fragmentedMarket.image}
                  alt={MEDIA.problem.fragmentedMarket.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 filter saturate-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                    Market Inefficiency
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <span className="text-white font-bold text-sm drop-shadow-md">Data Disconnection</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#0B1F17] mb-2">
                    Fragmented Market
                  </h3>
                  <p className="text-zinc-600 text-xs leading-relaxed">
                    No unified platform for Indian agricultural carbon credits. Sellers lack access to buyers. Buyers struggle to source verified credits.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-[#1B4332]">
                  <span>High Transaction Friction</span>
                  <span>→</span>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Regulatory Uncertainty (Power Plant & Grid) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl overflow-hidden border border-[#1B4332]/10 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
            >
              {/* Full-Color Photo Container */}
              <div className="relative w-full h-52 overflow-hidden">
                <Image
                  src={MEDIA.problem.regulatoryUncertainty.image}
                  alt={MEDIA.problem.regulatoryUncertainty.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 filter saturate-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                    Compliance Barrier
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <span className="text-white font-bold text-sm drop-shadow-md">Industrial Grid</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#0B1F17] mb-2">
                    Regulatory Uncertainty
                  </h3>
                  <p className="text-zinc-600 text-xs leading-relaxed">
                    Inconsistent standards of measurement and complex compliance. Multiple approval layers slow down carbon credit verification.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-[#606C38]">
                  <span>Complex Verification</span>
                  <span>→</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Seller Exclusion (Rupee Bag / Agricultural Earnings) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-3xl overflow-hidden border border-[#1B4332]/10 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group"
            >
              {/* Full-Color Photo Container */}
              <div className="relative w-full h-52 overflow-hidden">
                <Image
                  src={MEDIA.problem.sellerExclusion.image}
                  alt={MEDIA.problem.sellerExclusion.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700 filter saturate-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                    Financial Gap
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  <span className="text-white font-bold text-sm drop-shadow-md">Monetization Gap</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#0B1F17] mb-2">
                    Seller Exclusion
                  </h3>
                  <p className="text-zinc-600 text-xs leading-relaxed">
                    Locked out of the market; smallholder sellers cannot easily access sustainable practices to generate monetizable carbon credits.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-[#DDA15E]">
                  <span>Smallholders Left Out</span>
                  <span>→</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Solution Section — Split layout with checklist + StatPanel (Video 199788-911378451_small.mp4)
          ═══════════════════════════════════════════════ */}
      <section id="solution" className="py-20 md:py-28 bg-[#F4F0E6]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left: StatPanel with Ambient Twilight Video */}
            <StatPanel
              stats={[
                { value: '5M+', label: 'tCO2e Sequestered' },
                { value: '₹500Cr+', label: 'Seller Income Generated' },
                { value: '50+', label: 'Buyers Compliant' },
                { value: '1,000+', label: 'Sellers Onboarded' },
              ]}
            />

            {/* Right: Solution checklist */}
            <div>
              <SectionHeading
                eyebrow="Solution"
                heading="Carbon Bazaar"
                description="A Regulated Digital Marketplace"
              />

              <ul className="space-y-5">
                {[
                  { title: 'India-First Design', desc: 'Built for Indian agriculture, policies, and compliance frameworks' },
                  { title: 'Seller-Friendly Interface', desc: 'Simple onboarding. Real-time pricing. Direct buyer connections.' },
                  { title: 'Transparent Pricing', desc: 'INR-based, INR-denominated. ₹700–₹1,200 per tCO2e price discovery' },
                  { title: 'Verified Methodologies', desc: 'Regenerative agriculture, crop rotation, agroforestry, conservation tillage' },
                  { title: 'Buyer Adoption Ready', desc: 'Enterprise corporate off-takers accessing credits for compliance' },
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-[#1B4332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-[#0B1F17] text-sm">{item.title}</h4>
                      <p className="text-zinc-600 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Seller Journey — Timeline + Portrait Testimonial
          ═══════════════════════════════════════════════ */}
      <section id="sellers" className="py-20 md:py-28 bg-[#FAF8F2]">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Seller Enablement: Economic Opportunity"
            heading="The Seller Journey"
            description="From registration to economic empowerment — a step-by-step path for Indian sellers."
          />

          <Timeline
            steps={[
              {
                icon: '📝',
                title: 'Register & Verify',
                description: 'Simple KYC, land parcel details, crop type verification',
                image: MEDIA.timeline.step1.image,
              },
              {
                icon: '📊',
                title: 'List Credits',
                description: 'Tokenize verified credits with on-chain provenance',
                image: MEDIA.timeline.step2.image,
              },
              {
                icon: '🤝',
                title: 'Receive Offers',
                description: 'Compare transparent bids from enterprise off-takers',
                image: MEDIA.timeline.step3.image,
              },
              {
                icon: '💰',
                title: 'Settle & Scale',
                description: 'Direct INR payments with automated instant settlement',
                image: MEDIA.timeline.step4.image,
              },
            ]}
            className="mb-16"
          />

          {/* Benefits Realized Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl bg-white border border-[#1B4332]/10 p-8 sm:p-10 shadow-xl"
          >
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7">
                <span className="eyebrow mb-1">Economic & Ecological Value</span>
                <h4 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F17] mb-4">
                  Benefits Realized for Indian Sellers
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Additional revenue stream (₹700–₹1,200/tCO2e)',
                    'Reduced fertilizer costs via conservation tillage',
                    'Enhanced long-term soil health & crop yield',
                    'Direct bank transfer with guaranteed settlement',
                    'Active contribution to India\'s 2070 Net-Zero goal',
                    'Transparent registry verification & tracking',
                  ].map((benefit, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="w-5 h-5 rounded-full bg-[#1B4332]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-[#1B4332]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs sm:text-sm text-zinc-600 font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#FAF8F2] rounded-2xl p-6 sm:p-8 border border-[#1B4332]/10 flex flex-col justify-between text-center">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#1B4332] text-white flex items-center justify-center mx-auto text-xl mb-3 shadow-md">
                    🌾
                  </div>
                  <h5 className="font-display text-xl font-bold text-[#0B1F17] mb-1">Start Monetizing Your Land</h5>
                  <p className="text-zinc-500 text-xs leading-relaxed max-w-xs mx-auto">
                    Join hundreds of Indian sellers earning carbon revenue from sustainable agricultural practices.
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    href="/register"
                    className="btn-pill btn-pill-solid w-full text-center block text-xs !py-3.5 font-bold shadow-md"
                  >
                    Join as Seller →
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          Compliance Section — Airy grid
          ═══════════════════════════════════════════════ */}
      <section id="compliance" className="py-20 md:py-28 bg-[#F4F0E6]">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Compliance"
            heading="Meeting India's Standards"
            description="Built-in regulatory alignment across all Indian states and territories."
          />

          <ComplianceGrid
            items={[
              { icon: '🏛️', title: 'State Alignment', description: 'All 28 states + 8 UTs supported. State-specific regulations enforced at the platform level.' },
              { icon: '🔬', title: 'Methodological Rigor', description: '4 verified methodologies: regenerative agriculture, crop rotation, agroforestry, conservation tillage.' },
              { icon: '₹', title: 'Currency & Units', description: 'INR only. tCO2e exclusively. No currency arbitrage. No unit mismatches.' },
              { icon: '📅', title: 'Monthly Cycles', description: 'Compliance tracking in YYYY-MM format. Audit trails. Transaction history.' },
              { icon: '👁️', title: 'Admin Oversight', description: 'Seller verification workflows. Listing approval gates. Transaction monitoring.' },
              { icon: '🔒', title: 'Data Security', description: 'MongoDB encryption. JWT authentication. Role-based access control.' },
              { icon: '📋', title: 'Audit Ready', description: 'Complete transaction ledger. Seller profiles. Methodology tracking.' },
              { icon: '🚀', title: 'Scalability', description: 'Designed for 10,000+ users. Cloud-native. Real-time pricing discovery.' },
            ]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA + Newsletter Section (with Ambient Clean Harbor Video)
          ═══════════════════════════════════════════════ */}
      <CTASection
        heading="Ready to Scale Impact?"
        description="Join 500+ sellers and 50+ buyers on Carbon Bazaar. Access high-quality credits. Drive climate action. Meet compliance."
        primaryCTA={{ label: 'Get Started', href: '/register' }}
        secondaryCTA={{ label: 'Contact Sales', href: 'mailto:partnerships@carbonbazaar.in' }}
      >
        {/* Newsletter inside CTA section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          id="contact"
          className="mt-14 mx-auto max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl"
        >
          <h3 className="text-white font-bold text-sm mb-1">Stay Updated</h3>
          <p className="text-white/70 text-xs mb-4">Get latest market insights and climate-tech news.</p>
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-white/15 border border-white/25 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/60 transition-colors"
            />
            <button
              type="submit"
              className="btn-pill bg-white text-[#0B1F17] font-bold !py-2.5 !px-5 text-xs hover:bg-[#FEFAE0] shadow-md"
            >
              Subscribe
            </button>
          </form>
          {subscribed && (
            <p className="mt-2 text-xs text-emerald-300 font-medium">✓ Thank you for subscribing!</p>
          )}
        </motion.div>
      </CTASection>

      {/* ═══════════════════════════════════════════════
          Footer
          ═══════════════════════════════════════════════ */}
      <LandingFooter />
    </div>
  );
}
