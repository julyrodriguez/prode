"use client";

import { useState, useEffect, useRef, useMemo } from 'react';

interface DatePickerProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  viewMode: 'day' | 'week';
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

export default function DatePicker({ selectedDate, onChange, viewMode }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse starting view date from selectedDate
  const [currentYear, setCurrentYear] = useState(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  });
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date().getMonth() : d.getMonth();
  });

  // Track hovered date for previewing week ranges
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Sync state when selectedDate changes externally
  useEffect(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  }, [selectedDate]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Compute the 42 days grid for the current month view
  const daysGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevTotalDays = new Date(currentYear, currentMonth, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    
    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDayNum = prevTotalDays - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`,
        dayNum: prevDayNum,
        isCurrentMonth: false
      });
    }
    
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        dateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        dayNum: i,
        isCurrentMonth: true
      });
    }
    
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        dayNum: i,
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (dateStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(dateStr);
    setIsOpen(false);
    setHoveredDate(null);
  };

  const getDayStyle = (dateStr: string, isCurrentMonth: boolean) => {
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    
    if (viewMode === 'day') {
      const active = dateStr === selectedDate;
      if (active) {
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-full shadow-[0_0_12px_rgba(16,185,129,0.6)] scale-105 z-10';
      }
      return `${
        isCurrentMonth ? 'text-slate-100' : 'text-slate-600'
      } ${
        isToday ? 'border border-emerald-500/40 rounded-full font-bold text-emerald-400' : ''
      } hover:bg-white/10 rounded-full transition-all duration-150`;
    } else {
      // week mode
      const rangeStartStr = hoveredDate || selectedDate;
      const current = new Date(dateStr + 'T12:00:00');
      const start = new Date(rangeStartStr + 'T12:00:00');
      const end = new Date(rangeStartStr + 'T12:00:00');
      end.setDate(end.getDate() + 6);
      
      const inRange = current >= start && current <= end;
      if (inRange) {
        const isStart = dateStr === rangeStartStr;
        const isEnd = (() => {
          const check = new Date(dateStr + 'T12:00:00');
          const checkEnd = new Date(rangeStartStr + 'T12:00:00');
          checkEnd.setDate(checkEnd.getDate() + 6);
          return check.getTime() === checkEnd.getTime();
        })();
        
        let baseStyle = 'z-10 font-bold';
        if (isStart) {
          return `${baseStyle} bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-l-full shadow-[0_0_12px_rgba(16,185,129,0.5)]`;
        } else if (isEnd) {
          return `${baseStyle} bg-emerald-500/35 text-emerald-200 rounded-r-full border-r border-emerald-500/30`;
        } else {
          return `${baseStyle} bg-emerald-500/20 text-emerald-300`;
        }
      }
      
      return `${
        isCurrentMonth ? 'text-slate-200' : 'text-slate-600'
      } ${
        isToday ? 'border border-emerald-500/30 rounded-full text-emerald-400' : ''
      } hover:bg-white/10 rounded-full transition-all duration-150`;
    }
  };

  // Format header text
  const displayLabel = useMemo(() => {
    try {
      const startD = new Date(selectedDate + 'T12:00:00');
      if (isNaN(startD.getTime())) return 'Seleccionar fecha';
      
      if (viewMode === 'week') {
        const endD = new Date(selectedDate + 'T12:00:00');
        endD.setDate(endD.getDate() + 6);
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
        return `${startD.toLocaleDateString('es-ES', options)} - ${endD.toLocaleDateString('es-ES', options)}`;
      } else {
        return startD.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });
      }
    } catch {
      return selectedDate;
    }
  }, [selectedDate, viewMode]);

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Trigger Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex flex-col items-center min-w-[105px] md:min-w-[120px] px-3 py-1 rounded-xl transition-all duration-300 border bg-white/[0.02] active:scale-95 cursor-pointer outline-none ${
          isOpen
            ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
        }`}
      >
        <span className="text-[8px] md:text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-none mb-1">
          {viewMode === 'week' ? 'SEMANA' : 'FECHA'}
        </span>
        <span className="text-xs font-black text-white capitalize leading-none flex items-center gap-1.5">
          {displayLabel}
          <span className={`text-[10px] text-emerald-400/80 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </span>
      </button>

      {/* Popover Dropdown Calendar */}
      {isOpen && (
        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 w-72 bg-[#090d12]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header Month / Year Navigation */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors text-slate-300 text-sm font-bold cursor-pointer"
            >
              &lt;
            </button>
            <span className="text-sm font-black text-white tracking-wide">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-colors text-slate-300 text-sm font-bold cursor-pointer"
            >
              &gt;
            </button>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map(({ dateStr, dayNum, isCurrentMonth }) => (
              <button
                key={dateStr}
                onClick={(e) => handleSelectDay(dateStr, e)}
                onMouseEnter={() => viewMode === 'week' && setHoveredDate(dateStr)}
                onMouseLeave={() => viewMode === 'week' && setHoveredDate(null)}
                className={`h-8 text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${getDayStyle(
                  dateStr,
                  isCurrentMonth
                )}`}
              >
                {dayNum}
              </button>
            ))}
          </div>

          {/* Instructions Helper Text */}
          <div className="border-t border-white/5 pt-2 text-[10px] text-slate-400 font-medium text-center flex items-center justify-center gap-1 leading-none select-none">
            <span>💡</span>
            <span>
              {viewMode === 'week'
                ? 'Selecciona el día de inicio de la semana.'
                : 'Selecciona una fecha para ver sus partidos.'}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
