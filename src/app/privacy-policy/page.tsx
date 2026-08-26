import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Liable Alerts',
  description: 'Privacy Policy and Terms of Service for Liable Alerts.',
};

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-gray-500 mb-12">Last updated: August 26, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">1. Introduction</h2>
              <p className="text-gray-600 leading-relaxed">
                Welcome to Liable Alerts. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">2. Information We Collect</h2>
              <p className="text-gray-600 leading-relaxed">
                We may collect, use, store and transfer different kinds of personal data about you, including:
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                  <li><strong>Contact Data:</strong> includes billing address, email address and telephone numbers.</li>
                  <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version.</li>
                </ul>
              </p>
            </section>

            <section className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-3 text-blue-900">3. SMS & Mobile Data Privacy (A2P 10DLC Compliance)</h2>
              <p className="text-blue-800 leading-relaxed font-medium">
                We value the privacy of your communications. <strong>We do not share, sell, or rent your mobile information, phone numbers, or SMS consent with third parties or affiliates for marketing or promotional purposes.</strong> Text messaging originator opt-in data and consent will be kept strictly confidential and will only be used to provide the Liable Alerts notification services you have explicitly registered for.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">4. How We Use Your Data</h2>
              <p className="text-gray-600 leading-relaxed">
                We will only use your personal data for the purpose of fulfilling our core services, including sending automated system alerts to the endpoints and phone numbers you configure within your dashboard.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">5. Opt-Out & User Rights</h2>
              <p className="text-gray-600 leading-relaxed">
                You can opt-out of receiving SMS notifications at any time by replying "STOP" to any message we send. You may also update your communication preferences directly within your account dashboard. If you wish to delete your account and all associated data, please contact our support team.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">6. Contact Us</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about this privacy policy or our privacy practices, please contact us at: <a href="mailto:support@liablealerts.com" className="text-blue-600 hover:underline">support@liablealerts.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
