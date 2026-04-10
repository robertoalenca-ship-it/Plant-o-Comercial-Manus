import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LegacyShiftType } from "@/lib/productShifts";

interface ShiftEntry {
  doctorId: number;
  doctorName: string;
  doctorColor: string;
  shiftType: LegacyShiftType;
  confirmationStatus: "pending" | "confirmed" | "adjustment_requested";
}

interface TemporalTimelineProps {
  entries: ShiftEntry[];
  dateLabel: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  hour: (i + 7) % 24, // Start at 7 AM
  label: `${((i + 7) % 24).toString().padStart(2, "0")}:00`,
}));

const SHIFT_CONFIG: Record<LegacyShiftType, { start: number; end: number; label: string }> = {
  manha_sus: { start: 7, end: 13, label: "Manhã" },
  manha_convenio: { start: 7, end: 13, label: "Manhã" },
  tarde_sus: { start: 13, end: 19, label: "Tarde" },
  tarde_convenio: { start: 13, end: 19, label: "Tarde" },
  noite: { start: 19, end: 31, label: "Noite" }, // 31 = 7 AM next day
  plantao_24h: { start: 7, end: 31, label: "24h" },
};

export default function TemporalTimeline({
  entries,
  dateLabel,
  className,
}: TemporalTimelineProps) {
  const processedEntries = useMemo(() => {
    return entries.map((entry) => {
      const config = SHIFT_CONFIG[entry.shiftType];
      return {
        ...entry,
        start: config.start,
        end: config.end,
        duration: config.end - config.start,
      };
    });
  }, [entries]);

  const renderHourMark = (hour: number, index: number) => (
    <div
      key={index}
      className={cn(
        "flex-1 border-l border-slate-200 dark:border-slate-800 flex flex-col items-center pt-2 relative",
        index === 0 && "border-l-0"
      )}
    >
      <span className="text-[10px] text-muted-foreground font-medium">{hour.toString().padStart(2, '0')}</span>
      <div className="h-2 w-px bg-slate-200 dark:bg-slate-800 mt-1" />
    </div>
  );

  return (
    <Card className={cn("p-6 overflow-hidden bg-card/50 backdrop-blur-sm border-slate-200/60 dark:border-slate-800/60 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-foreground">Mapa Temporal de Cobertura</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-[10px] font-medium text-muted-foreground">Confirmado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="text-[10px] font-medium text-muted-foreground">Pendente</span>
          </div>
        </div>
      </div>

      <div className="relative mt-8 min-w-[600px]">
        {/* Hour markers grid */}
        <div className="flex h-48 w-full">
          {HOURS.map((h, i) => renderHourMark(h.hour, i))}
        </div>

        {/* Timeline content */}
        <div className="absolute top-10 left-0 w-full h-32 flex flex-col gap-2 pt-2">
          {processedEntries.map((entry, idx) => {
            const leftPercent = ((entry.start - 7) / 24) * 100;
            const widthPercent = (entry.duration / 24) * 100;
            
            return (
              <div
                key={idx}
                className="relative group h-7 transition-all duration-300 hover:z-10"
                style={{
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                }}
              >
                <div 
                  className={cn(
                    "h-full w-full rounded-md border flex items-center px-2 text-[10px] font-bold truncate shadow-sm transition-all",
                    entry.confirmationStatus === "confirmed" 
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-700 dark:text-teal-400" 
                      : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                  )}
                  title={`${entry.doctorName} - ${SHIFT_CONFIG[entry.shiftType].label}`}
                >
                  <div 
                    className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" 
                    style={{ backgroundColor: entry.doctorColor }}
                  />
                  {entry.doctorName}
                </div>
              </div>
            );
          })}

          {processedEntries.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-muted-foreground italic">Nenhum plantão escalado para este dia.</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
