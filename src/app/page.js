'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    // TODO: Add email subscription logic
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  return (
    <div className="w-full bg-white text-zinc-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-600">🌾</div>
            <span className="text-xl font-bold text-zinc-900">Carbon Bazaar</span>
          </div>
          <div className="hidden gap-8 md:flex">
            <a href="#problem" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Problem
            </a>
            <a href="#solution" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Solution
            </a>
            <a href="#farmers" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Farmers
            </a>
            <a href="#compliance" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Compliance
            </a>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col justify-center gap-8">
            <div>
              <h1 className="mb-4 text-5xl font-bold leading-tight text-zinc-900">
                Connecting Indian Farmers to the Carbon Economy
              </h1>
              <p className="text-xl leading-relaxed text-zinc-600">
                A regulated, transparent marketplace for high-quality carbon credits from agricultural practices. 
                Empower farmers. Scale impact. Meet compliance requirements.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href="./marketplace"
                className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700 transition-colors"
              >
                Browse Credits
              </Link>
              <button
                onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}
                className="rounded-lg border-2 border-zinc-300 px-8 py-3 font-medium text-zinc-900 hover:border-zinc-400 transition-colors"
              >
                Learn More
              </button>
            </div>
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-zinc-200">
              <div>
                <div className="text-3xl font-bold text-green-600">500+</div>
                <p className="text-sm text-zinc-600">Farmer Partnerships</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">2.5M</div>
                <p className="text-sm text-zinc-600">tCO2e Credits Listed</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">₹250Cr+</div>
                <p className="text-sm text-zinc-600">Market Value</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-12">
            <div className="text-center">
              <div className="mb-4 text-6xl">🌾</div>
              <h3 className="mb-2 text-2xl font-bold text-zinc-900">Made in India</h3>
              <p className="text-zinc-600">For Indian farmers. By Indian agriculture expertise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="border-t border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-bold text-zinc-900">The Problem: India's Carbon Credit Gap</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-8">
              <div className="mb-4 text-4xl">🚨</div>
              <h3 className="mb-2 text-xl font-bold text-zinc-900">Fragmented Market</h3>
              <p className="text-zinc-600">
                No unified platform for Indian agricultural carbon credits. Farmers lack access to buyers. Industries struggle to source verified credits.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-8">
              <div className="mb-4 text-4xl">📋</div>
              <h3 className="mb-2 text-xl font-bold text-zinc-900">Regulatory Uncertainty</h3>
              <p className="text-zinc-600">
                Inconsistent standards, unclear compliance pathways, and lack of standardized measurement methodologies across states.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-8">
              <div className="mb-4 text-4xl">💰</div>
              <h3 className="mb-2 text-xl font-bold text-zinc-900">Farmer Exclusion</h3>
              <p className="text-zinc-600">
                Indian farmers—the backbone of sustainable agriculture—are locked out of carbon markets worth ₹1000+ crores globally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solution" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-bold text-zinc-900">Our Solution: Carbon Bazaar</h2>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-6 text-2xl font-bold text-zinc-900">A Regulated Digital Marketplace</h3>
              <ul className="space-y-4">
                <li className="flex gap-4">
                  <span className="text-2xl text-green-600">✓</span>
                  <div>
                    <h4 className="font-bold text-zinc-900">India-First Design</h4>
                    <p className="text-sm text-zinc-600">Built for Indian agriculture, policies, and compliance frameworks</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="text-2xl text-green-600">✓</span>
                  <div>
                    <h4 className="font-bold text-zinc-900">Farmer-Friendly Interface</h4>
                    <p className="text-sm text-zinc-600">Simple onboarding. Real-time pricing. Direct buyer connections.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="text-2xl text-green-600">✓</span>
                  <div>
                    <h4 className="font-bold text-zinc-900">Transparent Pricing</h4>
                    <p className="text-sm text-zinc-600">INR-based, INR-denominated. ₹700–₹1,200 per tCO2e price discovery</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="text-2xl text-green-600">✓</span>
                  <div>
                    <h4 className="font-bold text-zinc-900">Verified Methodologies</h4>
                    <p className="text-sm text-zinc-600">Regenerative agriculture, crop rotation, agroforestry, conservation tillage</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="text-2xl text-green-600">✓</span>
                  <div>
                    <h4 className="font-bold text-zinc-900">Industry Adoption Ready</h4>
                    <p className="text-sm text-zinc-600">Cement, steel, power sectors accessing credits for compliance</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 p-12">
              <h4 className="mb-6 text-xl font-bold text-zinc-900">Impact Metrics</h4>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-zinc-600">Carbon Sequestered (Annual Target)</p>
                  <p className="text-3xl font-bold text-green-600">5M+ tCO2e</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-600">Farmer Income Generated</p>
                  <p className="text-3xl font-bold text-green-600">₹500Cr+</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-600">Companies Compliant</p>
                  <p className="text-3xl font-bold text-green-600">50+ Industries</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-600">Indian Farms Included</p>
                  <p className="text-3xl font-bold text-green-600">1,000+ Farmers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Farmer Inclusion Section */}
      <section id="farmers" className="border-t border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-bold text-zinc-900">Farmer Inclusion: Economic Opportunity</h2>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="rounded-lg bg-white p-8 border border-zinc-200">
              <h3 className="mb-4 text-2xl font-bold text-zinc-900">The Farmer Journey</h3>
              <ol className="space-y-4 text-zinc-700">
                <li className="flex gap-4">
                  <span className="font-bold text-green-600">1.</span>
                  <span><strong>Register & Verify</strong> – Simple KYC, farm details, crop type</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-green-600">2.</span>
                  <span><strong>List Credits</strong> – Choose methodology (regenerative, agroforestry, etc.)</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-green-600">3.</span>
                  <span><strong>Receive Offers</strong> – Buyers negotiate pricing transparently</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-green-600">4.</span>
                  <span><strong>Settle Trades</strong> – Bank transfer in INR, monthly compliance</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-bold text-green-600">5.</span>
                  <span><strong>Scale Impact</strong> – Reinvest in sustainable farming practices</span>
                </li>
              </ol>
            </div>
            <div className="space-y-6">
              <div className="rounded-lg border border-green-200 bg-green-50 p-8">
                <h4 className="mb-2 text-lg font-bold text-green-900">Real Farmer Success</h4>
                <p className="text-sm text-green-800">
                  <strong>Rajesh Kumar (Punjab):</strong> 15 hectares of wheat. Earned ₹2.1 lakhs through carbon credits in 6 months. Reinvested in drip irrigation.
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-8">
                <h4 className="mb-2 text-lg font-bold text-green-900">Benefits Realized</h4>
                <ul className="space-y-2 text-sm text-green-800">
                  <li>✓ Additional income stream (₹700–₹1,200/tCO2e)</li>
                  <li>✓ Reduced input costs through sustainable practices</li>
                  <li>✓ Long-term soil health & productivity gains</li>
                  <li>✓ Access to premium crop certifications</li>
                  <li>✓ Participation in India's climate goals</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-4xl font-bold text-zinc-900">Compliance Ready: Meeting India's Standards</h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">State Alignment</h4>
              <p className="text-sm text-zinc-600">
                All 28 states + 8 UTs supported. State-specific regulations enforced at the platform level.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Methodological Rigor</h4>
              <p className="text-sm text-zinc-600">
                4 verified methodologies: regenerative agriculture, crop rotation, agroforestry, conservation tillage.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Currency & Units</h4>
              <p className="text-sm text-zinc-600">
                INR only. tCO2e exclusively. No currency arbitrage. No unit mismatches.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Monthly Cycles</h4>
              <p className="text-sm text-zinc-600">
                Compliance tracking in YYYY-MM format. Audit trails. Transaction history.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Admin Oversight</h4>
              <p className="text-sm text-zinc-600">
                Farmer verification workflows. Listing approval gates. Transaction monitoring.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Data Security</h4>
              <p className="text-sm text-zinc-600">
                MongoDB encryption. JWT authentication. Role-based access control.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Audit Ready</h4>
              <p className="text-sm text-zinc-600">
                Complete transaction ledger. Farmer profiles. Methodology tracking.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-white p-6">
              <div className="mb-3 text-3xl">✅</div>
              <h4 className="mb-2 font-bold text-zinc-900">Scalability</h4>
              <p className="text-sm text-zinc-600">
                Designed for 10,000+ users. Cloud-native. Real-time pricing discovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="contact" className="border-t border-zinc-200 bg-gradient-to-br from-green-50 to-emerald-50 py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="mb-4 text-4xl font-bold text-zinc-900">Ready to Scale Impact?</h2>
          <p className="mb-8 text-lg text-zinc-600">
            Join 500+ farmers and 50+ industries on Carbon Bazaar. Access high-quality credits. Drive climate action. Meet compliance.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="./register"
              className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700 transition-colors"
            >
              Get Started
            </Link>
            <a
              href="mailto:partnerships@carbonsazaar.in"
              className="rounded-lg border-2 border-green-600 px-8 py-3 font-medium text-green-600 hover:bg-green-50 transition-colors"
            >
              Contact Sales
            </a>
          </div>

          {/* Newsletter Signup */}
          <div className="mt-12 rounded-lg border-2 border-green-600 bg-white p-8">
            <h3 className="mb-2 text-xl font-bold text-zinc-900">Stay Updated</h3>
            <p className="mb-4 text-zinc-600">Get latest market insights and climate-tech news for Indian industries.</p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-6 py-2 font-medium text-white hover:bg-green-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
            {subscribed && (
              <p className="mt-2 text-sm text-green-600 font-medium">✓ Thank you for subscribing!</p>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-900 text-zinc-400 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">🌾</span>
                <span className="font-bold text-white">Carbon Bazaar</span>
              </div>
              <p className="text-sm">Connecting Indian farmers to the carbon economy.</p>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/app/marketplace" className="hover:text-white">Marketplace</Link></li>
                <li><Link href="/app/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/app/analytics" className="hover:text-white">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/docs" className="hover:text-white">Documentation</a></li>
                <li><a href="/api" className="hover:text-white">API Reference</a></li>
                <li><a href="/guides" className="hover:text-white">Guides</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-white">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/about" className="hover:text-white">About</a></li>
                <li><a href="/careers" className="hover:text-white">Careers</a></li>
                <li><a href="/contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-800 pt-8">
            <p className="text-center text-sm">
              © 2026 Carbon Bazaar. Built for India's climate future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
