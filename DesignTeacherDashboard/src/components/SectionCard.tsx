import { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  children: ReactNode;
  titleColor?: string;
}

export default function SectionCard({ title, children, titleColor = '#B882B1' }: SectionCardProps) {
  return (
    <div className="bg-white rounded-[14px] border border-gray-200 p-6 shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.05)] relative">
      <h2 className="font-['Slackey:Regular',sans-serif] text-[24px] mb-5" style={{ color: titleColor }}>
        {title}
      </h2>
      
      {children}
    </div>
  );
}