"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center justify-center gap-2 w-full text-[12px] text-gray-500 hover:text-gray-700 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors mt-1"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign Out
    </button>
  );
}
