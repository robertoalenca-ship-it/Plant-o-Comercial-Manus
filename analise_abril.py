"""
Análise completa da Escala de Abril 2026
Verifica: cobertura, conformidade com regras, carga por médico
"""

# ─── Dados extraídos do PDF ───────────────────────────────────────────────────

# Formato: (data, dia_semana, turno, medico, vinculo)
# turnos: manha_sus, manha_conv, tarde_sus, tarde_conv, noite, sab_sus, sab_conv, dom_24h
plantoes = [
    # 01/04 Qua
    ("01/04", "Qua", "manha_sus",  "Fernando Melo", "SUS"),
    ("01/04", "Qua", "manha_conv", "Marcela",        "Conv"),
    ("01/04", "Qua", "tarde_sus",  "Rigel",          "SUS"),
    ("01/04", "Qua", "tarde_conv", "Luan",           "Conv"),
    ("01/04", "Qua", "noite",      "Fernando Melo",  "Conv"),
    # 02/04 Qui
    ("02/04", "Qui", "manha_sus",  "Daniel Souza",   "SUS"),
    ("02/04", "Qui", "manha_conv", "Erisvaldo",      "Conv"),
    ("02/04", "Qui", "tarde_sus",  "Daniel Souza",   "SUS"),
    ("02/04", "Qui", "tarde_conv", "Erisvaldo",      "Conv"),
    ("02/04", "Qui", "noite",      "Daniel Souza",   "SUS"),
    # 03/04 Sex FERIADO
    ("03/04", "Sex-FERIADO", "conv", "Daniel Souza", "Conv"),
    ("03/04", "Sex-FERIADO", "sus",  "Daniel Souza", "SUS"),
    # 04/04 Sáb
    ("04/04", "Sab", "sab_conv",   "Daniel Souza",   "Conv"),
    ("04/04", "Sab", "sab_sus",    "Lara",           "SUS"),
    # 05/04 Dom
    ("05/04", "Dom", "dom_conv_dia",  "Felipe",      "Conv"),
    ("05/04", "Dom", "dom_sus_dia",   "Felipe",      "SUS"),
    ("05/04", "Dom", "dom_conv_noite","Lara",        "Conv"),
    # 06/04 Seg
    ("06/04", "Seg", "manha_sus",  "Nelio",          "SUS"),
    ("06/04", "Seg", "manha_conv", "Luiz Rogério",   "Conv"),
    ("06/04", "Seg", "tarde_sus",  "Nelio",          "SUS"),
    ("06/04", "Seg", "tarde_conv", "Humberto",       "Conv"),
    ("06/04", "Seg", "noite",      "Nelio",          "Conv"),
    # 07/04 Ter
    ("07/04", "Ter", "manha_sus",  "Daniel Osamu",   "SUS"),
    ("07/04", "Ter", "manha_conv", "Erisvaldo",      "Conv"),
    ("07/04", "Ter", "tarde_sus",  "Daniel Osamu",   "SUS"),
    ("07/04", "Ter", "tarde_conv", "Erisvaldo",      "Conv"),
    ("07/04", "Ter", "noite",      "Erisvaldo",      "Conv"),
    # 08/04 Qua
    ("08/04", "Qua", "manha_sus",  "Fernando Melo",  "SUS"),
    ("08/04", "Qua", "manha_conv", "Marcela",        "Conv"),
    ("08/04", "Qua", "tarde_sus",  "Rigel",          "SUS"),
    ("08/04", "Qua", "tarde_conv", "Luan",           "Conv"),
    ("08/04", "Qua", "noite",      "Luan",           "Conv"),
    # 09/04 Qui
    ("09/04", "Qui", "manha_sus",  "Nelio",          "SUS"),
    ("09/04", "Qui", "manha_conv", "Erisvaldo",      "Conv"),
    ("09/04", "Qui", "tarde_sus",  "Breno Aguiar",   "SUS"),
    ("09/04", "Qui", "tarde_conv", "Erisvaldo",      "Conv"),
    ("09/04", "Qui", "noite",      "Breno Aguiar",   "Conv"),
    # 10/04 Sex
    ("10/04", "Sex", "manha_sus",  "Daniel Souza",   "SUS"),
    ("10/04", "Sex", "manha_conv", "Danilo Freire",  "Conv"),
    ("10/04", "Sex", "tarde_sus",  "Italo Bacellar", "SUS"),
    ("10/04", "Sex", "tarde_conv", "Daniel Souza",   "Conv"),
    ("10/04", "Sex", "noite",      "Italo Bacellar", "Conv"),
    # 11/04 Sáb
    ("11/04", "Sab", "sab_conv",   "Italo Bacellar", "Conv"),
    ("11/04", "Sab", "sab_sus",    "Walesca",        "SUS"),
    # 12/04 Dom
    ("12/04", "Dom", "dom_24h",    "Marcela",        "Conv"),
    ("12/04", "Dom", "dom_24h",    "Marcela",        "SUS"),
    # 13/04 Seg
    ("13/04", "Seg", "manha_sus",  "Berg",           "SUS"),
    ("13/04", "Seg", "manha_conv", "Luiz Rogério",   "Conv"),
    ("13/04", "Seg", "tarde_sus",  "Berg",           "SUS"),
    ("13/04", "Seg", "tarde_conv", "Humberto",       "Conv"),
    ("13/04", "Seg", "noite",      "Luiz Rogério",   "Conv"),
    # 14/04 Ter
    ("14/04", "Ter", "manha_sus",  "Daniel Osamu",   "SUS"),
    ("14/04", "Ter", "manha_conv", "Erisvaldo",      "Conv"),
    ("14/04", "Ter", "tarde_sus",  "Daniel Osamu",   "SUS"),
    ("14/04", "Ter", "tarde_conv", "Erisvaldo",      "Conv"),
    ("14/04", "Ter", "noite",      "Erisvaldo",      "Conv"),
    # 15/04 Qua
    ("15/04", "Qua", "manha_sus",  "Fernando Melo",  "SUS"),
    ("15/04", "Qua", "manha_conv", "Marcela",        "Conv"),
    ("15/04", "Qua", "tarde_sus",  "Rigel",          "SUS"),
    ("15/04", "Qua", "tarde_conv", "Luan",           "Conv"),
    ("15/04", "Qua", "noite",      "Luan",           "Conv"),
    # 16/04 Qui
    ("16/04", "Qui", "manha_sus",  "Daniel Souza",   "SUS"),
    ("16/04", "Qui", "manha_conv", "Erisvaldo",      "Conv"),
    ("16/04", "Qui", "tarde_sus",  "Daniel Souza",   "SUS"),
    ("16/04", "Qui", "tarde_conv", "Erisvaldo",      "Conv"),
    ("16/04", "Qui", "noite",      "Daniel Souza",   "Conv"),
    # 17/04 Sex
    ("17/04", "Sex", "manha_sus",  "Caio Silva",     "SUS"),
    ("17/04", "Sex", "manha_conv", "Danilo Freire",  "Conv"),
    ("17/04", "Sex", "tarde_sus",  "Caio Silva",     "SUS"),
    ("17/04", "Sex", "tarde_conv", "Nelio",          "Conv"),
    ("17/04", "Sex", "noite",      "Rigel",          "Conv"),
    # 18/04 Sáb
    ("18/04", "Sab", "sab_conv",   "Fernando Melo",  "Conv"),
    ("18/04", "Sab", "sab_sus",    "Caio Silva",     "SUS"),
    # 19/04 Dom
    ("19/04", "Dom", "dom_24h",    "Nelio",          "Conv"),
    ("19/04", "Dom", "dom_24h",    "Nelio",          "SUS"),
    # 20/04 Seg
    ("20/04", "Seg", "manha_sus",  "Nelio",          "SUS"),
    ("20/04", "Seg", "manha_conv", "Luiz Rogério",   "Conv"),
    ("20/04", "Seg", "tarde_sus",  "Nelio",          "SUS"),
    ("20/04", "Seg", "tarde_conv", "Humberto",       "Conv"),
    ("20/04", "Seg", "noite",      "Berg",           "Conv"),
    # 21/04 Ter FERIADO
    ("21/04", "Ter-FERIADO", "conv", "Erisvaldo",    "Conv"),
    ("21/04", "Ter-FERIADO", "sus",  "Erisvaldo",    "SUS"),
    # 22/04 Qua
    ("22/04", "Qua", "manha_sus",  "Fernando Melo",  "SUS"),
    ("22/04", "Qua", "manha_conv", "Marcela",        "Conv"),
    ("22/04", "Qua", "tarde_sus",  "Rigel",          "SUS"),
    ("22/04", "Qua", "tarde_conv", "Luan",           "Conv"),
    ("22/04", "Qua", "noite",      "Fernando Melo",  "Conv"),
    # 23/04 Qui
    ("23/04", "Qui", "manha_sus",  "Nelio",          "SUS"),
    ("23/04", "Qui", "manha_conv", "Erisvaldo",      "Conv"),
    ("23/04", "Qui", "tarde_sus",  "Breno Aguiar",   "SUS"),
    ("23/04", "Qui", "tarde_conv", "Erisvaldo",      "Conv"),
    ("23/04", "Qui", "noite",      "Nelio",          "SUS"),
    # 24/04 Sex
    ("24/04", "Sex", "manha_sus",  "Italo Bacellar", "SUS"),
    ("24/04", "Sex", "manha_conv", "Danilo Freire",  "Conv"),
    ("24/04", "Sex", "tarde_sus",  "Italo Bacellar", "SUS"),
    ("24/04", "Sex", "tarde_conv", "Breno Aguiar",   "Conv"),
    ("24/04", "Sex", "noite",      "Italo Bacellar", "Conv"),
    # 25/04 Sáb
    ("25/04", "Sab", "sab_conv",   "Italo Bacellar", "Conv"),
    ("25/04", "Sab", "sab_sus",    "Thaiane",        "SUS"),
    # 26/04 Dom
    ("26/04", "Dom", "dom_24h",    "Danilo Fonseca", "Conv"),
    ("26/04", "Dom", "dom_24h",    "Danilo Fonseca", "SUS"),
    # 27/04 Seg
    ("27/04", "Seg", "manha_sus",  "Berg",           "SUS"),
    ("27/04", "Seg", "manha_conv", "Luiz Rogério",   "Conv"),
    ("27/04", "Seg", "tarde_sus",  "Berg",           "SUS"),
    ("27/04", "Seg", "tarde_conv", "Humberto",       "Conv"),
    ("27/04", "Seg", "noite",      "Humberto",       "Conv"),
    # 28/04 Ter
    ("28/04", "Ter", "manha_sus",  "Daniel Osamu",   "SUS"),
    ("28/04", "Ter", "manha_conv", "Erisvaldo",      "Conv"),
    ("28/04", "Ter", "tarde_sus",  "Daniel Osamu",   "SUS"),
    ("28/04", "Ter", "tarde_conv", "Erisvaldo",      "Conv"),
    ("28/04", "Ter", "noite",      "Erisvaldo",      "Conv"),
    # 29/04 Qua
    ("29/04", "Qua", "manha_sus",  "Fernando Melo",  "SUS"),
    ("29/04", "Qua", "manha_conv", "Marcela",        "Conv"),
    ("29/04", "Qua", "tarde_sus",  "Rigel",          "SUS"),
    ("29/04", "Qua", "tarde_conv", "Luan",           "Conv"),
    ("29/04", "Qua", "noite",      "Rigel",          "Conv"),
    # 30/04 Qui
    ("30/04", "Qui", "manha_sus",  "Daniel Souza",   "SUS"),
    ("30/04", "Qui", "manha_conv", "Erisvaldo",      "Conv"),
    ("30/04", "Qui", "tarde_sus",  "Daniel Souza",   "SUS"),
    ("30/04", "Qui", "tarde_conv", "Erisvaldo",      "Conv"),
    ("30/04", "Qui", "noite",      "Daniel Souza",   "Conv"),
]

