import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { doctors, scheduleEntries } from "../drizzle/schema";

export async function calculateEarningsFormMonth(profileId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];

  // Busca todos os médicos para pegar o shiftRate
  const allDoctors = await db.select().from(doctors).where(eq(doctors.profileId, profileId));
  
  // Busca todas as entradas de escala do mês
  // Nota: Isso é uma simplificação. Em produção, buscaríamos via join ou query otimizada.
  const entries = await db.select().from(scheduleEntries).where(sql`MONTH(entryDate) = ${month} AND YEAR(entryDate) = ${year}`);

  const report = allDoctors.map(doctor => {
    const doctorEntries = entries.filter(e => e.doctorId === doctor.id);
    const baseEarnings = doctorEntries.length * (doctor.shiftRate || 0);
    
    // Simulação de bônus noturno (noite = nightBonus)
    const nightShifts = doctorEntries.filter(e => e.shiftType === 'noite').length;
    const nightBonusTotal = nightShifts * (doctor.nightBonus || 0);

    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      shiftCount: doctorEntries.length,
      nightShiftCount: nightShifts,
      baseEarnings,
      nightBonusTotal,
      total: baseEarnings + nightBonusTotal,
    };
  });

  return report;
}
