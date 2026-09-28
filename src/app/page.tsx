import Link from 'next/link';
import {
  Shield, ArrowRight, CheckCircle2, Mail, Smartphone,
  Building2, Zap, MessageSquare, Star, ChevronDown,
  Clock, Lock, FileText, Users, AlertTriangle,
} from 'lucide-react';
import HomeNavbar from '@/components/HomeNavbar';

export const metadata = {
  title: 'Liable Alerts — Alarm Email-to-SMS Routing Platform',
  description:
    'Route alarm emails from building systems, security platforms, and equipment to your team via SMS. Designed for facility managers, property operators, and service companies.',
  keywords: [
    'alarm email to SMS',
    'building alarm notifications',
    'facility management alerts',
    'HVAC alarm SMS',
    'equipment alarm routing',
    'property management alerts',
  ],
  openGraph: {
    title: 'Liable Alerts — Alarm Email-to-SMS Routing Platform',
    description:
      'Route alarm emails from building systems, security platforms, and equipment to SMS recipients. No hardware. No code.',
    type: 'website',
  },
};

// ─── Pricing tier helpers ─────────────────────────────────────────────────────
function calcMonthly(sites: number) {
  let rate = 49;
  let total = sites * rate;
  if (sites >= 50) { rate = 34; total = Math.max(49 * 39, sites * 34); }
  else if (sites >= 25) { rate = 39; total = Math.max(24 * 44, sites * 39); }
  else if (sites >= 10) { rate = 44; total = Math.max(9 * 49, sites * 44); }
  return { rate, total };
}

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const FAQ = [
  {
    q: 'What types of systems does Liable Alerts work with?',
    a: 'Any building system, security platform, HVAC controller, refrigeration unit, fire panel, generator, or monitoring tool that can send an outbound alarm email to a designated address. If it sends an email, Liable Alerts can route it to SMS.',
  },
  {
    q: 'How does the alarm routing work?',
    a: 'You create a dedicated alarm email address (endpoint) in Liable Alerts. You configure your building system or alarm panel to send its alert emails to that address. When an email arrives, Liable Alerts converts it to an SMS and delivers it to each designated recipient. No hardware integration required.',
  },
  {
    q: 'What is the 7-day free trial?',
    a: 'Your first 7 days are completely free with 1 site, 1 alarm endpoint, up to 3 recipients, and 25 SMS credits. You will be asked to provide a payment method to activate the trial and secure your endpoint. If you do not cancel before the trial ends, your subscription will begin automatically.',
  },
  {
    q: 'How does pricing work?',
    a: 'Pricing is per active physical site per month. The rate depends on your total site count: $49/site for 1–9 sites, $44/site for 10–24, $39/site for 25–49, and $34/site for 50+. Each site includes one alarm email endpoint, up to 10 SMS recipients, and 250 SMS credits per month.',
  },
  {
    q: 'What counts as an SMS credit?',
    a: 'SMS messages are counted per segment—up to 160 standard characters. If an alarm email is long and splits into 2 segments, it counts as 2 credits. Each endpoint includes 250 credits per billing cycle. Automatic overage billing ($10 per additional 250 credits) is available for critical applications.',
  },
  {
    q: 'Can I add multiple recipients to one alarm endpoint?',
    a: 'Yes. Each endpoint supports up to 10 SMS recipients. Each recipient must independently confirm their consent via SMS before receiving alarm messages.',
  },
  {
    q: 'How does SMS recipient consent work?',
    a: 'When you add a recipient\'s phone number, Liable Alerts sends them an enrollment SMS. The recipient must reply YES to confirm their consent before they will receive any alarm messages. Recipients can opt out at any time by replying STOP.',
  },
  {
    q: 'What if I need more than one alarm endpoint for the same site?',
    a: 'Each site includes one primary alarm endpoint. Additional endpoints for the same site (e.g., for separate building systems at the same address) can be added for $15/month each.',
  },
];

// ─── TIERS ────────────────────────────────────────────────────────────────────
const TIERS = [
  { name: 'Starter', range: '1–9 sites', rate: 49, highlight: false },
  { name: 'Professional', range: '10–24 sites', rate: 44, highlight: true },
  { name: 'Prof. Plus', range: '25–49 sites', rate: 39, highlight: false },
  { name: 'Enterprise', range: '50+ sites', rate: 34, highlight: false },
];