# ─── Análise de carga por médico ─────────────────────────────────────────────
from collections import defaultdict

stats = defaultdict(lambda: {"total": 0, "noites": 0, "fds": 0, "sus": 0, "conv": 0, "dias": []})

for data, dia, turno, medico, vinculo in plantoes:
    # Deduplicar: Marcela dom_24h aparece 2x (SUS e Conv) mas é 1 plantão
    chave = (data, medico, turno)
    stats[medico]["total"] += 1
    stats[medico]["dias"].append(f"{data} {turno}")
    if turno == "noite":
        stats[medico]["noites"] += 1
    if dia in ("Sab", "Dom"):
        stats[medico]["fds"] += 1
    if vinculo == "SUS":
        stats[medico]["sus"] += 1
    else:
        stats[medico]["conv"] += 1

print("=" * 70)
print("ANÁLISE DE CARGA — ABRIL 2026")
print("=" * 70)
print(f"{'Médico':<20} {'Total':>6} {'Noites':>7} {'FDS':>5} {'SUS':>5} {'Conv':>6}")
print("-" * 70)

for medico, s in sorted(stats.items(), key=lambda x: -x[1]["total"]):
    print(f"{medico:<20} {s['total']:>6} {s['noites']:>7} {s['fds']:>5} {s['sus']:>5} {s['conv']:>6}")

