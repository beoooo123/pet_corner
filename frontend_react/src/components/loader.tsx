import React from "react";
import { FaPaw } from "react-icons/fa";

export default function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="relative">
        {/* Loader container */}
        <div className="h-24 w-24">
          {/* Animated circles */}
          <div className="absolute h-24 w-24 rounded-full border-4 border-t-4 border-[#FFA500] opacity-20"></div>
          <div className="absolute h-24 w-24 animate-spin rounded-full border-4 border-t-4 border-transparent border-t-[#FFA500]"></div>

          {/* Paw print in center */}
          <div className="absolute left-1/2 top-12 -translate-x-1/2 -translate-y-1/2 transform">
            <FaPaw className="h-10 w-10 animate-pulse text-[#FFA500]" />
          </div>
        </div>

        {/* Loading text */}
        <div className="mt-4 text-center">
          <p className="text-lg font-medium text-[#FFA500]">Đang tải</p>
          <div className="flex justify-center space-x-1">
            <div className="animate-bounce text-[#FFA500] delay-0">.</div>
            <div className="animate-bounce text-[#FFA500] delay-100">.</div>
            <div className="animate-bounce text-[#FFA500] delay-200">.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
