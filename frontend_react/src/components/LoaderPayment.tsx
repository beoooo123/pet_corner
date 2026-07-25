import React from "react";
import { FaPaw } from "react-icons/fa";

export default function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="relative flex flex-col items-center">
        {/* Loader container */}
        <div className="relative h-24 w-24">
          {/* Outer circle */}
          <div className="absolute inset-0 rounded-full border-4 border-[#22A6DF] opacity-20"></div>
          {/* Spinning circle */}
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#22A6DF]"></div>
          {/* Paw print in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <FaPaw className="h-10 w-10 animate-pulse text-[#22A6DF]" />
          </div>
        </div>

        {/* Loading text */}
        <div className="mt-6 text-center">
          <p className="text-lg font-medium text-[#22A6DF]">
            Đang xử lý yêu cầu của bạn. Vui lòng đợi chút nhé
          </p>
          <div className="flex justify-center space-x-1 mt-2">
            <div className="h-2 w-2 animate-bounce rounded-full bg-[#22A6DF]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-[#22A6DF] delay-150"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-[#22A6DF] delay-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
