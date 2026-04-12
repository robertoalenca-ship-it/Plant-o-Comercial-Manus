import * as XLSX from "xlsx";

type DoctorCategory = "titular" | "resident" | "sesab";
type DoctorPriority = "baixa" | "media" | "alta";
export type DoctorImportSource = "csv" | "xlsx" | "xls";

export type DoctorImportRow = {
  name: string;
  shortName: string;
  category: DoctorCategory;
  hasSus: boolean;
  hasConvenio: boolean;
  canManhaSus: boolean;
  canManhaConvenio: boolean;
  canTardeSus: boolean;
  canTardeConvenio: boolean;
  canNoite: boolean;
  canFinalDeSemana: boolean;
  canSabado: boolean;
  canDomingo: boolean;
  can24h: boolean;
  participaRodizioNoite: boolean;
  limiteplantoesmes: number;
  limiteNoitesMes: number;
  limiteFdsMes: number;
  prioridade: DoctorPriority;
  cor: string;
  crmNumber?: string;
  crmState?: string;
  email?: string;
  phone?: string;
  observacoes: string;
};

export type DoctorImportParseError = {
  rowNumber: number;
  message: string;
};

export type DoctorImportPreview = {
  rows: DoctorImportRow[];
  errors: DoctorImportParseError[];
  totalRows: number;
  source: DoctorImportSource;
  delimiter?: ";" | ",";
};

const DEFAULT_COLOR = "#3B82F6";

const HEADER_ALIASES = {
  name: ["nome", "name", "medico", "médico", "nome_completo"],
  shortName: ["nome_curto", "short_name", "shortname", "apelido", "sigla"],
  category: ["categoria", "category"],
  hasSus: ["sus", "atende_sus", "has_sus", "hassus"],
  hasConvenio: [
    "convenio",
    "convênio",
    "atende_convenio",
    "atende_convênio",
    "has_convenio",
    "hasconvenio",
  ],
  canManha: ["manha", "manhã", "turno_manha", "turno_manhã"],
  canManhaSus: ["manha_sus", "manhã_sus", "pode_manha_sus"],
  canManhaConvenio: [
    "manha_convenio",
    "manhã_convenio",
    "manha_convênio",
    "manhã_convênio",
    "pode_manha_convenio",
  ],
  canTarde: ["tarde", "turno_tarde"],
  canTardeSus: ["tarde_sus", "pode_tarde_sus"],
  canTardeConvenio: ["tarde_convenio", "tarde_convênio", "pode_tarde_convenio"],
  canNoite: ["noite", "turno_noite"],
  canFinalDeSemana: ["fds", "final_de_semana", "fim_de_semana", "weekend"],
  canSabado: ["sabado", "sábado"],
  canDomingo: ["domingo"],
  can24h: ["plantao_24h", "plantão_24h", "24h", "can24h"],
  participaRodizioNoite: [
    "rodizio_noite",
    "rodízio_noite",
    "participa_rodizio_noite",
    "participa_rodízio_noite",
    "rodizio",
  ],
  limiteplantoesmes: [
    "limite_plantoes_mes",
    "limite_plantoes_mes",
    "limite_plantoes",
    "limite_mensal",
    "max_plantoes_mes",
  ],
  limiteNoitesMes: ["limite_noites_mes", "limite_noites", "max_noites_mes"],
  limiteFdsMes: ["limite_fds_mes", "limite_fds", "max_fds_mes"],
  prioridade: ["prioridade", "priority"],
  cor: ["cor", "color"],
  observacoes: [
    "observacoes",
    "observações",
    "observacao",
    "observação",
    "obs",
  ],
  crmNumber: ["crm", "crm_numero", "numero_crm"],
  crmState: ["crm_uf", "crm_estado", "uf_crm", "uf"],
  email: ["email", "e-mail", "contato_email"],
  phone: ["telefone", "celular", "whatsapp", "phone", "contato_telefone"],
} satisfies Record<string, string[]>;

const TRUTHY_VALUES = new Set(["1", "true", "sim", "s", "yes", "y", "x", "ok"]);

