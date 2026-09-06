import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Shield, Mail, Phone, CheckCircle2, Lock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Liable Alerts',
  description: 'Privacy Policy and SMS Consent Information for Liable Alerts.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-black transition-colors text-xs sm:text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-black flex items-center justify-center shadow-sm">
              <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="currentColor" />
            </div>
            <span className="font-bold tracking-tight text-xs sm:text-sm text-gray-900">Liable Alerts</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <Link
              href="/terms"
              className="text-gray-500 hover:text-gray-900 transition-colors hidden xs:inline"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-sm border border-gray-200/80 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-4">
              <Shield className="w-3.5 h-3.5" />
              <span>A2P 10DLC & Carrier Compliant</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
              Privacy Policy
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              <strong>Effective date:</strong> September 4, 2026
            </p>
            <p className="text-gray-700 leading-relaxed text-[15px]">
              Liable Alerts, LLC (&ldquo;Liable Alerts,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect information when you visit our website, create or use a Liable Alerts account, or receive text-message notifications through our service.
            </p>
          </div>

          {/* Document Content */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-sm border border-gray-200/80 space-y-8 sm:space-y-10 text-[15px] leading-relaxed text-gray-700">

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">01.</span> Information We Collect
              </h2>
              <p className="mb-3">We may collect:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  <strong className="text-gray-900">Account and contact information:</strong> such as your name, company name, email address, telephone number, billing contact information, and account credentials.
                </li>
                <li>
                  <strong className="text-gray-900">Messaging information:</strong> such as mobile telephone numbers, SMS consent records, opt-in and opt-out status, message delivery information, timestamps, and message content generated through the service.
                </li>
                <li>
                  <strong className="text-gray-900">Service configuration information:</strong> such as site names, notification recipients, alarm-routing preferences, endpoint settings, and other information submitted by account administrators.
                </li>
                <li>
                  <strong className="text-gray-900">Billing information:</strong> payment information is processed by our payment-service providers. We may retain transaction records but do not store full payment-card numbers.
                </li>
                <li>
                  <strong className="text-gray-900">Technical and usage information:</strong> such as IP address, browser type, device information, log data, pages viewed, and activity within the service.
                </li>
                <li>
                  <strong className="text-gray-900">Communications:</strong> information you provide when contacting customer support or otherwise communicating with us.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">02.</span> How We Use Information
              </h2>
              <p className="mb-3">We may use information to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>Provide, operate, maintain, secure, and improve the Liable Alerts service;</li>
                <li>Create and administer accounts and subscriptions;</li>
                <li>Convert authorized system-generated email alerts into SMS notifications and deliver them to designated recipients;</li>
                <li>Record and honor SMS consent, HELP requests, and opt-out requests;</li>
                <li>Process payments and maintain transaction records;</li>
                <li>Provide customer support and communicate about service, security, billing, and account matters;</li>
                <li>Prevent fraud, abuse, unauthorized access, and other harmful activity; and</li>
                <li>Comply with legal obligations and enforce our agreements.</li>
              </ul>
            </section>

            {/* Section 3 - Critical SMS Compliance Callout */}
            <section className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 text-blue-900">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h2 className="text-xl font-bold">
                  3. SMS Privacy and Consent
                </h2>
              </div>
              <p className="text-gray-800">
                Liable Alerts sends operational and informational text messages, including building-system alarm and status notifications, only to recipients who have provided consent to receive them.
              </p>
              <div className="p-4 bg-white rounded-lg border border-blue-200 text-blue-950 font-semibold shadow-xs">
                Mobile information, including telephone numbers, text-messaging originator opt-in data, and consent records, will not be sold, rented, or shared with third parties or affiliates for marketing or promotional purposes. SMS consent is not transferable.
              </div>
              <p className="text-gray-800">
                We may disclose information to service providers that process data solely on our behalf and only as necessary to operate the service, such as communications, hosting, security, support, and payment providers. These providers are contractually limited to using the information to perform services for us and may not use mobile information or SMS consent for their own marketing or promotional purposes.
              </p>
              <p className="text-gray-800">
                Message frequency varies based on alarm activity and the notification settings selected for the applicable site or system. Message and data rates may apply. Reply <strong className="text-blue-950">STOP</strong> to cancel messages and <strong className="text-blue-950">HELP</strong> for help. Consent to receive text messages is not a condition of purchase.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">04.</span> How We Disclose Information
              </h2>
              <p className="mb-3">In addition to the limited service-provider disclosures described above, we may disclose information:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>At the direction of an account owner or authorized administrator;</li>
                <li>To comply with law, regulation, legal process, or a valid governmental request;</li>
                <li>To protect the rights, safety, security, or property of Liable Alerts, our users, recipients, or others;</li>
                <li>In connection with a merger, financing, acquisition, reorganization, or sale of business assets, subject to applicable law and the SMS privacy commitments stated in this Policy; or</li>
                <li>With your direction or consent.</li>
              </ul>
              <p className="font-medium text-gray-900">
                We do not sell personal information. The SMS consent and mobile-information restrictions in Section 3 apply regardless of any other provision in this Policy.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">05.</span> Account Administrators and Recipient Information
              </h2>
              <p className="text-gray-600">
                Businesses and other organizations may use Liable Alerts to configure alarm recipients. Those customers control the recipient information they submit and are responsible for obtaining and documenting each recipient&apos;s prior consent before adding a mobile number. If an organization has added your information, you may contact that organization or Liable Alerts to exercise your rights or stop messages. Regardless of the account administrator&apos;s settings, replying <strong className="text-gray-900">STOP</strong> will opt the receiving number out of further messages from the applicable messaging program.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">06.</span> Data Retention
              </h2>
              <p className="text-gray-600">
                We retain information for as long as reasonably necessary to provide the service, maintain business and compliance records, resolve disputes, enforce agreements, and satisfy legal obligations. Retention periods vary based on the type of information and why it was collected.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">07.</span> Data Security
              </h2>
              <p className="text-gray-600">
                We use reasonable administrative, technical, and physical safeguards designed to protect personal information. No transmission or storage method is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">08.</span> Your Choices and Rights
              </h2>
              <p className="text-gray-600">
                You may update certain account information through the service or contact us to request access, correction, or deletion, subject to applicable law and legitimate record-retention requirements. You may opt out of text messages at any time by replying <strong className="text-gray-900">STOP</strong>. For assistance, reply <strong className="text-gray-900">HELP</strong> or contact us at{' '}
                <a href="mailto:support@liablealerts.com" className="text-blue-600 hover:underline font-medium">
                  support@liablealerts.com
                </a>.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">09.</span> Cookies and Similar Technologies
              </h2>
              <p className="text-gray-600">
                We may use cookies and similar technologies that are necessary for authentication, security, preferences, analytics, and operation of the website. You can adjust browser settings to limit cookies, although some service features may not function correctly.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">10.</span> Children&apos;s Privacy
              </h2>
              <p className="text-gray-600">
                Liable Alerts is a business service and is not directed to children under 13. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">11.</span> Changes to This Policy
              </h2>
              <p className="text-gray-600">
                We may update this Privacy Policy periodically. We will post the revised version on this page and update the effective date. Material changes may also be communicated through the service or by other appropriate means.
              </p>
            </section>

            {/* Section 12 - Contact Us */}
            <section className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">12.</span> Contact Us
              </h2>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-gray-700 space-y-2">
                <p className="font-semibold text-gray-900 text-base">Liable Alerts, LLC</p>
                <p className="text-gray-600">Broward County, FL, USA</p>
                <p className="flex items-center gap-2 text-gray-700 pt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>Email: </span>
                  <a href="mailto:support@liablealerts.com" className="text-blue-600 hover:underline font-medium">
                    support@liablealerts.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4 sm:px-6 bg-white text-center text-xs text-gray-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Liable Alerts, LLC. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link href="/privacy" className="text-blue-600 font-medium hover:underline">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms and Conditions</Link>
            <span className="text-gray-300">|</span>
            <a href="mailto:support@liablealerts.com" className="hover:text-gray-900 transition-colors">Contact: support@liablealerts.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
