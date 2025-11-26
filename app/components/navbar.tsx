"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-xl font-bold">InventoryBot</div>
        <div className="flex gap-6">
          <Link
            href="/"
            className={`px-4 py-2 rounded transition ${
              pathname === "/" 
                ? "bg-blue-800 font-semibold" 
                : "hover:bg-blue-700"
            }`}
          >
            Scanner
          </Link>
          <Link
            href="/manage"
            className={`px-4 py-2 rounded transition ${
              pathname === "/manage" 
                ? "bg-blue-800 font-semibold" 
                : "hover:bg-blue-700"
            }`}
          >
            Manage
          </Link>
        </div>
      </div>
    </nav>
  );
}
