import { useMemo } from "react";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { trpc } from "@/lib/trpc";
import { PRODUCT_SHIFT_OPTIONS } from "@/lib/productShifts";

export function useActiveProfilePresentation() {
  const { activeProfileId } = useScheduleProfile();
  const { data: profiles } = trpc.scheduleProfiles.list.useQuery();

  const activeProfileName = useMemo(
    () =>
      profiles?.find((profile) => profile.id === activeProfileId)?.name ??
      "Equipe Padrão",
    [activeProfileId, profiles]
  );

  return useMemo(
    () => ({
      activeProfileName,
      professionalSingular: "Profissional",
      professionalPlural: "Profissionais",
      professionalPluralLower: "profissionais",
      monthlyScheduleLabel: "escala mensal",
      shiftLabels: {
        manha: "Manha",
        tarde: "Tarde",
        noite: "Noite",
      },
      shiftOptions: PRODUCT_SHIFT_OPTIONS,
    }),
    [activeProfileName]
  );
}
