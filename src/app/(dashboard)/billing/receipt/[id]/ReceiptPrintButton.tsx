'use client';

import { Printer } from 'lucide-react';

export default function ReceiptPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
    >
      <Printer className="w-3.5 h-3.5" /> Print / Save PDF
    </button>
  );
}
