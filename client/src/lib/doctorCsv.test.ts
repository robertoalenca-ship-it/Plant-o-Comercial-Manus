import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import {
  buildDoctorImportTemplateCsv,
  parseDoctorImportCsv,
  parseDoctorImportFile,
} from "./doctorCsv";

describe("parseDoctorImportCsv", () => {
  it("parseia CSV com colunas agregadas em portugues", () => {
    const csv = [
      "nome;nome_curto;categoria;sus;convenio;manha;tarde;noite;final_de_semana;rodizio_noite;limite_plantoes_mes;prioridade;cor;observacoes",
      'Ana Paula;Ana P.;titular;sim;sim;sim;nao;sim;sim;nao;12;alta;#112233;"Evitar feriados"',
    ].join("\n");

    const result = parseDoctorImportCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Ana Paula",
      shortName: "Ana P.",
      category: "titular",
      hasSus: true,
      hasConvenio: true,
      canManhaSus: true,
      canManhaConvenio: true,
      canTardeSus: false,
      canTardeConvenio: false,
      canNoite: true,
      canFinalDeSemana: true,
      prioridade: "alta",
      cor: "#112233",
      observacoes: "Evitar feriados",
    });
  });

  it("detecta delimitador virgula e deriva nome curto quando ausente", () => {
    const csv = [
      "nome,categoria,sus,convenio,manha,tarde,noite",
      "Carlos Eduardo,resident,sim,nao,sim,sim,nao",
    ].join("\n");

    const result = parseDoctorImportCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.delimiter).toBe(",");
    expect(result.rows[0].shortName).toBe("Carlos E.");
    expect(result.rows[0].category).toBe("resident");
  });

  it("retorna erro para categoria invalida", () => {
    const csv = ["nome;categoria;manha", "Medico Teste;desconhecida;sim"].join(
      "\n"
    );

    const result = parseDoctorImportCsv(csv);

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: "categoria invalida",
      },
    ]);
  });

  it("encontra o cabecalho mesmo com linhas introdutorias antes dele", () => {
    const csv = [
      "Cadastro de medicos",
      "Preencha os campos abaixo",
      "nome;nome_curto;categoria;manha;noite",
      "Helena Prado;Helena;titular;sim;nao",
    ].join("\n");

    const result = parseDoctorImportCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Helena Prado",
      shortName: "Helena",
      canManhaSus: true,
      canNoite: false,
    });
  });

  it("parseia XLSX usando a primeira aba da planilha", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["nome", "nome_curto", "categoria", "manha", "noite"],
      ["Marina Souza", "Marina", "titular", "sim", "nao"],
    ]);

    XLSX.utils.book_append_sheet(workbook, sheet, "Medicos");

    const content = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const file = new File([content], "medicos.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseDoctorImportFile(file);

    expect(result.source).toBe("xlsx");
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Marina Souza",
      shortName: "Marina",
      category: "titular",
      canManhaSus: true,
      canManhaConvenio: true,
      canNoite: false,
    });
  });

  it("escolhe automaticamente a aba correta no XLSX", async () => {
    const workbook = XLSX.utils.book_new();
    const introSheet = XLSX.utils.aoa_to_sheet([
      ["Instrucoes de preenchimento"],
      ["Use a aba Medicos para importar os dados"],
    ]);
    const dataSheet = XLSX.utils.aoa_to_sheet([
      ["Equipe Ortopedia"],
      ["nome", "nome_curto", "categoria", "manha", "noite"],
      ["Laura Campos", "Laura", "titular", "sim", "nao"],
    ]);

    XLSX.utils.book_append_sheet(workbook, introSheet, "Leia-me");
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Medicos");

    const content = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
    });
    const file = new File([content], "medicos-com-abas.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseDoctorImportFile(file);

    expect(result.source).toBe("xlsx");
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "Laura Campos",
      shortName: "Laura",
    });
  });
});

describe("buildDoctorImportTemplateCsv", () => {
  it("gera template com cabecalho padrao", () => {
    const template = buildDoctorImportTemplateCsv();

    expect(template).toContain("nome;nome_curto;categoria");
    expect(template).toContain("Ana Paula");
  });
});
