'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, User, Loader2, Shield, Clock, Globe, MapPin, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    country: 'United States',
    city: '',
    timezone: 'America/New_York',
    responsibilityAgreement: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (userTz) {
        setFormData(prev => ({ ...prev, timezone: userTz }));
      }
    } catch (e) {
      // Keep America/New_York
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!formData.responsibilityAgreement) {
      setError('You must agree to the recipient responsibility statement to create an account.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = { error: 'An unexpected error occurred. Please try again.' };
      }

      if (!res.ok) {
        setError(data.error || 'Failed to register');
        setIsLoading(false);
        return;
      }

      router.push('/login?registered=true');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    const isCheckbox = (target as HTMLInputElement).type === 'checkbox';
    const checked = (target as HTMLInputElement).checked;
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#0a2540] via-[#0d3160] to-[#1a4a8a] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-[#f97316] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Liable Alerts</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Start Your 7-Day Free Trial
          </h1>
          <p className="text-lg text-blue-100 mb-12 max-w-md">
            Route alarm emails from building systems, equipment, security platforms, and other email-enabled devices to SMS recipients—no additional hardware required.
          </p>

          <div className="space-y-6">
            {[
              { icon: <Mail className="w-6 h-6" />, title: 'Dedicated Alarm Endpoints', desc: 'Create unique inbound email addresses for each site' },
              { icon: <Shield className="w-6 h-6" />, title: 'Reliable Routing', desc: 'Alert the right people when an alarm email arrives' },
              { icon: <Clock className="w-6 h-6" />, title: 'Delivery History', desc: 'Track all received emails and SMS activity from one dashboard' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-blue-100 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/10 border border-white/15 rounded-xl p-4 text-xs text-blue-100 space-y-1 mt-8">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span>ℹ️</span> Free Trial Includes:
            </p>
            <p className="leading-relaxed text-blue-100/90">
              1 site, 1 dedicated alarm email endpoint, up to 3 recipients, and 25 SMS credits. No setup fee. A paid subscription is required to continue service after the trial.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-blue-200 text-sm">
          © 2026 Liable Alerts LLC. All rights reserved.
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6 sm:mb-8">
            <div className="w-10 h-10 bg-[#f97316] rounded-lg flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Liable Alerts</span>
          </div>

          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
            <p className="text-sm sm:text-base text-gray-600">Start your 7-day free trial in minutes</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <Input
              name="name"
              type="text"
              label="Full Name"
              placeholder="John Doe"
              required
              value={formData.name}
              onChange={handleChange}
              icon={<User className="w-4 h-4" />}
            />

            <Input
              name="companyName"
              type="text"
              label="Company Name"
              placeholder="Acme Corp"
              required
              value={formData.companyName}
              onChange={handleChange}
              icon={<Building2 className="w-4 h-4" />}
            />

            {/* Country and City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-gray-400" /> Country *
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Australia">Australia</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" /> City
                </label>
                <input
                  name="city"
                  type="text"
                  placeholder="e.g. Miami, New York"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-gray-400" /> Primary Timezone *
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                required
              >
                <option value="America/New_York">Eastern Time (US &amp; Canada, ET) — America/New_York</option>
                <option value="America/Chicago">Central Time (US &amp; Canada, CT) — America/Chicago</option>
                <option value="America/Denver">Mountain Time (US &amp; Canada, MT) — America/Denver</option>
                <option value="America/Phoenix">Mountain Time (Arizona, MST) — America/Phoenix</option>
                <option value="America/Los_Angeles">Pacific Time (US &amp; Canada, PT) — America/Los_Angeles</option>
                <option value="America/Anchorage">Alaska Time (AKT) — America/Anchorage</option>
                <option value="Pacific/Honolulu">Hawaii Time (HST) — Pacific/Honolulu</option>
                <option value="America/Halifax">Atlantic Time (AST) — America/Halifax</option>
                <option value="Europe/London">GMT / British Time (London) — Europe/London</option>
                <option value="Europe/Paris">Central European Time (Paris, Berlin) — Europe/Paris</option>
                <option value="UTC">Coordinated Universal Time (UTC)</option>
              </select>
            </div>

            <Input
              name="email"
              type="email"
              label="Work Email"
              placeholder="you@company.com"
              required
              value={formData.email}
              onChange={handleChange}
              icon={<Mail className="w-4 h-4" />}
              helperText="Use your work email to get started"
            />

            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="w-4 h-4" />}
              helperText="Must be at least 8 characters long"
            />

            {/* Free Trial Notice */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-1 text-xs text-blue-950">
              <p className="font-bold flex items-center gap-1.5 text-blue-900">
                <Shield className="w-4 h-4 text-blue-600" />
                7-Day Free Trial — No Setup Fee:
              </p>
              <p className="leading-relaxed text-blue-900/80">
                Your first 7 days are completely free with 1 site, 1 endpoint, up to 3 recipients, and 25 SMS credits. A paid subscription is required to continue after the trial.
              </p>
            </div>

            {/* REQUIRED: Account-Level Responsibility Agreement */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/70 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="responsibilityAgreement"
                  name="responsibilityAgreement"
                  checked={formData.responsibilityAgreement}
                  onChange={handleChange}
                  required
                  className="mt-1 w-4 h-4 text-[#f97316] rounded border-gray-300 focus:ring-[#f97316] flex-shrink-0 cursor-pointer"
                  aria-required="true"
                  aria-describedby="responsibility-agreement-desc"
                />
                <label
                  htmlFor="responsibilityAgreement"
                  id="responsibility-agreement-desc"
                  className="text-xs text-gray-800 leading-relaxed cursor-pointer font-medium"
                >
                  <strong className="text-gray-900">I agree</strong> to add only recipients who have expressly consented to receive automated operational and system alarm text messages. I understand that I am responsible for obtaining and maintaining each recipient&apos;s consent and for immediately removing recipients who withdraw consent.{' '}
                  <span className="text-red-600 font-bold">*</span>
                </label>
              </div>
              <p className="text-[11px] text-gray-600 pl-7">
                This is required. Recipient SMS consent is collected separately when each phone number is added.
              </p>
            </div>

            <p className="text-[11px] text-gray-500 leading-normal px-1">
              * Text messages are counted per segment (160 characters). Longer alerts that split into multiple segments count as multiple messages against your plan quota.
            </p>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
                disabled={!formData.responsibilityAgreement || isLoading}
              >
                {isLoading ? 'Creating account...' : 'Start 7-Day Free Trial'}
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">Terms and Conditions</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
