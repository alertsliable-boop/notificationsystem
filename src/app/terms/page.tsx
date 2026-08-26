import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Liable Alerts',
  description: 'Terms of Service for Liable Alerts.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-sm text-gray-600">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-black flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" fill="currentColor" />
            </div>
            <span className="font-bold tracking-tight text-sm">Liable Alerts</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-10 md:p-16 shadow-sm border border-gray-100">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Terms of Service</h1>
          <p className="text-gray-500 mb-12">Last updated: August 26, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">1. Acceptance of Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing and using Liable Alerts, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">2. Description of Service</h2>
              <p className="text-gray-600 leading-relaxed">
                Liable Alerts provides an automated notification system that sends SMS alerts based on system endpoints and triggers configured by the user.
              </p>
            </section>

            <section className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-3 text-blue-900">3. SMS Communications & A2P 10DLC</h2>
              <p className="text-blue-800 leading-relaxed font-medium">
                By registering for an account and adding phone numbers to your endpoints, you consent to receive SMS notifications from Liable Alerts related to your system triggers. You understand that message and data rates may apply. You can opt-out at any time by replying "STOP" to any of our messages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">4. User Responsibilities</h2>
              <p className="text-gray-600 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">5. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about these Terms, please contact us at: <a href="mailto:support@liablealerts.com" className="text-blue-600 hover:underline">support@liablealerts.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
