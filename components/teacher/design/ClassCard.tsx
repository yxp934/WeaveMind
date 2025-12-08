'use client';

import { BookOpen, Users, Clock } from 'lucide-react';

interface ClassCardProps {
  title: string;
  instructor: string;
  progress: number;
  totalSessions: number;
  completedSessions: number;
  students: number;
  color?: string;
  onClick?: () => void;
}

export function ClassCard({
  title,
  instructor,
  progress,
  totalSessions,
  completedSessions,
  students,
  color = '#B882B1',
  onClick
}: ClassCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[8px] border border-gray-200 p-3 shadow-[0px_2px_4px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start gap-2.5">
        <div
          className="size-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <BookOpen className="size-4" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-[#101828] text-[13px] mb-0.5 truncate">{title}</h4>
          <p className="text-[#6a7282] text-[11px] mb-2">{instructor}</p>

          <div className="flex items-center gap-3 text-[11px] text-[#6a7282] mb-2">
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>{completedSessions}/{totalSessions}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="size-3" />
              <span>{students}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: color }}
              />
            </div>
            <div className="flex items-center justify-end">
              <span className="text-[10px]" style={{ color }}>
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClassCard;
