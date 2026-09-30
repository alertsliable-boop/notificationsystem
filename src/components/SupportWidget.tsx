'use client';

import { useState } from 'react';
import { MessageCircle, Phone, Mail, X } from 'lucide-react';

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-4 w-80 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-900/5 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Critical Support</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            We actively monitor critical alarms. If you need immediate assistance, please reach out.
          </p>
          
          <div className="space-y-3">
            <a 
              href="tel:1-800-555-0199" 
              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Phone size={18} />
              <span className="font-medium">1-800-555-0199</span>
            </a>
            
            <a 
              href="mailto:support@liablealerts.com" 
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Mail size={18} />
              <span className="font-medium">Email Support</span>
            </a>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            Live chat integration coming soon.
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
          isOpen ? 'bg-gray-900 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