print()

# ─── Verificação de cobertura ─────────────────────────────────────────────────
print("=" * 70)
print("VERIFICAÇÃO DE COBERTURA — DIAS ÚTEIS")
print("=" * 70)

dias_uteis = [
    ("01/04","Qua"), ("02/04","Qui"), ("06/04","Seg"), ("07/04","Ter"),
    ("08/04","Qua"), ("09/04","Qui"), ("10/04","Sex"), ("13/04","Seg"),
    ("14/04","Ter"), ("15/04","Qua"), ("16/04","Qui"), ("17/04","Sex"),
    ("20/04","Seg"), ("22/04","Qua"), ("23/04","Qui"), ("24/04","Sex"),
    ("27/04","Seg"), ("28/04","Ter"), ("29/04","Qua"), ("30/04","Qui"),
]
turnos_obrigatorios = ["manha_sus", "manha_conv", "tarde_sus", "tarde_conv", "noite"]

cobertura_ok = 0
cobertura_falta = []
for data, dia in dias_uteis:
    turnos_dia = {t for d, _, t, _, _ in plantoes if d == data}
    faltando = [t for t in turnos_obrigatorios if t not in turnos_dia]
    if faltando:
        cobertura_falta.append((data, dia, faltando))
    else:
        cobertura_ok += 1

