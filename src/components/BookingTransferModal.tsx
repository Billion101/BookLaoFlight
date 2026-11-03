"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Lock,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import { CurrencyCode, FlightResult } from "@/types/flight";
import { formatMoneyDisplay } from "./FlightTicketCard";

export interface BookingTransferTarget {
  flight: FlightResult;
  selectedBrandName?: string;
  selectedBrandPrice?: number;
  selectedBaggageKg?: number;
  bookingUrl: string;
}

interface BookingTransferModalProps {
  target: BookingTransferTarget | null;
  displayCurrency: CurrencyCode;
  adults: number;
  onClose: () => void;
}

export function BookingTransferModal({
  target,
  displayCurrency,
  adults,
  onClose
}: BookingTransferModalProps) {
  const [countdown, setCountdown] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (!target) {
      setCountdown(3);
      setIsPaused(false);
      setHasOpened(false);
      return;
    }

    setCountdown(3);
    setIsPaused(false);
    setHasOpened(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (isPaused) return prev;
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [target, isPaused]);

  useEffect(() => {
    if (countdown === 0 && !hasOpened && target) {
      setHasOpened(true);
      window.open(target.bookingUrl, "_blank", "noopener,noreferrer");
    }
  }, [countdown, hasOpened, target]);

  if (!target) return null;

  const { flight, selectedBrandName, selectedBrandPrice, selectedBaggageKg, bookingUrl } = target;

  const handleManualOpen = () => {
    setHasOpened(true);
    window.open(bookingUrl, "_blank", "noopener,noreferrer");
  };

  const brandToDisplay = selectedBrandName || flight.fareBrand || "Standard Cabin";
  const priceToDisplay = selectedBrandPrice || flight.price.amount;
  const baggageToDisplay = selectedBaggageKg || flight.baggageKg || 20;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-[#19398a] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Direct Booking Handoff
              </h3>
              <p className="text-[11px] text-slate-300 font-mono-tabular">
                Connecting to {flight.airline} Official Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close transfer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Selected Itinerary Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base">
                  {flight.airline}
                </span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-mono-tabular font-bold text-slate-800">
                  {flight.flightNumber}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold font-mono-tabular flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                {brandToDisplay}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between font-mono-tabular text-sm text-slate-700">
              <div>
                <span className="font-bold text-slate-900 text-base">
                  {flight.origin.code}
                </span>{" "}
                <span className="text-xs text-slate-500">
                  ({flight.origin.name.split(" ")[0]})
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>────────</span>
                <span>✈</span>
                <span>────────</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base">
                  {flight.destination.code}
                </span>{" "}
                <span className="text-xs text-slate-500">
                  ({flight.destination.name.split(" ")[0]})
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600 font-mono-tabular">
                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                {baggageToDisplay}kg Checked Baggage Included
              </span>
              <div className="text-right">
                <span className="text-slate-500 text-[11px] block">
                  Official Fare
                </span>
                <span className="font-mono-tabular text-lg font-bold text-slate-900">
                  {formatMoneyDisplay(priceToDisplay, displayCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* 3-Step Guided Action Plan for User */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              คำแนะนำเพื่อความสะดวกในการจอง (Quick 3 Steps)
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-sky-50/70 border border-sky-100 text-slate-800">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-semibold text-sky-950">
                    เรากำลังเปิดหน้าสำรองที่นั่งทางการในแท็บใหม่
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    ระบบได้ส่งข้อมูลเส้นทาง วันที่ และจำนวนผู้โดยสารไปยังระบบของ {flight.airline} ให้เรียบร้อยแล้ว
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 text-slate-800">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-semibold text-amber-950">
                    คลิกเลือกแพ็กเกจ &ldquo;{brandToDisplay}&rdquo; บนเที่ยวบิน {flight.flightNumber}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    มองหาเที่ยวบิน {flight.flightNumber} แล้วกดเลือกราคา{" "}
                    <strong>{formatMoneyDisplay(priceToDisplay, displayCurrency)}</strong> เพื่อล็อกราคาเดียวกัน
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-semibold text-emerald-950">
                    กรอกข้อมูลผู้โดยสารและชำระเงินโดยตรง
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    ชำระเงินกับสายการบินโดยตรง ปลอดภัย 100% ไม่มีค่าธรรมเนียมคนกลาง ได้รับ E-Ticket ทันที
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Redirect Countdown Bar */}
          <div className="bg-slate-100 rounded-xl p-3 flex items-center justify-between text-xs font-mono-tabular">
            <div className="flex items-center gap-2">
              {countdown > 0 ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-xs">
                    {countdown}
                  </div>
                  <span className="text-slate-700">
                    {isPaused
                      ? "นับถอยหลังถูกหยุดชั่วคราว"
                      : `กำลังเปิดหน้าเว็บสายการบินอัตโนมัติใน ${countdown} วิ...`}
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>เปิดหน้าเว็บสายการบินในแท็บใหม่แล้ว</span>
                </div>
              )}
            </div>

            {countdown > 0 && (
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3 h-3" /> ต่อ
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" /> หยุด
                  </>
                )}
              </button>
            )}
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <strong>ข้อควรรู้ด้านความปลอดภัย (Browser Security):</strong> ตามมาตรฐานเว็บเบราว์เซอร์สากล (Same-Origin Policy) ระบบภายนอกจะไม่สามารถกดคลิกแทนท่านในแท็บของสายการบินได้โดยตรง เพื่อความปลอดภัยของข้อมูลส่วนตัวและบัตรเครดิตของท่าน
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            กลับมายังหน้าค้นหา
          </button>

          <button
            type="button"
            onClick={handleManualOpen}
            className="px-5 py-2.5 rounded-xl bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <span>ไปยังหน้าเว็บ {flight.airline} ทันที</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

