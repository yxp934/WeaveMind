'use client';

import { Calendar, Clock, Video, MapPin } from 'lucide-react';

interface SessionCardProps {
  title: string;
  className: string;
  date: string;
  time: string;
  duration?: string;
  location: string;
  isOnline: boolean;
  color?: string;
  onClick?: () => void;
}

export function SessionCard({
  title,
  className,
  date,
  time,
  duration,
  location,
  isOnline,
  color = '#3FA11B',
  onClick
}: SessionCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[8px] border border-gray-200 p-2.5 hover:shadow-[0px_4px_6px_-2px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <div
          className="size-1.5 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <h5 className="text-[#101828] text-[12px] mb-0.5 truncate font-medium">{title}</h5>
          <p className="text-[#6a7282] text-[10px] mb-1.5">{className}</p>

          <div className="grid grid-cols-2 gap-1 text-[10px] text-[#6a7282]">
            <div className="flex items-center gap-1">
              <Calendar className="size-3" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1 col-span-2">
              {isOnline ? (
                <>
                  <Video className="size-3" />
                  <span>{location}</span>
                </>
              ) : (
                <>
                  <MapPin className="size-3" />
                  <span>{location}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionCard;
