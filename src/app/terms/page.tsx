import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Shield, Mail, Phone, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms and Conditions | Liable Alerts',
  description: 'Terms and Conditions for Liable Alerts.',
};

export default function TermsAndConditionsPage() {
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
              href="/privacy"
              className="text-gray-500 hover:text-gray-900 transition-colors hidden xs:inline"
            >
              Privacy Policy
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
              <FileText className="w-3.5 h-3.5" />
              <span>Official Agreement & SMS Terms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
              Terms and Conditions
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              <strong>Effective date:</strong> September 4, 2026
            </p>
            <p className="text-gray-700 leading-relaxed text-[15px]">
              These Terms and Conditions (&ldquo;Terms&rdquo;) govern access to and use of the Liable Alerts website and services. By creating an account, purchasing a subscription, or using the service, you agree to these Terms. If you use the service on behalf of an organization, you represent that you have authority to bind that organization.
            </p>
          </div>

          {/* Document Content */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-sm border border-gray-200/80 space-y-8 sm:space-y-10 text-[15px] leading-relaxed text-gray-700">

            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">01.</span> Service Description
              </h2>
              <p className="text-gray-600">
                Liable Alerts is an alarm-routing and notification service that receives authorized system-generated emails and converts designated alert information into SMS notifications for recipients configured by an account owner or administrator. Liable Alerts is a notification aid only and is not an emergency-dispatch service, life-safety system, central monitoring station, or substitute for required on-site alarms, supervision, maintenance, or emergency procedures.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">02.</span> Accounts and Authorized Use
              </h2>
              <p className="text-gray-600 mb-3">
                You must provide accurate account information, keep credentials secure, and promptly notify us of suspected unauthorized use. You may use the service only for lawful purposes and only with systems, email sources, sites, data, and recipient numbers that you are authorized to configure.
              </p>
              <p className="text-gray-600">
                You may not use Liable Alerts to transmit unlawful, deceptive, abusive, harassing, fraudulent, unsolicited, or prohibited content; interfere with the service; bypass security or usage limits; or violate telecommunications, privacy, marketing, or consent laws.
              </p>
            </section>

            {/* Section 3 - Critical SMS Compliance Callout */}
            <section className="bg-blue-50/70 border-2 border-blue-200 rounded-xl p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 text-blue-900">
                <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h2 className="text-xl font-bold">
                  3. SMS Messaging Terms
                </h2>
              </div>
              <p className="text-gray-800">
                The messaging program name is <strong className="text-gray-900">Liable Alerts</strong>. By expressly opting in, a recipient agrees to receive recurring automated operational and informational SMS messages from Liable Alerts, including building-system alarm, fault, status, and related notification messages. Messages may be sent from <strong className="text-gray-900 font-mono">+1 (640) 230-7603</strong> or another number identified by Liable Alerts.
              </p>
              <div className="p-4 bg-white rounded-lg border border-blue-200 text-blue-950 font-medium space-y-2 text-sm shadow-xs">
                <p>
                  <strong>Message Frequency:</strong> Message frequency varies based on alarm activity and configuration.
                </p>
                <p>
                  <strong>Rates & Conditions:</strong> Message and data rates may apply. Consent to receive text messages is not a condition of purchase.
                </p>
                <p>
                  <strong>Opt-Out:</strong> To stop receiving messages, reply <span className="font-bold bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-mono">STOP</span>. You will receive a confirmation, and no further messages will be sent through the applicable messaging program unless you opt in again. Supported opt-out keywords include: STOP, END, CANCEL, UNSUBSCRIBE, and QUIT.
                </p>
                <p>
                  <strong>Support & Assistance:</strong> For assistance, reply <span className="font-bold bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-mono">HELP</span> or contact{' '}
                  <a href="mailto:support@liablealerts.com" className="text-blue-600 underline font-semibold">
                    support@liablealerts.com
                  </a>. Supported help keywords include HELP and INFO.
                </p>
              </div>
              <p className="text-gray-800 text-sm">
                Carriers are not liable for delayed or undelivered messages. Message delivery is subject to carrier availability, network conditions, equipment operation, and other factors outside our control.
              </p>
              <p className="text-gray-800 text-sm">
                For information about how we handle personal information and SMS consent, review our Privacy Policy at{' '}
                <Link href="/privacy" className="text-blue-700 underline font-semibold">
                  https://liablealerts.com/privacy
                </Link>.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">04.</span> Customer Responsibility for Recipient Consent
              </h2>
              <p className="mb-3 text-gray-600">
                If you add, import, or configure a recipient&apos;s mobile number, you represent and warrant that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>The recipient has provided prior, express, and voluntary consent to receive the specific Liable Alerts operational messages you configure;</li>
                <li>Consent was not assumed, purchased, transferred, or bundled with a required transaction;</li>
                <li>You maintain a record showing when and how consent was obtained;</li>
                <li>You clearly disclosed the program name, message purpose, variable message frequency, potential message and data rates, and STOP and HELP instructions; and</li>
                <li>You will promptly remove a recipient who withdraws consent or is no longer authorized to receive the notifications.</li>
              </ul>
              <p className="text-gray-600 font-medium">
                You may not add a mobile number obtained from a purchased list, third party, affiliate, or lead generator. You are responsible for complying with all laws and industry requirements applicable to your use of the service.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">05.</span> Alarm Configuration and Delivery
              </h2>
              <p className="text-gray-600 mb-3">
                You are responsible for testing and maintaining source systems, email delivery, routing rules, recipient information, alarm priorities, escalation procedures, internet connectivity, and all related configurations. You must independently verify that critical alarms and required safety functions operate correctly.
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm leading-relaxed flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  Messages may be delayed, filtered, duplicated, truncated, or undelivered. You must not rely on Liable Alerts as the only method for delivering emergency, fire, security, medical, life-safety, or other critical notifications.
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">06.</span> Fees, Billing, and Subscription Changes
              </h2>
              <p className="text-gray-600 mb-3">
                Fees, included usage, overage charges, billing intervals, trial terms, renewal terms, and cancellation options are shown during signup or in the applicable order or plan description. You authorize us and our payment provider to charge amounts due using your selected payment method. Taxes may apply. Unless otherwise required by law or expressly stated, fees already paid are non-refundable.
              </p>
              <p className="text-gray-600">
                We may change pricing or plan features upon advance notice. Continued use after the effective date of a change constitutes acceptance of the revised pricing or plan.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">07.</span> Third-Party Services
              </h2>
              <p className="text-gray-600">
                The service depends on third-party providers, including communications carriers, messaging providers, hosting services, email providers, and payment processors. Their availability and performance are outside our control, and their separate terms may apply.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">08.</span> Intellectual Property
              </h2>
              <p className="text-gray-600">
                Liable Alerts and its licensors retain all rights in the service, software, branding, documentation, and related materials. These Terms grant you a limited, nonexclusive, nontransferable, revocable right to use the service during your active subscription in accordance with these Terms.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">09.</span> Suspension and Termination
              </h2>
              <p className="text-gray-600">
                We may suspend or terminate access if you violate these Terms, create a security or legal risk, fail to pay amounts due, generate prohibited or non-consensual messaging, or threaten the integrity of the service. You may cancel as described in your account or plan terms. Provisions that by their nature should survive termination will survive.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">10.</span> Disclaimers
              </h2>
              <p className="text-gray-600">
                To the fullest extent permitted by law, the service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We disclaim warranties not expressly stated, including implied warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted availability, and error-free delivery. We do not guarantee that any alert or message will be received within a particular time or at all.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">11.</span> Limitation of Liability
              </h2>
              <p className="text-gray-600">
                To the fullest extent permitted by law, Liable Alerts and its owners, employees, contractors, and service providers will not be liable for indirect, incidental, special, exemplary, or punitive damages, or for lost profits, revenue, data, business, or goodwill arising from the service. Our aggregate liability arising out of or relating to the service will not exceed the amount paid to Liable Alerts for the affected service during the six months preceding the event giving rise to the claim. Some jurisdictions do not allow certain limitations, so portions of this section may not apply to you.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">12.</span> Indemnification
              </h2>
              <p className="text-gray-600">
                You agree to defend, indemnify, and hold harmless Liable Alerts and its owners, employees, contractors, and service providers from claims, losses, liabilities, damages, and reasonable expenses arising from your content, configurations, violation of these Terms, violation of law, or failure to obtain or honor recipient consent.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">13.</span> Governing Law
              </h2>
              <p className="text-gray-600">
                These Terms are governed by the laws of the State of Florida, without regard to conflict-of-law principles. Any dispute will be brought in the state or federal courts located in Broward County, Florida, unless applicable law requires otherwise.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">14.</span> Changes to These Terms
              </h2>
              <p className="text-gray-600">
                We may update these Terms periodically. We will post the revised Terms and update the effective date. Continued use after revised Terms become effective constitutes acceptance where permitted by law.
              </p>
            </section>

            {/* Section 15 - Contact Us */}
            <section className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-blue-600 font-mono text-sm">15.</span> Contact Us
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
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/terms" className="text-blue-600 font-medium hover:underline">Terms and Conditions</Link>
            <span className="text-gray-300">|</span>
            <a href="mailto:support@liablealerts.com" className="hover:text-gray-900 transition-colors">Contact: support@liablealerts.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