print(f"Dias com cobertura completa: {cobertura_ok}/{len(dias_uteis)}")
if cobertura_falta:
    print("Dias com turnos descobertos:")
    for data, dia, faltando in cobertura_falta:
        print(f"  {data} ({dia}): {', '.join(faltando)}")
else:
    print("✅ Todos os dias úteis têm cobertura completa!")

print()

# ─── Verificação de FDS ───────────────────────────────────────────────────────
print("=" * 70)
print("VERIFICAÇÃO DE FINAIS DE SEMANA")
print("=" * 70)

fds = [
    ("04/04","Sab"), ("05/04","Dom"),
    ("11/04","Sab"), ("12/04","Dom"),
    ("18/04","Sab"), ("19/04","Dom"),
    ("25/04","Sab"), ("26/04","Dom"),
]
for data, dia in fds:
    turnos_dia = [(t, m) for d, _, t, m, _ in plantoes if d == data]
    medicos_dia = list(set(m for _, m in turnos_dia))
    print(f"  {data} ({dia}): {', '.join(medicos_dia)}")

print()

# ─── Verificação de regras semanais ──────────────────────────────────────────
print("=" * 70)
print("CONFORMIDADE COM REGRAS SEMANAIS")
print("=" * 70)

regras = {
    "Seg": {"manha_sus": "Berg/Nelio", "manha_conv": "Luiz Rogério", "tarde_sus": "Berg/Nelio", "tarde_conv": "Humberto"},
    "Ter": {"manha_sus": "Daniel Osamu", "manha_conv": "Erisvaldo", "tarde_sus": "Daniel Osamu", "tarde_conv": "Erisvaldo"},
    "Qua": {"manha_sus": "Fernando Melo", "manha_conv": "Marcela", "tarde_sus": "Rigel", "tarde_conv": "Luan"},
    "Qui": {"manha_sus": "Nelio/Daniel Souza", "manha_conv": "Erisvaldo", "tarde_sus": "Nelio/Breno/Daniel Souza", "tarde_conv": "Erisvaldo"},
    "Sex": {"manha_sus": "Daniel Souza/Italo/Caio Silva", "manha_conv": "Danilo Freire", "tarde_sus": "Italo/Daniel Souza/Caio Silva", "tarde_conv": "Daniel Souza/Nelio/Breno"},
}

dias_por_semana = defaultdict(list)
for data, dia in [
    ("01/04","Qua"), ("02/04","Qui"), ("06/04","Seg"), ("07/04","Ter"),
    ("08/04","Qua"), ("09/04","Qui"), ("10/04","Sex"), ("13/04","Seg"),
    ("14/04","Ter"), ("15/04","Qua"), ("16/04","Qui"), ("17/04","Sex"),
    ("20/04","Seg"), ("22/04","Qua"), ("23/04","Qui"), ("24/04","Sex"),
    ("27/04","Seg"), ("28/04","Ter"), ("29/04","Qua"), ("30/04","Qui"),
]:
    dias_por_semana[dia].append(data)

for dia_sem, regra_dia in regras.items():
    print(f"\n{dia_sem}:")
    for data in dias_por_semana.get(dia_sem, []):
        for turno, esperado in regra_dia.items():
            real = [m for d, _, t, m, _ in plantoes if d == data and t == turno]
            medico_real = real[0] if real else "DESCOBERTO"
            ok = "✅" if real else "❌"
            print(f"  {data} {turno}: {medico_real} (esperado: {esperado}) {ok}")

print()
print("=" * 70)
print("RESUMO PARA GERAÇÃO DE MAIO")
print("=" * 70)
print("Médicos com mais plantões em abril (prioridade para menos plantões em maio):")
for medico, s in sorted(stats.items(), key=lambda x: -x[1]["total"])[:8]:
    print(f"  {medico}: {s['total']} plantões, {s['noites']} noites, {s['fds']} FDS")

print("\nMédicos com poucos/nenhum plantão em abril (prioridade para mais em maio):")
ausentes = ["Caio Petruz", "Roberto Filho"]
for medico, s in sorted(stats.items(), key=lambda x: x[1]["total"])[:6]:
    print(f"  {medico}: {s['total']} plantões")
for m in ausentes:
    print(f"  {m}: 0 plantões (ausente em abril)")