const FALSY_VALUES = new Set(["0", "false", "nao", "não", "n", "no", ""]);

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function detectDelimiter(text: string): ";" | "," {
  const [headerLine = ""] = text.split(/\r?\n/, 1);
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseCsvText(text: string, delimiter: ";" | ",") {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  const normalizedText = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = "";
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function getColumnIndex(headers: string[], aliases: readonly string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeToken(alias);
    const index = headers.findIndex(header => header === normalizedAlias);
    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function getCellValue(
  row: string[],
  headers: string[],
  aliases: readonly string[]
): string {
  const index = getColumnIndex(headers, aliases);
  if (index < 0) return "";
  return `${row[index] ?? ""}`.trim();
}

function parseBoolean(rawValue: string, defaultValue: boolean) {
  const normalizedValue = normalizeToken(rawValue);

  if (!rawValue.trim()) return defaultValue;
  if (TRUTHY_VALUES.has(normalizedValue)) return true;
  if (FALSY_VALUES.has(normalizedValue)) return false;
  return defaultValue;
}

function parseInteger(
  rawValue: string,
  fallbackValue: number,
  errors: string[],
  fieldLabel: string
) {
  if (!rawValue.trim()) return fallbackValue;

  const parsedValue = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsedValue) || parsedValue < 0) {
    errors.push(`${fieldLabel} invalido`);
    return fallbackValue;
  }

  return parsedValue;
}

function parseCategory(rawValue: string, errors: string[]): DoctorCategory {
  const normalizedValue = normalizeToken(rawValue);

  if (!normalizedValue) return "titular";
  if (["titular", "titular_especialista", "staff"].includes(normalizedValue)) {
    return "titular";
  }
  if (
    ["resident", "residente", "residencia", "resid"].includes(normalizedValue)
  ) {
    return "resident";
  }
  if (["sesab"].includes(normalizedValue)) {
    return "sesab";
  }

  errors.push("categoria invalida");
  return "titular";
}

function parsePriority(rawValue: string, errors: string[]): DoctorPriority {
  const normalizedValue = normalizeToken(rawValue);

  if (!normalizedValue) return "media";
  if (["baixa", "low"].includes(normalizedValue)) return "baixa";
  if (["media", "media_prioridade", "medium"].includes(normalizedValue)) {
    return "media";
  }
  if (["alta", "high"].includes(normalizedValue)) return "alta";

  errors.push("prioridade invalida");
  return "media";
}

function buildShortName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function parseColor(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return DEFAULT_COLOR;
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : DEFAULT_COLOR;
}

function normalizeRows(rows: string[][]) {
  return rows.map(row => row.map(value => `${value ?? ""}`.trim()));
}

function countRecognizedHeaders(headers: string[]) {
  return Object.values(HEADER_ALIASES).reduce((count, aliases) => {
    return count + (getColumnIndex(headers, aliases) >= 0 ? 1 : 0);
  }, 0);
}

function detectHeaderRow(rows: string[][]) {
  const normalizedRows = normalizeRows(rows);
  let bestMatch:
    | {
        headerRowNumber: number;
        normalizedHeaders: string[];
        recognizedHeaders: number;
      }
    | undefined;

  for (
    let rowIndex = 0;
    rowIndex < Math.min(normalizedRows.length, 15);
    rowIndex += 1
  ) {
    const normalizedHeaders = normalizedRows[rowIndex].map(header =>
      normalizeToken(header)
    );

    if (normalizedHeaders.every(value => value === "")) {
      continue;
    }

    const recognizedHeaders = countRecognizedHeaders(normalizedHeaders);
    const hasNameColumn =
      getColumnIndex(normalizedHeaders, HEADER_ALIASES.name) >= 0;

    if (!hasNameColumn) {
      continue;
    }

    if (
      !bestMatch ||
      recognizedHeaders > bestMatch.recognizedHeaders ||
      (recognizedHeaders === bestMatch.recognizedHeaders &&
        rowIndex < bestMatch.headerRowNumber - 1)
    ) {
      bestMatch = {
        headerRowNumber: rowIndex + 1,
        normalizedHeaders,
        recognizedHeaders,
      };
    }
  }

  return bestMatch;
}

function buildDoctorImportPreview(
  rawRows: string[][],
  source: DoctorImportSource,
  delimiter?: ";" | ","
): DoctorImportPreview {
  const csvRows = normalizeRows(rawRows);
  const headerMatch = detectHeaderRow(csvRows);

  if (!headerMatch) {
    const firstNonEmptyRowIndex = csvRows.findIndex(row =>
      row.some(value => value !== "")
    );

    return {
      rows: [],
      errors: [
        {
          rowNumber: firstNonEmptyRowIndex >= 0 ? firstNonEmptyRowIndex + 1 : 1,
          message:
            firstNonEmptyRowIndex >= 0
              ? "A coluna 'nome' e obrigatoria"
              : source === "csv"
                ? "CSV vazio ou sem cabecalho"
                : "Planilha vazia ou sem cabecalho",
        },
      ],
      totalRows: 0,
      source,
      delimiter,
    };
  }

  const { headerRowNumber, normalizedHeaders } = headerMatch;
  const dataRows = csvRows.slice(headerRowNumber);
  const rows: DoctorImportRow[] = [];
  const errors: DoctorImportParseError[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = headerRowNumber + index + 1;
    const rowValues = row.map(value => value.trim());

    if (rowValues.every(value => value === "")) {
      return;
    }

    const rowErrors: string[] = [];
    const name = getCellValue(row, normalizedHeaders, HEADER_ALIASES.name);
    const shortNameValue = getCellValue(
      row,
      normalizedHeaders,
      HEADER_ALIASES.shortName
    );

    if (!name) {
      errors.push({ rowNumber, message: "nome obrigatorio" });
      return;
    }

    const category = parseCategory(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.category),
      rowErrors
    );

    const manhaGeral = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canManha),
      false
    );
    const tardeGeral = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canTarde),
      false
    );
    const fimDeSemanaGeral = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canFinalDeSemana),
      false
    );

    const canManhaSus = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canManhaSus),
      manhaGeral
    );
    const canManhaConvenio = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canManhaConvenio),
      manhaGeral
    );
    const canTardeSus = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canTardeSus),
      tardeGeral
    );
    const canTardeConvenio = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canTardeConvenio),
      tardeGeral
    );

    const canSabado = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canSabado),
      fimDeSemanaGeral
    );
    const canDomingo = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.canDomingo),
      fimDeSemanaGeral
    );
    const canFinalDeSemana = fimDeSemanaGeral || canSabado || canDomingo;

    const hasSus = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.hasSus),
      canManhaSus || canTardeSus
    );
    const hasConvenio = parseBoolean(
      getCellValue(row, normalizedHeaders, HEADER_ALIASES.hasConvenio),
      canManhaConvenio || canTardeConvenio
    );

    const parsedRow: DoctorImportRow = {
      name,
      shortName: shortNameValue || buildShortName(name) || name,
      category,
      hasSus,
      hasConvenio,
      canManhaSus,
      canManhaConvenio,
      canTardeSus,
      canTardeConvenio,
      canNoite: parseBoolean(
        getCellValue(row, normalizedHeaders, HEADER_ALIASES.canNoite),
        false
      ),
      canFinalDeSemana,
      canSabado,
      canDomingo,
      can24h: parseBoolean(
        getCellValue(row, normalizedHeaders, HEADER_ALIASES.can24h),
        false
      ),
      participaRodizioNoite: parseBoolean(
        getCellValue(
          row,
          normalizedHeaders,
          HEADER_ALIASES.participaRodizioNoite
        ),
        false
      ),
      limiteplantoesmes: parseInteger(
        getCellValue(row, normalizedHeaders, HEADER_ALIASES.limiteplantoesmes),
        0,
        rowErrors,
        "limite de plantoes/mes"
      ),
      limiteNoitesMes: parseInteger(
        getCellValue(row, normalizedHeaders, HEADER_ALIASES.limiteNoitesMes),
        0,
        rowErrors,
        "limite de noites/mes"
      ),
      limiteFdsMes: parseInteger(
        getCellValue(row, normalizedHeaders, HEADER_ALIASES.limiteFdsMes),
        0,
        rowErrors,
        "limite de FDS/mes"
      ),
      prioridade: parsePriority(
        getCellValue(row, normalizedHeaders, HEADER_ALIASES.prioridade),
        rowErrors
      ),
      cor: parseColor(getCellValue(row, normalizedHeaders, HEADER_ALIASES.cor)),
      crmNumber: getCellValue(row, normalizedHeaders, HEADER_ALIASES.crmNumber),
      crmState: getCellValue(row, normalizedHeaders, HEADER_ALIASES.crmState),
      email: getCellValue(row, normalizedHeaders, HEADER_ALIASES.email),
      phone: getCellValue(row, normalizedHeaders, HEADER_ALIASES.phone),
      observacoes: getCellValue(
        row,
        normalizedHeaders,
        HEADER_ALIASES.observacoes
      ),
    };

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber,
        message: rowErrors.join(", "),
      });
      return;
    }

    rows.push(parsedRow);
  });

  return {
    rows,
    errors,
    totalRows: rows.length + errors.length,
    source,
    delimiter,
  };
}

