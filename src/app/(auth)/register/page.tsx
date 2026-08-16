'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Mail, Lock, User, Loader2, Zap, CheckCircle2, Shield, Clock } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Benefits */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-blue-600" fill="currentColor" />
            </div>
            <span className="text-2xl font-bold text-white">Liable Alerts</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
            Start Your Free Trial Today
          </h1>
          <p className="text-lg text-blue-100 mb-12 max-w-md">
            Join hundreds of businesses automating their critical alerts with our email-to-SMS platform.
          </p>

          <div className="space-y-6">
            {[
              { icon: <Mail className="w-6 h-6" />, title: 'Easy Setup', desc: 'Create email endpoints in seconds' },
              { icon: <Shield className="w-6 h-6" />, title: 'Reliable Delivery', desc: '99.9% uptime SLA guarantee' },
              { icon: <Clock className="w-6 h-6" />, title: 'Real-time Tracking', desc: 'Monitor all SMS deliveries' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/30 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                  <p className="text-blue-100 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-blue-200 text-sm">
          © 2026 Liable Alerts. All rights reserved.
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-gray-900">Liable Alerts</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create your account</h2>
            <p className="text-gray-600">Start automating SMS alerts in minutes</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
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
              <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
