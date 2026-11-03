"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  PlaneTakeoff,
  PlaneLanding,
  Plus,
  Search,
  Users,
  X
} from "lucide-react";
import { LAOS_AIRPORTS } from "@/data/laos-airports";
import { getTranslation, Language } from "@/data/translations";
import { LaosAirport } from "@/types/flight";

/* =========================================================================
   1. Custom Airport Dropdown
   ========================================================================= */

interface AirportSelectProps {
  id: string;
  label: string;
  value: string; // Airport IATA code (e.g. "VTE")
  onChange: (code: string) => void;
  excludeCode?: string;
  lang: Language;
  type: "origin" | "dest";
}

export function AirportSelect({
  id,
  label,
  value,
  onChange,
  excludeCode,
  lang,
  type
}: AirportSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const t = getTranslation(lang);

  const selectedAirport = useMemo(
    () => LAOS_AIRPORTS.find((a) => a.code === value) || LAOS_AIRPORTS[0],
    [value]
  );

  // Filter airports by IATA code, English city/name, or Lao name
  const filteredAirports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return LAOS_AIRPORTS;
    return LAOS_AIRPORTS.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.nameLao.includes(q)
    );
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
  };

  const isOrigin = type === "origin";

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? "z-50" : "z-10"}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full text-left bg-slate-50 border rounded-xl px-3.5 py-2.5 transition cursor-pointer select-none outline-none ${
          isOpen
            ? "border-[#19398a] bg-blue-50/40 ring-2 ring-[#19398a]/15 shadow-sm"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
        }`}
      >
        <span className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold flex items-center gap-1.5">
          {isOrigin ? (
            <PlaneTakeoff className="w-3 h-3 text-[#19398a]" />
          ) : (
            <PlaneLanding className="w-3 h-3 text-[#19398a]" />
          )}
          <span>{label}</span>
        </span>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono-tabular font-bold text-sm text-[#19398a] bg-[#19398a]/10 px-1.5 py-0.5 rounded border border-[#19398a]/20 shrink-0">
              {selectedAirport.code}
            </span>
            <span className="font-display font-bold text-sm text-slate-900 truncate">
              {lang === "lo" ? selectedAirport.nameLao : selectedAirport.city}{" "}
              <span className="text-xs font-normal text-slate-500 font-sans">
                ({lang === "lo" ? selectedAirport.city : selectedAirport.nameLao})
              </span>
            </span>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#19398a]" : ""
            }`}
          />
        </div>
      </button>

      {/* Custom Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full sm:min-w-[340px] max-w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input Bar */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchAirportsPlaceholder}
                className="w-full pl-8 pr-8 py-2 bg-white text-slate-900 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#19398a] focus:ring-1 focus:ring-[#19398a] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Airport Options List */}
          <div className="max-h-[280px] overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100">
            {filteredAirports.length > 0 ? (
              filteredAirports.map((airport) => {
                const isSelected = airport.code === value;
                const isExcluded = airport.code === excludeCode;

                return (
                  <button
                    key={airport.code}
                    type="button"
                    onClick={() => handleSelect(airport.code)}
                    disabled={isExcluded}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 transition cursor-pointer ${
                      isSelected
                        ? "bg-[#19398a]/10 text-[#19398a] font-bold"
                        : isExcluded
                        ? "opacity-40 cursor-not-allowed bg-slate-50"
                        : "hover:bg-blue-50/70 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`font-mono-tabular text-xs font-bold px-2 py-1 rounded-lg shrink-0 border ${
                          isSelected
                            ? "bg-[#19398a] text-white border-[#19398a]"
                            : "bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        {airport.code}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {lang === "lo" ? airport.nameLao : airport.city}
                          {airport.province && (
                            <span className="text-[11px] font-normal text-slate-500 ml-1">
                              • {airport.province}
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate mt-0.5 font-normal">
                          {airport.name}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {airport.highlightTag && (
                        <span className="hidden sm:inline-block text-[9.5px] font-mono-tabular px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 border border-amber-500/20 font-semibold">
                          {airport.highlightTag}
                        </span>
                      )}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#19398a] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                {lang === "lo" ? "ບໍ່ພົບສະໜາມບິນ" : "No airports match your search"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. Custom Date Picker Dropdown (Calendar UI)
   ========================================================================= */

interface DatePickerSelectProps {
  id: string;
  label: string;
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  lang: Language;
}

export function DatePickerSelect({
  id,
  label,
  value,
  onChange,
  lang
}: DatePickerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = getTranslation(lang);

  // Parse current selected date
  const selectedDate = useMemo(() => {
    const parts = value.split("-");
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  }, [value]);

  // Calendar browsing state: year and month
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth()); // 0-11

  // Synchronize view when selectedDate changes
  useEffect(() => {
    setViewYear(selectedDate.getFullYear());
    setViewMonth(selectedDate.getMonth());
  }, [selectedDate]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Generate calendar days for viewYear & viewMonth
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; isPast: boolean; isSelected: boolean; isToday: boolean }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(viewYear, viewMonth, d);
      cellDate.setHours(0, 0, 0, 0);

      const yyyy = cellDate.getFullYear();
      const mm = String(cellDate.getMonth() + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      days.push({
        day: d,
        dateStr,
        isPast: cellDate < today,
        isSelected: dateStr === value,
        isToday: cellDate.getTime() === today.getTime()
      });
    }

    return { firstDay, days };
  }, [viewYear, viewMonth, value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleDateClick = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  // Quick shortcuts
  const selectRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Formatted trigger date string
  const formattedDisplayDate = useMemo(() => {
    const d = selectedDate.getDate();
    const m = selectedDate.getMonth();
    const y = selectedDate.getFullYear();
    const dow = selectedDate.getDay();
    const dowName = t.weekdaysShort[dow];
    const monthName = t.months[m];
    return `${dowName}, ${d} ${monthName} ${y}`;
  }, [selectedDate, t]);

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? "z-50" : "z-10"}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full text-left bg-slate-50 border rounded-xl px-3.5 py-2.5 transition cursor-pointer select-none outline-none ${
          isOpen
            ? "border-[#19398a] bg-blue-50/40 ring-2 ring-[#19398a]/15 shadow-sm"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
        }`}
      >
        <span className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold flex items-center gap-1.5">
          <CalendarIcon className="w-3 h-3 text-[#19398a]" />
          <span>{label}</span>
        </span>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="font-mono-tabular font-bold text-sm text-slate-900 truncate">
            {formattedDisplayDate}
          </div>
          <CalendarIcon className="w-4 h-4 text-slate-500 shrink-0" />
        </div>
      </button>

      {/* Custom Popover Calendar Dialog */}
      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 w-[310px] sm:w-[325px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-display font-bold text-xs sm:text-sm text-slate-900">
              {t.months[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-1 text-center my-2">
            {t.weekdaysShort.map((dayName, idx) => (
              <div
                key={dayName}
                className={`text-[10px] font-mono-tabular font-bold uppercase ${
                  idx === 0 ? "text-rose-600" : "text-slate-400"
                }`}
              >
                {dayName}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for month start offset */}
            {Array.from({ length: calendarDays.firstDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8" />
            ))}

            {/* Actual Month Days */}
            {calendarDays.days.map((item) => (
              <button
                key={item.dateStr}
                type="button"
                disabled={item.isPast}
                onClick={() => handleDateClick(item.dateStr)}
                className={`h-8 rounded-lg font-mono-tabular text-xs font-semibold flex items-center justify-center transition cursor-pointer relative ${
                  item.isSelected
                    ? "bg-[#19398a] text-white font-bold shadow-xs border border-[#eab308]"
                    : item.isPast
                    ? "text-slate-300 cursor-not-allowed"
                    : item.isToday
                    ? "bg-amber-500/15 text-[#19398a] font-bold border border-amber-500/40 hover:bg-[#19398a] hover:text-white"
                    : "text-slate-800 hover:bg-blue-50/80"
                }`}
              >
                {item.day}
              </button>
            ))}
          </div>

          {/* Quick Date Shortcuts Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[11px] font-mono-tabular">
            <button
              type="button"
              onClick={() => selectRelativeDate(0)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#19398a] font-semibold transition cursor-pointer"
            >
              {t.today}
            </button>
            <button
              type="button"
              onClick={() => selectRelativeDate(1)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#19398a] font-semibold transition cursor-pointer"
            >
              {t.tomorrow}
            </button>
            <button
              type="button"
              onClick={() => selectRelativeDate(7)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#19398a] font-semibold transition cursor-pointer"
            >
              {t.plus7Days}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. Custom Passenger Dropdown
   ========================================================================= */

interface PassengerSelectProps {
  id: string;
  label: string;
  value: number; // 1 to 6
  onChange: (count: number) => void;
  lang: Language;
}

export function PassengerSelect({
  id,
  label,
  value,
  onChange,
  lang
}: PassengerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = getTranslation(lang);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const increment = () => {
    if (value < 6) onChange(value + 1);
  };

  const decrement = () => {
    if (value > 1) onChange(value - 1);
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? "z-50" : "z-10"}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full text-left bg-slate-50 border rounded-xl px-3 py-2.5 transition cursor-pointer select-none outline-none ${
          isOpen
            ? "border-[#19398a] bg-blue-50/40 ring-2 ring-[#19398a]/15 shadow-sm"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-100/60"
        }`}
      >
        <span className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold flex items-center gap-1">
          <Users className="w-3 h-3 text-[#19398a]" />
          <span>{label}</span>
        </span>

        <div className="mt-1 flex items-center justify-between gap-1.5">
          <div className="font-mono-tabular font-bold text-sm text-slate-900">
            {value} {t.paxUnit}
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#19398a]" : ""
            }`}
          />
        </div>
      </button>

      {/* Custom Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1.5 w-[260px] sm:w-[280px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-900">
                {t.passengersLabel}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {t.adultsDesc}
              </div>
            </div>

            {/* Stepper Buttons */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={decrement}
                disabled={value <= 1}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="w-6 text-center font-mono-tabular font-bold text-sm text-[#19398a]">
                {value}
              </span>

              <button
                type="button"
                onClick={increment}
                disabled={value >= 6}
                className="w-7 h-7 rounded-lg bg-[#19398a] text-white flex items-center justify-center hover:bg-[#132c6d] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Select Buttons Grid */}
          <div className="mt-3">
            <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              {t.maxPassengers}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChange(num)}
                  className={`py-1.5 rounded-lg font-mono-tabular text-xs font-bold transition cursor-pointer ${
                    value === num
                      ? "bg-[#19398a] text-white shadow-xs border border-[#eab308]"
                      : "bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-[#19398a]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 rounded-xl bg-[#19398a] hover:bg-[#132c6d] text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              {t.done}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
