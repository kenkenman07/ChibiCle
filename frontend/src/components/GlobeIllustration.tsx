import React from "react";

export default function GlobeIllustration() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="80" fill="#16885e" />
      <path
        d="M100 20C120 40 130 70 130 100C130 130 120 160 100 180C80 160 70 130 70 100C70 70 80 40 100 20Z"
        fill="#1a9d6e"
      />
      <path
        d="M20 100C40 120 70 130 100 130C130 130 160 120 180 100"
        stroke="#1a9d6e"
        strokeWidth="10"
        strokeLinecap="round"
      />
    </svg>
  );
}
