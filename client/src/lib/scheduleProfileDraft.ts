export const TEAM_SIZE_OPTIONS = [
  { value: "10-20", label: "10 a 20 médicos" },
  { value: "21-40", label: "21 a 40 médicos" },
  { value: "41-60", label: "41 a 60 médicos" },
] as const;

export type TeamSizeOption = (typeof TEAM_SIZE_OPTIONS)[number]["value"];

export type ScheduleProfileDraft = {
  teamName: string;
  organizationName: string;
  specialty: string;
  teamSize: TeamSizeOption | "";
};

export const emptyScheduleProfileDraft: ScheduleProfileDraft = {
  teamName: "",
  organizationName: "",
  specialty: "",
  teamSize: "",
};

function getTeamSizeLabel(teamSize: TeamSizeOption | "") {
  return (
    TEAM_SIZE_OPTIONS.find((option) => option.value === teamSize)?.label ?? null
  );
}

export function buildScheduleProfilePayload(draft: ScheduleProfileDraft) {
  const specialty = draft.specialty.trim();
  const details = [
    `Unidade: ${draft.organizationName.trim()}`,
    getTeamSizeLabel(draft.teamSize),
    specialty ? `Especialidade: ${specialty}` : null,
    "Turnos: Manhã, tarde e noite",
  ].filter(Boolean);

  return {
    name: draft.teamName.trim(),
    description: details.join(" • "),
  };
}
