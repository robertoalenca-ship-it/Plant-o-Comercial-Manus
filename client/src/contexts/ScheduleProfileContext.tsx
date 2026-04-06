import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  getStoredScheduleProfileId,
  setStoredScheduleProfileId,
} from "@/lib/scheduleProfile";

type ScheduleProfileContextValue = {
  activeProfileId: number | null;
  setActiveProfileId: (profileId: number | null) => void;
};

const ScheduleProfileContext = createContext<ScheduleProfileContextValue | null>(
  null
);

export function ScheduleProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeProfileId, setActiveProfileIdState] = useState<number | null>(
    () => getStoredScheduleProfileId()
  );

  const value = useMemo(
    () => ({
      activeProfileId,
      setActiveProfileId: (profileId: number | null) => {
        setActiveProfileIdState(profileId);
        setStoredScheduleProfileId(profileId);
      },
    }),
    [activeProfileId]
  );

  return (
    <ScheduleProfileContext.Provider value={value}>
      {children}
    </ScheduleProfileContext.Provider>
  );
}

export function useScheduleProfile() {
  const context = useContext(ScheduleProfileContext);
  if (!context) {
    throw new Error("useScheduleProfile must be used within ScheduleProfileProvider");
  }
  return context;
}
