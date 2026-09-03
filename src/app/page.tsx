import Link from 'next/link';
import { Zap, ArrowRight, CheckCircle2, Shield, BellRing, Activity, ShieldCheck, Mail, Smartphone, Cpu } from 'lucide-react';

export const metadata = {
  title: 'Liable Alerts — Instant Email-to-SMS Alert Platform',
  description: 'Turn any equipment email into an instant SMS alert. No code, no complexity.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#111827] font-sans selection:bg-black selection:text-white">
      {/* Premium Minimalist Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFDFD]/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white dark:text-black" fill="currentColor" />
            </div>
            <span className="font-bold tracking-tight text-lg">Liable Alerts</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it Works', 'Pricing'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="text-[13px] font-medium text-[#4B5563] hover:text-black transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[13px] font-medium text-[#4B5563] hover:text-black transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="text-[13px] font-semibold bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-full transition-all shadow-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Cinematic Hero */}
      <section className="pt-40 pb-32 px-6 relative overflow-hidden flex flex-col items-center text-center">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, black 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative max-w-4xl mx-auto z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-[11px] font-semibold px-3 py-1.5 rounded-full mb-8 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Reliable Infrastructure
          </div>

          <h1 className="text-6xl md:text-[80px] font-extrabold tracking-tighter leading-[0.95] mb-8 text-[#030712]">
            Instant Alerts.<br />
            <span className="text-gray-400">Zero Delays.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#4B5563] max-w-2xl mx-auto mb-12 leading-relaxed font-light tracking-wide">
            Turn any equipment email into an instant SMS alert. No code. No complex dashboards. Generate a unique inbound email address and get your entire team texted immediately.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
            <Link href="/register"
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white font-semibold rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:bg-neutral-800">
              Start Building <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how-it-works"
              className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#F3F4F6] text-[#111827] font-medium rounded-full transition-all hover:bg-[#E5E7EB]">
              View Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Clean Dashboard Preview / App Interface Teaser */}
      <section id="how-it-works" className="pb-32 px-6">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 p-10 md:p-16 border-b md:border-b-0 md:border-r border-[#E5E7EB]">
            <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center mb-6">
              <Cpu className="w-5 h-5 text-black" />
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">Monitor Anything</h3>
            <p className="text-[#6B7280] leading-relaxed mb-8">
              From HVAC systems to CNC machines, if your equipment can send an email, it can trigger an SMS alert to your entire team.
            </p>
            <ul className="space-y-4">
              {['Generator Failures', 'Alarm Systems', 'Power Outages'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-medium text-[#374151]">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-[#FAFAFA] p-10 md:p-16 relative overflow-hidden flex items-center justify-center">
            {/* Abstract UI representation */}
            <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-[#E5E7EB] p-6">
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
      <section id="features" className="py-24 px-6 bg-[#FAFAFA] border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:mb-24 md:flex md:items-end justify-between">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Designed for Reliability.</h2>
              <p className="text-lg text-[#6B7280] font-light">
                Enterprise-grade alert routing without the enterprise complexity. Built on top of Twilio and SendGrid for maximum deliverability.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Mail, title: 'Unique Asset Emails', desc: 'Generate a distinct inbound email address for every single asset you monitor.' },
              { icon: Smartphone, title: 'Multi-Recipient Blast', desc: 'One incoming email triggers an SMS blast to your entire on-call list.' },
              { icon: Activity, title: 'Granular Delivery Logs', desc: 'Track exact timestamps for every webhook received and every SMS sent.' }
            ].map((f, i) => (
              <div key={i} className="group">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 transition-transform">
                  <f.icon className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-[#6B7280] leading-relaxed text-sm">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Minimal */}
      <section id="pricing" className="py-32 px-6 border-t border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Transparent Pricing.</h2>
            <p className="text-lg text-[#6B7280]">Subscriptions based on total alarm email endpoints. Strictly metered usage.</p>
          </div>

          <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] rounded-2xl p-8 md:p-10 mb-10 text-white flex flex-col md:flex-row items-center justify-between shadow-2xl border border-neutral-800">
            <div className="mb-6 md:mb-0 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest border border-white/10">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Zero Risk
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Try Liable Alerts completely free.</h3>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">
                Start with a <strong>7-day free trial</strong> to test the platform. Includes exactly <strong>1 endpoint</strong>, <strong>10 total SMS messages</strong>, and up to <strong>2 recipients</strong>. No credit card required to start.
              </p>
            </div>
            <Link href="/register" className="w-full md:w-auto text-center whitespace-nowrap bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-lg hover:scale-105 active:scale-95 duration-200">
              Start Free Trial
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Starter', price: '19', endpoints: 1, highlight: false },
              { name: 'Professional', price: '59', endpoints: 5, highlight: true },
              { name: 'Business', price: '129', endpoints: 15, highlight: false },
            ].map((plan) => (
              <div key={plan.name} className={`relative p-8 rounded-2xl border ${plan.highlight ? 'bg-black text-white border-black shadow-2xl' : 'bg-white border-[#E5E7EB]'}`}>
                {plan.highlight && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                     Most Popular
                   </div>
                )}
                <h3 className={`font-semibold mb-2 ${plan.highlight ? '' : 'text-[#6B7280]'}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className={`text-sm ${plan.highlight ? 'opacity-80' : 'text-[#6B7280]'}`}>/mo</span>
                </div>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={`w-4 h-4 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                    <span><strong>{plan.endpoints}</strong> Active {plan.endpoints === 1 ? 'Endpoint' : 'Endpoints'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={`w-4 h-4 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                    <span><strong>100</strong> SMS / endpoint / mo</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={`w-4 h-4 ${plan.highlight ? 'text-white' : 'text-black'}`} />
                    <span>Up to <strong>10</strong> recipients / endpoint</span>
                  </div>
                </div>
                <Link href="/register"
                  className={`block w-full py-3 px-4 text-center rounded-full text-sm font-semibold transition-all ${plan.highlight ? 'bg-white text-black hover:opacity-90' : 'bg-[#F3F4F6] text-black hover:bg-[#E5E7EB]'}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          {/* Detailed Pricing Policies - Premium UI */}
          <div className="mt-24 pt-16 border-t border-[#E5E7EB]/60">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold tracking-tight mb-4">How it all works together</h3>
              <p className="text-[#6B7280] max-w-2xl mx-auto">Everything you need to know about combining plans, overage, and message routing.</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {/* Left Column: Combining & Scaling */}
              <div className="space-y-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Cpu className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Combining Plans & Sites</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Need 22 endpoints? Combine a Business plan (15), a Professional plan (5), and 2 Additional Endpoints under one company account. All endpoints merge into one single allowance that you can distribute across any number of sites.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Smart Upgrades</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Additional endpoints cost <strong>$12/month</strong> each. We actively monitor your usage and will recommend upgrading when a larger plan becomes cheaper than paying for add-ons.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Limits & Overage */}
              <div className="space-y-10">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Strictly Metered Limits</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Each endpoint gets exactly <strong>100 SMS/month</strong>. Messages are <em>not</em> pooled between endpoints. If one alarm goes to 10 recipients, that counts as 10 messages used against that endpoint's quota.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Overage & Continuity</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Never miss an alarm. If you exceed 100 messages, paid accounts continue sending via metered billing at just <strong>$0.05 per additional SMS</strong>. Unused messages reset monthly and do not roll over.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimal */}
      <footer className="border-t border-[#E5E7EB] py-12 px-6 bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="font-bold tracking-tight text-sm">Liable Alerts</span>
          </div>
          <div className="flex gap-6 text-[13px] text-[#6B7280] font-medium">
            <Link href="/privacy-policy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <a href="mailto:hello@liablealerts.com" className="hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
