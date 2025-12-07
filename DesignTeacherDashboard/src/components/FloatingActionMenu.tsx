import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, BookOpen, Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import SessionCard from './SessionCard';

interface FloatingActionMenuProps {
  sessions: Array<{
    title: string;
    className: string;
    date: string;
    time: string;
    duration: string;
    location: string;
    isOnline: boolean;
    color: string;
  }>;
}

export default function FloatingActionMenu({ sessions }: FloatingActionMenuProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [newClassInput, setNewClassInput] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (menuId: string) => {
    if (isDragging) return;
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set active menu immediately
    setActiveMenu(menuId);
  };

  const handleMouseLeave = () => {
    // Add a small delay before hiding to prevent flickering
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  // Generate calendar dates
  const generateCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getClassIndicator = (day: number | null) => {
    if (!day) return null;
    // Only show green indicators for sessions
    if ([7, 14, 21, 28].includes(day)) return '#3FA11B';
    return null;
  };

  const menuItems = [
    { id: 'start', icon: Play, label: 'Start Session', color: '#3FA11B' },
    { id: 'prepare', icon: BookOpen, label: 'Prepare', color: '#B882B1' },
    { id: 'create', icon: Plus, label: 'New Class', color: '#F772E8' },
    { id: 'calendar', icon: CalendarIcon, label: 'Calendar', color: '#8AA281' },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 250;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderContent = () => {
    if (!activeMenu) return null;

    switch (activeMenu) {
      case 'start':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/10 backdrop-blur-2xl rounded-2xl p-4 shadow-xl border border-white/20 w-[380px]"
          >
            <p className="text-[#6a7282] text-[12px] mb-3">Choose one to start:</p>
            <div className="relative">
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/25 backdrop-blur-md rounded-full p-1.5 shadow-md hover:bg-white/40 transition-all"
              >
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-8">
                {sessions.map((session, index) => (
                  <div key={index} className="min-w-[240px]">
                    <SessionCard {...session} />
                  </div>
                ))}
              </div>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/25 backdrop-blur-md rounded-full p-1.5 shadow-md hover:bg-white/40 transition-all"
              >
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </motion.div>
        );

      case 'prepare':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/10 backdrop-blur-2xl rounded-2xl p-4 shadow-xl border border-white/20 w-[380px]"
          >
            <p className="text-[#6a7282] text-[12px] mb-3">Choose one to prepare with:</p>
            <div className="relative">
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/25 backdrop-blur-md rounded-full p-1.5 shadow-md hover:bg-white/40 transition-all"
              >
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-8">
                {sessions.map((session, index) => (
                  <div key={index} className="min-w-[240px]">
                    <SessionCard {...session} />
                  </div>
                ))}
              </div>
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/25 backdrop-blur-md rounded-full p-1.5 shadow-md hover:bg-white/40 transition-all"
              >
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </motion.div>
        );

      case 'create':
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/10 backdrop-blur-2xl rounded-2xl p-5 shadow-xl border border-white/20 w-[380px]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-[#B882B1] flex items-center justify-center">
                <Plus className="size-5 text-white" />
              </div>
              <p className="text-[#101828] text-[14px]">What do you want to teach about?</p>
            </div>
            <input
              type="text"
              value={newClassInput}
              onChange={(e) => setNewClassInput(e.target.value)}
              placeholder="e.g. Advanced React Patterns"
              className="w-full px-4 py-2.5 border border-white/20 rounded-lg focus:outline-none focus:border-[#F772E8] transition-colors text-[14px] bg-white/40 backdrop-blur-sm"
            />
            <button className="w-full mt-3 bg-[#B882B1] text-white py-2.5 rounded-lg hover:opacity-90 transition-opacity text-[14px]">
              Create Class
            </button>
          </motion.div>
        );

      case 'calendar':
        const calendarDays = generateCalendar();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        return (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/10 backdrop-blur-2xl rounded-2xl p-4 shadow-xl border border-white/20 w-[380px]"
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                className="p-1 hover:bg-white/25 rounded transition-colors"
              >
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              <p className="text-[#101828] text-[14px]">
                {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </p>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                className="p-1 hover:bg-white/25 rounded transition-colors"
              >
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-[10px] text-[#6a7282] py-1">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const classColor = getClassIndicator(day);
                const isToday = day === new Date().getDate() && 
                               selectedDate.getMonth() === new Date().getMonth() &&
                               selectedDate.getFullYear() === new Date().getFullYear();
                
                return (
                  <button
                    key={index}
                    disabled={!day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[12px] transition-all relative
                      ${!day ? 'invisible' : ''}
                      ${isToday ? 'bg-[#8AA281] text-white' : 'hover:bg-white/25 text-[#101828]'}
                    `}
                  >
                    {day}
                    {classColor && (
                      <div 
                        className="size-1.5 rounded-full absolute bottom-1"
                        style={{ backgroundColor: classColor }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/15 flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-[#3FA11B]" />
                <span className="text-[#6a7282]">Sessions</span>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed left-8 top-[200px] z-[1000]">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        className="cursor-move relative"
        onMouseLeave={handleMouseLeave}
      >
        {/* Main Menu */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 p-3 flex flex-col gap-3 relative z-10">
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              onMouseEnter={() => handleMouseEnter(item.id)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="size-12 rounded-xl flex items-center justify-center transition-all relative group bg-white shadow-sm"
              style={{ 
                backgroundColor: activeMenu === item.id ? item.color : '#ffffff',
              }}
            >
              <item.icon 
                className="size-5 transition-colors" 
                style={{ 
                  color: activeMenu === item.id ? '#ffffff' : '#6a7282' 
                }} 
              />
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                {item.label}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Expanded Content - Absolutely Positioned */}
        <AnimatePresence mode="wait">
          {activeMenu && (
            <div 
              className="absolute left-full top-0 ml-4"
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                }
              }}
            >
              {renderContent()}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}