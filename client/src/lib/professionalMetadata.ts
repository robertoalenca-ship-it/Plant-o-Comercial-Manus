type ProfessionalLike = {
  name: string;
  observacoes?: string | null;
};

export function extractProfessionalSector(
  professional: ProfessionalLike
) {
  const notes = professional.observacoes ?? "";
  const sectorLine = notes
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith("Setor:"));

  if (!sectorLine) return null;
  return sectorLine.replace(/^Setor:\s*/i, "").trim() || null;
}

export function getProfessionalSectorLabel(
  professional: ProfessionalLike
) {
  return extractProfessionalSector(professional) ?? "Sem setor definido";
}

export function formatProfessionalOptionLabel(
  professional: ProfessionalLike
) {
  const sector = extractProfessionalSector(professional);
  return sector ? `${professional.name} - ${sector}` : professional.name;
}