function detectImportSource(
  fileName: string,
  mimeType = ""
): DoctorImportSource | null {
  const normalizedName = fileName.trim().toLowerCase();

  if (normalizedName.endsWith(".xlsx")) return "xlsx";
  if (normalizedName.endsWith(".xls")) return "xls";
  if (normalizedName.endsWith(".csv")) return "csv";

  if (mimeType === "text/csv") return "csv";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return "xlsx";
  }
  if (mimeType === "application/vnd.ms-excel") {
    return "xls";
  }

  return null;
}

export function parseDoctorImportCsv(text: string): DoctorImportPreview {
  const delimiter = detectDelimiter(text);
  const csvRows = parseCsvText(text, delimiter);
  return buildDoctorImportPreview(csvRows, "csv", delimiter);
}

export async function parseDoctorImportFile(
  file: Pick<File, "name" | "type" | "text" | "arrayBuffer">
): Promise<DoctorImportPreview> {
  const source = detectImportSource(file.name, file.type);

  if (!source) {
    throw new Error("Formato nao suportado. Use CSV, XLSX ou XLS.");
  }

  if (source === "csv") {
    const text = await file.text();
    return parseDoctorImportCsv(text);
  }

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    dense: true,
  });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, message: "Planilha vazia ou sem abas" }],
      totalRows: 0,
      source,
    };
  }

  const parsedSheets = workbook.SheetNames.map(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = normalizeRows(
      (XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: false,
        blankrows: false,
        defval: "",
      }) as string[][]) ?? []
    );
    const headerMatch = detectHeaderRow(rows);

    return {
      rows,
      sheetName,
      recognizedHeaders: headerMatch?.recognizedHeaders ?? 0,
      hasNameColumn: Boolean(headerMatch),
    };
  }).sort((left, right) => right.recognizedHeaders - left.recognizedHeaders);

  const bestSheet =
    parsedSheets.find(sheet => sheet.hasNameColumn) ?? parsedSheets[0];

  return buildDoctorImportPreview(bestSheet.rows, source);
}

