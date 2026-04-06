import { useMemo } from "react";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { trpc } from "@/lib/trpc";
import { PRODUCT_SHIFT_OPTIONS } from "@/lib/productShifts";

const MEDICAL_PRESENTATION = {
  professionalSingular: "Medico",
  professionalPlural: "Medicos",
  professionalPluralLower: "medicos",
  monthlyScheduleLabel: "escala medica",
  shiftLabels: {
    manha: "Manha",
    tarde: "Tarde",
    noite: "Noite",
  },
  shiftOptions: PRODUCT_SHIFT_OPTIONS,
};

export function getShiftPresentation() {
  return MEDICAL_PRESENTATION;
}

export function useActiveProfilePresentation() {
  const { activeProfileId } = useScheduleProfile();
  const { data: profiles } = trpc.scheduleProfiles.list.useQuery();

  const activeProfileName = useMemo(
    () =>
      profiles?.find((profile) => profile.id === activeProfileId)?.name ??
      "Clínica Padrão",
    [activeProfileId, profiles]
  );

  return useMemo(
    () => ({
      activeProfileName,
      ...MEDICAL_PRESENTATION,
    }),
    [activeProfileName]
  );
}