export default function HomePage() {
  return (
    <div className="min-h-screen text-[#111827] font-sans" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Responsive Navbar */}
      <HomeNavbar />

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════ */}
      <section
        className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0a2540 0%, #0d3160 50%, #1a4a8a 100%)',
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-4xl mx-auto text-center z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 text-[11px] font-semibold px-4 py-2 rounded-full mb-8 uppercase tracking-widest backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-[#f97316] rounded-full animate-pulse" />
            Alarm Email-to-SMS Routing Platform
          </div>

          <h1 className="text-4xl sm:text-[56px] md:text-[68px] font-extrabold tracking-tight leading-tight text-white mb-6">
            Route Alarm Emails<br />
            <span style={{ color: '#f97316' }}>to SMS Recipients</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            When a building system, security platform, or equipment controller sends an alarm email, Liable Alerts converts it to SMS and delivers it to your designated team members.{' '}
            <strong className="text-white font-semibold">No hardware integration. No custom code.</strong>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <Link
              href="/register"
              id="hero-cta-start-trial"
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-bold text-sm sm:text-base text-white transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{ backgroundColor: '#f97316' }}
            >
              Start 7-Day Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-sm sm:text-base text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
            >
              How It Works
            </a>
          </div>

          <p className="text-blue-200/70 text-xs mt-6">
            7-day free trial · No setup fee · Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#f97316] bg-orange-50 px-3 py-1.5 rounded-full mb-4 border border-orange-100">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Three steps to SMS alarm delivery
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base sm:text-lg">
              Set up alarm routing in under 10 minutes—no software installation, no API integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: <Mail className="w-7 h-7 text-[#0d3160]" />,
                title: 'Create an Alarm Endpoint',
                desc: 'Add a site and generate a dedicated alarm email address (e.g., site-123@alerts.liablealerts.com). Configure your building system, panel, or platform to send alarm emails to this address.',
              },
              {
                step: '02',
                icon: <Users className="w-7 h-7 text-[#0d3160]" />,
                title: 'Add SMS Recipients',
                desc: 'Add the phone numbers of the people who should receive alarm SMS messages. Each recipient will receive an enrollment SMS and must reply YES before receiving operational alarms.',
              },
              {
                step: '03',
                icon: <Smartphone className="w-7 h-7 text-[#0d3160]" />,
                title: 'Receive SMS Alerts',
                desc: 'When your system sends an alarm email to the endpoint, Liable Alerts converts it to SMS and delivers it to each active, consented recipient in real time.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 sm:p-8 rounded-2xl border border-gray-100 bg-gray-50/50 hover:shadow-md transition-shadow"
              >
                <span className="absolute top-6 right-6 text-[11px] font-black text-gray-200 tracking-widest uppercase">
                  {item.step}
                </span>
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          USE CASES
      ═══════════════════════════════════════════════════════ */}
      <section id="use-cases" className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#f97316] bg-orange-50 px-3 py-1.5 rounded-full mb-4 border border-orange-100">
              Common Applications
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Built for operations teams
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base sm:text-lg">
              Any application where critical equipment or systems already send alarm emails.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <Building2 className="w-5 h-5" />,
                title: 'Building Management Systems',
                examples: ['HVAC alarms', 'BMS fault notifications', 'Chiller and boiler alerts'],
              },
              {
                icon: <Shield className="w-5 h-5" />,
                title: 'Security & Access Systems',
                examples: ['Security panel alerts', 'Access control events', 'Video system notifications'],
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: 'Electrical & Power',
                examples: ['Generator failures', 'Power outage notifications', 'UPS battery alerts'],
              },
              {
                icon: <AlertTriangle className="w-5 h-5" />,
                title: 'Refrigeration & Cold Chain',
                examples: ['Temperature excursion alarms', 'Compressor fault notifications', 'Walk-in alerts'],
              },
              {
                icon: <FileText className="w-5 h-5" />,
                title: 'Fire & Life Safety',
                examples: ['Fire panel email notifications', 'Suppression system alerts', 'CO detector emails'],
              },
              {
                icon: <MessageSquare className="w-5 h-5" />,
                title: 'Monitoring Platforms',
                examples: ['IoT sensor platforms', 'Remote monitoring services', 'Facility management software'],
              },
            ].map((uc) => (
              <div
                key={uc.title}
                className="p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-[#0d3160] text-white rounded-xl flex items-center justify-center mb-4">
                  {uc.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-3">{uc.title}</h3>
                <ul className="space-y-1.5">
                  {uc.examples.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-sm text-gray-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════ */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#f97316] bg-orange-50 px-3 py-1.5 rounded-full mb-5 border border-orange-100">
                Platform Features
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-6">
                Reliable alarm routing for operations teams
              </h2>
              <p className="text-gray-500 text-base sm:text-lg mb-8 leading-relaxed">
                Liable Alerts is designed for teams who depend on alarm notifications to respond quickly to building system events.
              </p>

              <div className="space-y-5">
                {[
                  {
                    icon: <Mail className="w-5 h-5 text-[#0d3160]" />,
                    title: 'Dedicated alarm email endpoints',
                    desc: 'Each site gets a unique inbound address. Configure your building system to route alarm emails there.',
                  },
                  {
                    icon: <Users className="w-5 h-5 text-[#0d3160]" />,
                    title: 'Up to 10 recipients per endpoint',
                    desc: 'Each recipient receives an enrollment SMS and must confirm consent before receiving alarm messages.',
                  },
                  {
                    icon: <Clock className="w-5 h-5 text-[#0d3160]" />,
                    title: 'Delivery history and tracking',
                    desc: 'View every received email and outbound SMS from your dashboard, including delivery status.',
                  },
                  {
                    icon: <Lock className="w-5 h-5 text-[#0d3160]" />,
                    title: 'Per-site subscription pricing',
                    desc: 'Pay only for active sites. Volume pricing reduces the per-site rate as your portfolio grows.',
                  },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-0.5">{f.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Preview Card */}
            <div className="bg-gradient-to-br from-[#0a2540] to-[#1a4a8a] rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-[#f97316] rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-white font-bold">Liable Alerts Dashboard</span>
              </div>

              {/* Mock notification items */}
              <div className="space-y-3">
                {[
                  { label: 'Main St. BMS', msg: 'HVAC Unit 3 — High Temp Fault', time: '2m ago', status: 'delivered' },
                  { label: 'Oak Ave. Security', msg: 'Door Held Open — Zone 4', time: '15m ago', status: 'delivered' },
                  { label: 'Park Blvd. Ref.', msg: 'Walk-in Cooler Temp: 48°F', time: '1h ago', status: 'delivered' },
                ].map((n, i) => (
                  <div key={i} className="bg-white/10 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wide">{n.label}</span>
                      <span className="text-[10px] text-blue-300">{n.time}</span>
                    </div>
                    <p className="text-white text-sm font-medium mb-2">{n.msg}</p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                      <span className="text-[11px] text-green-300 font-semibold">SMS Delivered</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-blue-300">
                <span>3 active sites</span>
                <span>750 SMS credits / month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRICING
      ═══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 sm:py-28 px-4 sm:px-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#f97316] bg-orange-50 px-3 py-1.5 rounded-full mb-4 border border-orange-100">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Per-site volume pricing
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base sm:text-lg">
              Pay per active physical site. The rate decreases as your site count grows and applies to all sites.
            </p>
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 border-2 ${
                  tier.highlight
                    ? 'border-[#0d3160] bg-[#0d3160] text-white shadow-xl'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${tier.highlight ? 'text-blue-200' : 'text-gray-500'}`}>
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-3xl font-extrabold ${tier.highlight ? 'text-white' : 'text-gray-900'}`}>${tier.rate}</span>
                  <span className={`text-xs ${tier.highlight ? 'text-blue-200' : 'text-gray-400'}`}>/site/mo</span>
                </div>
                <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mb-4 ${tier.highlight ? 'bg-white/15 text-blue-100' : 'bg-blue-50 text-blue-700'}`}>
                  {tier.range}
                </span>
                <ul className={`space-y-1.5 text-[12px] ${tier.highlight ? 'text-blue-100' : 'text-gray-500'}`}>
                  {['1 alarm endpoint / site', '250 SMS credits / site', 'Up to 10 recipients'].map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Inclusions list */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 mb-8">
            <h3 className="font-bold text-gray-900 mb-4">Included with every subscription:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                '1 dedicated alarm email endpoint per active site',
                'Up to 10 SMS recipients per endpoint',
                '250 SMS delivery credits per endpoint per month',
                'Delivery history and SMS status tracking',
                'SMS recipient consent management',
                'Automatic overage billing available (optional)',
                'Additional endpoints at $15/month each',
                'Cancel anytime—no long-term contracts',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/register"
              id="pricing-cta-start-trial"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white text-base hover:-translate-y-0.5 hover:shadow-xl transition-all"
              style={{ backgroundColor: '#f97316' }}
            >
              Start 7-Day Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs text-gray-400 mt-3">
              Free trial: 1 site · 1 endpoint · up to 3 recipients · 25 SMS credits · no setup fee
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#f97316] bg-orange-50 px-3 py-1.5 rounded-full mb-4 border border-orange-100">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 sm:p-6 cursor-pointer list-none font-semibold text-gray-900 text-sm sm:text-base hover:bg-gray-100 transition-colors">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 group-open:rotate-180 transition-transform ml-3" />
                </summary>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-gray-600 leading-relaxed border-t border-gray-200 pt-4">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          BOTTOM CTA
      ═══════════════════════════════════════════════════════ */}
      <section
        className="py-20 sm:py-28 px-4 sm:px-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #0a2540 0%, #0d3160 60%, #1a4a8a 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to connect your alarm systems?
          </h2>
          <p className="text-blue-200 mb-10 text-base sm:text-lg">
            Start your 7-day free trial with one site and one alarm endpoint.
          </p>
          <Link
            href="/register"
            id="bottom-cta-start-trial"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-white text-base hover:-translate-y-0.5 hover:shadow-2xl transition-all"
            style={{ backgroundColor: '#f97316' }}
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-blue-300/70 text-xs mt-5">
            7-day free trial · No setup fee · Cancel anytime
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="bg-[#0a2540] text-blue-200 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 pb-10 border-b border-white/10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-[#f97316] rounded-lg flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-white font-bold text-lg">Liable Alerts</span>
              </div>
              <p className="text-sm text-blue-300/80 leading-relaxed">
                Alarm email-to-SMS routing for operations teams.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-blue-300/80">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-blue-300/80">
                <li><Link href="/register" className="hover:text-white transition-colors">Start Free Trial</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-blue-300/80">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-300/60">
            <p>© 2026 Liable Alerts LLC. All rights reserved.</p>
            <p className="text-center sm:text-right max-w-md">
              Liable Alerts transmits alarm email notifications to SMS on behalf of account holders.
              SMS recipients must individually consent before receiving alarm messages. Message and data rates may apply.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