export function buildDoctorImportTemplateCsv() {
  const headers = [
    "nome",
    "nome_curto",
    "categoria",
    "sus",
    "convenio",
    "manha",
    "tarde",
    "noite",
    "final_de_semana",
    "sabado",
    "domingo",
    "rodizio_noite",
    "limite_plantoes_mes",
    "limite_noites_mes",
    "limite_fds_mes",
    "prioridade",
    "cor",
    "crm",
    "uf",
    "email",
    "telefone",
    "observacoes",
  ];

  const sampleRows = [
    [
      "Ana Paula",
      "Ana P.",
      "titular",
      "sim",
      "sim",
      "sim",
      "sim",
      "nao",
      "sim",
      "sim",
      "nao",
      "nao",
      "12",
      "4",
      "2",
      "alta",
      "#3B82F6",
      "12345",
      "SP",
      "ana@medica.com",
      "11999999999",
      "Prefere evitar domingos",
    ],
    [
      "Carlos Lima",
      "Carlos",
      "resident",
      "sim",
      "nao",
      "sim",
      "sim",
      "sim",
      "nao",
      "nao",
      "nao",
      "sim",
      "10",
      "6",
      "0",
      "media",
      "#10B981",
      "67890",
      "RJ",
      "carlos@medico.com",
      "21888888888",
      "",
    ],
  ];

  return [headers, ...sampleRows].map(row => row.join(";")).join("\n");
}
