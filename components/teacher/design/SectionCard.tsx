'use client';

import { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  titleColor?: string;
  className?: string;
}

export function SectionCard({
  title,
  children,
  titleColor = '#B882B1',
  className = ''
}: SectionCardProps) {
  return (
    <div className={`bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] relative ${className}`}>
      <h2
        className="text-[24px] mb-5 font-bold"
        style={{
          color: titleColor,
          fontFamily: "'Slackey', cursive, sans-serif"
        }}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}

export default SectionCard;
