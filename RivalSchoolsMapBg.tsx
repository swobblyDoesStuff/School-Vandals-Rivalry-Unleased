import React from 'react';

// A simple SVG map background for the Rival Schools box. This is subtle and can be used as a React component.
const RivalSchoolsMapBg: React.FC = () => (
  <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full z-0">
    <rect width="400" height="300" rx="32" fill="url(#bg)" fillOpacity="0.12" />
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="400" y2="300" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" />
        <stop offset="1" stopColor="#f87171" />
      </linearGradient>
    </defs>
    {/* Example map lines */}
    <path d="M40 60 Q200 20 360 60" stroke="#fff" strokeWidth="2" opacity="0.15" />
    <path d="M60 120 Q200 80 340 120" stroke="#fff" strokeWidth="2" opacity="0.12" />
    <path d="M80 180 Q200 140 320 180" stroke="#fff" strokeWidth="2" opacity="0.10" />
    {/* Example school locations as circles */}
    <circle cx="80" cy="60" r="10" fill="#fde68a" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
    <circle cx="200" cy="40" r="10" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
    <circle cx="320" cy="60" r="10" fill="#a7f3d0" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
    <circle cx="120" cy="120" r="10" fill="#fcd34d" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
    <circle cx="280" cy="120" r="10" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
    <circle cx="160" cy="180" r="10" fill="#a7f3d0" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
    <circle cx="240" cy="180" r="10" fill="#fde68a" stroke="#b91c1c" strokeWidth="2" opacity="0.7" />
  </svg>
);

export default RivalSchoolsMapBg;
