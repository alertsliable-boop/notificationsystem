import Link from 'next/link';
import { Zap, ArrowRight, CheckCircle2, Shield, BellRing, Activity, ShieldCheck, Mail, Smartphone, Cpu } from 'lucide-react';
import HomeNavbar from '@/components/HomeNavbar';

export const metadata = {
  title: 'Liable Alerts — Instant Email-to-SMS Alert Platform',
  description: 'Turn any equipment email into an instant SMS alert. No code, no complexity.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111827] font-sans selection:bg-black selection:text-white">
      {/* Responsive Navbar */}
      <HomeNavbar />

      {/* Cinematic Hero */}
      <section className="pt-32 sm:pt-40 pb-20 sm:pb-32 px-4 sm:px-6 relative overflow-hidden flex flex-col items-center text-center">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '40px 40px' }}
        />
        
        <div className="relative max-w-4xl mx-auto z-10 flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-[11px] font-semibold px-3 py-1.5 rounded-full mb-6 sm:mb-8 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Reliable Infrastructure
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-[80px] font-extrabold tracking-tighter leading-[1.05] sm:leading-[0.95] mb-6 sm:mb-8 text-[#030712] max-w-3xl">
            Instant Alerts.<br />
            <span className="text-gray-400">Zero Delays.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#4B5563] max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed font-light tracking-wide px-2">
            Turn any equipment email into an instant SMS alert. No code. No complex dashboards. Generate a unique inbound email address and get your entire team texted immediately.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-md px-2">
            <Link
              href="/register"
              className="flex-1 inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:py-4 bg-black text-white font-semibold rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:bg-neutral-800 text-sm sm:text-base"
            >
              Start Building <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="flex-1 inline-flex items-center justify-center gap-2 px-7 py-3.5 sm:py-4 bg-[#F3F4F6] text-[#111827] font-medium rounded-full transition-all hover:bg-[#E5E7EB] text-sm sm:text-base"
            >
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Clean Dashboard Preview / App Interface Teaser */}
      <section id="how-it-works" className="pb-20 sm:pb-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-xl sm:shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 p-6 sm:p-10 md:p-16 border-b md:border-b-0 md:border-r border-[#E5E7EB]">
            <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center mb-6">
              <Cpu className="w-5 h-5 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">Monitor Anything</h3>
            <p className="text-[#6B7280] leading-relaxed mb-8 text-sm sm:text-base">
              From HVAC systems to CNC machines, if your equipment can send an email, it can trigger an SMS alert to your entire team.
            </p>
            <ul className="space-y-4">
              {['Generator Failures', 'Alarm Systems', 'Power Outages'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-[#FAFAFA] p-6 sm:p-10 md:p-16 relative overflow-hidden flex items-center justify-center">
            {/* Abstract UI representation */}
            <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-1"></div>
                    <div className="h-3 w-16 bg-gray-50 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-gray-100 rounded"></div>
                <div className="h-2 w-5/6 bg-gray-100 rounded"></div>
                <div className="h-2 w-4/6 bg-gray-100 rounded"></div>
              </div>
              <div className="mt-6 pt-6 border-t border-dashed border-[#E5E7EB] flex items-center justify-between">
                <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"></div>
                   <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300"></div>
                </div>
                <div className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-full">
                  SMS Sent
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#FAFAFA] border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 sm:mb-20 md:flex md:items-end justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 sm:mb-6">Designed for Reliability.</h2>
              <p className="text-base sm:text-lg text-[#6B7280] font-light leading-relaxed">
                Enterprise-grade alert routing without the enterprise complexity. Built on top of Twilio and SendGrid for maximum deliverability.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { icon: Mail, title: 'Unique Asset Emails', desc: 'Generate a distinct inbound email address for every single asset you monitor.' },
              { icon: Smartphone, title: 'Multi-Recipient Blast', desc: 'One incoming email triggers an SMS blast to your entire on-call list.' },
              { icon: Activity, title: 'Granular Delivery Logs', desc: 'Track exact timestamps for every webhook received and every SMS sent.' }
            ].map((f, i) => (
              <div key={i} className="group bg-white sm:bg-transparent p-5 sm:p-0 rounded-2xl border border-gray-100 sm:border-0 shadow-xs sm:shadow-none">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
                  <f.icon className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 text-gray-900">{f.title}</h3>
                <p className="text-[#6B7280] leading-relaxed text-sm">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-32 px-4 sm:px-6 border-t border-[#E5E7EB]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">Transparent Per-Site Pricing.</h2>
            <p className="text-base sm:text-lg text-[#6B7280]">
              Volume rates scale automatically with your active site count. Dedicated endpoints and strictly metered SMS credits.
            </p>
          </div>

          {/* 7-Day Free Trial Banner */}
          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-2xl p-6 sm:p-8 md:p-10 mb-10 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl border border-neutral-800 gap-6">
            <div className="max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest border border-white/10">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                7-Day Free Trial
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 tracking-tight">Try Liable Alerts completely free.</h3>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                Start with a <strong>7-day free trial</strong> to test your equipment alarms. Includes <strong>1 site</strong>, <strong>1 dedicated endpoint</strong>, <strong>25 SMS delivery credits</strong>, and up to <strong>3 recipients</strong>. No setup fee. Paid subscription required after 7 days.
              </p>
            </div>
            <Link
              href="/register"
              className="w-full md:w-auto text-center whitespace-nowrap bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-lg hover:scale-105 active:scale-95 duration-200 text-sm sm:text-base"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Starter', price: '49', range: '1–9 active sites', highlight: false },
              { name: 'Professional', price: '44', range: '10–24 active sites', highlight: true },
              { name: 'Professional Plus', price: '39', range: '25–49 active sites', highlight: false },
              { name: 'Enterprise', price: '34', range: '50+ active sites', highlight: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 sm:p-8 rounded-2xl border flex flex-col justify-between ${
                  plan.highlight ? 'bg-black text-white border-black shadow-2xl scale-[1.02]' : 'bg-white border-[#E5E7EB]'
                }`}
              >
                {plan.highlight && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                     Most Popular
                   </div>
                )}
                <div>
                  <h3 className={`font-semibold mb-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`text-xs font-semibold mb-4 ${plan.highlight ? 'text-neutral-400' : 'text-blue-600'}`}>
                    {plan.range}
                  </p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className={`text-xs ${plan.highlight ? 'opacity-80' : 'text-[#6B7280]'}`}>/ site / month</span>
                  </div>
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-2.5 text-xs">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                      <span><strong>1 Dedicated</strong> Endpoint / site</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                      <span><strong>250 SMS</strong> credits / site / month</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                      <span>Up to <strong>10</strong> SMS recipients</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs">
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                      <span>Delivery history & usage tracking</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/register"
                  className={`block w-full py-3 px-4 text-center rounded-full text-sm font-semibold transition-all ${
                    plan.highlight ? 'bg-white text-black hover:opacity-90' : 'bg-[#F3F4F6] text-black hover:bg-[#E5E7EB]'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-gray-500 mt-6">
            * The applicable volume rate is based on your account's total number of active sites and applies to all sites. Unused SMS credits expire at the end of each monthly billing period.
          </p>

          {/* Detailed Pricing Policies */}
          <div className="mt-16 sm:mt-24 pt-12 sm:pt-16 border-t border-[#E5E7EB]/60">
            <div className="text-center mb-12 sm:mb-16">
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 sm:mb-4">How it all works together</h3>
              <p className="text-sm sm:text-base text-[#6B7280] max-w-2xl mx-auto">
                Comprehensive explanation of physical sites, additional endpoints, and SMS delivery options.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto">
              {/* Left Column: Physical Sites & Additional Endpoints */}
              <div className="space-y-8 sm:space-y-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Cpu className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">What Each Site Includes</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      A <strong>Site</strong> represents one physical building, property, or customer location. Every active site includes one dedicated alarm email endpoint, up to 10 SMS recipients, 250 SMS credits per month, alarm & delivery history, and email support.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Additional Endpoints ($15/month)</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Customers can add endpoints for additional systems located at the <strong>same physical site</strong> (for example: Main BMS, Chiller plant, Garage CO system, and Refrigeration). Each additional endpoint is <strong>$15/month</strong> and includes an additional <strong>250 SMS credits/month</strong>, dedicated email address, and up to 10 recipients.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: SMS Delivery Options & Overage */}
              <div className="space-y-8 sm:space-y-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Option 2: Automatic Overage Billing (Recommended)</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Critical alarms continue delivering even after the 250 included credits are used. Each additional block of <strong>250 SMS credits is $10</strong>. Customers can establish an optional monthly overage dollar cap for peace of mind.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Option 1: Stop at 250 Credits</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      SMS delivery automatically stops when an endpoint reaches 250 credits. Automated usage warning notifications are sent to your team at <strong>80%, 90%, and 100%</strong>. Delivery resumes at the next billing cycle or whenever additional credits are purchased.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Compliant Website Footer */}
      <footer className="border-t border-[#E5E7EB] py-10 sm:py-12 px-4 sm:px-6 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" fill="currentColor" />
            </div>
            <span className="font-bold tracking-tight text-sm text-gray-900">Liable Alerts</span>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-[13px] text-[#6B7280] font-medium">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="hover:text-black transition-colors">Terms and Conditions</Link>
            <span className="text-gray-300">|</span>
            <a href="mailto:support@liablealerts.com" className="hover:text-black transition-colors">
              Contact: support@liablealerts.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

