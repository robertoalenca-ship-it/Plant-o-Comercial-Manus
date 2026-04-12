import { useEffect } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import AppBrand from "@/components/AppBrand";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl, getSalesContactUrl } from "@/const";
import { appPath } from "@/lib/appRoutes";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Lock,
  Shield,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";

const benefits = [
  {
    icon: CalendarDays,
    title: "Substitui planilha e WhatsApp",
    description:
      "Centralize geracao, ajuste e publicacao da escala em um fluxo unico e auditavel.",
  },
  {
    icon: Shield,
    title: "Regras, excecoes e historico",
    description:
      "Padronize a operacao da equipe sem perder flexibilidade para ajustes reais do mes.",
  },
  {
    icon: Download,
    title: "Exportacao pronta para operacao",
    description:
      "Feche a escala e distribua PDF, CSV e visao consolidada sem retrabalho manual.",
  },
];

const steps = [
  {
    title: "Crie a equipe",
    description:
      "Cadastre setor, unidade e o tamanho da operacao para montar um ambiente comercial limpo.",
  },
  {
    title: "Cadastre medicos e regras",
    description:
      "Defina restricoes semanais, finais de semana e excecoes sem depender de memoria ou mensagens soltas.",
  },
  {
    title: "Gere ou importe a escala",
    description:
      "Monte o mes automaticamente ou importe sua planilha atual para acelerar a migracao.",
  },
  {
    title: "Ajuste, aprove e publique",
    description:
      "Conclua a escala com visibilidade, historico e um processo mais profissional para a coordenacao.",
  },
];

const capabilities = [
  "Calendario operacional com ajustes manuais por turno",
  "Cadastro de medicos por equipe ou setor",
  "Regras semanais, finais de semana e excecoes",
  "Importacao da planilha mensal para acelerar onboarding",
  "Exportacao em PDF e CSV para distribuicao da escala",
  "Estrutura multi-equipe para separar operacoes",
];

const plans = [
  {
    name: "Starter",
    price: "R$ 599/mes",
    target: "1 equipe, ate 20 medicos",
    highlight: false,
    items: [
      "Calendario da escala",
      "Cadastro de medicos",
      "Regras e excecoes",
      "Exportacoes operacionais",
    ],
  },
  {
    name: "Pro",
    price: "R$ 990/mes",
    target: "1 equipe, ate 40 medicos",
    highlight: true,
    items: [
      "Tudo do Starter",
      "Auditoria e governanca",
      "Aprovacao de escala",
      "Suporte prioritario",
    ],
  },
  {
    name: "Growth",
    price: "R$ 1.790/mes",
    target: "Ate 3 equipes",
    highlight: false,
    items: [
      "Multiplas equipes",
      "Multi-coordenador",
      "Onboarding assistido",
      "Expansao por unidade",
    ],
  },
];

const faqs = [
  {
    question: "Esse produto serve para qualquer especialidade?",
    answer:
      "Sim. O posicionamento comercial e por equipe ou setor, nao por uma especialidade unica. UTI, pronto atendimento, residencia, cirurgia e anestesia sao exemplos naturais de uso.",
  },
  {
    question: "Preciso abandonar minha planilha no primeiro dia?",
    answer:
      "Nao. O caminho comercial mais seguro e importar a escala atual, validar o fluxo com a coordenacao e migrar a operacao aos poucos.",
  },
  {
    question: "O sistema substitui prontuario ou ERP hospitalar?",
    answer:
      "Nao. O foco aqui e governar a escala da equipe com rapidez, historico e menos retrabalho. Isso deixa o produto mais simples de vender e mais facil de adotar.",
  },
  {
    question: "Como funciona a implantacao inicial?",
    answer:
      "A implantacao pode ser assistida por equipe. O processo ideal inclui cadastro da estrutura, importacao da planilha, treinamento curto e publicacao da primeira escala.",
  },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const appEntryUrl = appPath();

  // Redirect if authenticated
  if (!loading && isAuthenticated) {
    return <Redirect to={appEntryUrl} />;
  }

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation(appEntryUrl);
    }
  }, [isAuthenticated, loading, setLocation, appEntryUrl]);

  const loginUrl = getLoginUrl();
  const salesContactUrl = getSalesContactUrl();
  const primaryUrl =
    !loading && !isAuthenticated && loginUrl ? loginUrl : appEntryUrl;
  const primaryLabel = loading
    ? "Carregando..."
    : isAuthenticated
      ? "Abrir aplicativo"
      : loginUrl
        ? "Entrar com Google"
        : "Entrar no sistema";
  const salesIsExternal = Boolean(
    salesContactUrl && !salesContactUrl.startsWith("/")
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_32%)]" />
      <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(10,10,10,0.9),rgba(10,10,10,0))]" />

      <header className="relative z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0">
        <div className="container mx-auto flex min-h-20 items-center justify-between gap-4 px-4 py-4">
          <AppBrand className="min-w-0" hideSubtitle />

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#beneficios" className="transition-colors hover:text-foreground">
              Beneficios
            </a>
            <a href="#como-funciona" className="transition-colors hover:text-foreground">
              Como funciona
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Planos
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle variant="outline" size="icon" />
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <a href={appEntryUrl}>Entrar</a>
            </Button>
            <Button asChild>
              <a
                href={salesContactUrl ?? "#pricing"}
                {...(salesIsExternal ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {salesContactUrl ? "Agendar demonstracao" : "Ver planos"}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="container mx-auto grid gap-12 py-16 md:py-20 lg:grid-cols-2 lg:items-center lg:py-24 px-4 md:px-6">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="rounded-full border-emerald-200 bg-emerald-50 px-4 py-1 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                B2B SaaS para gestao de escalas medicas por equipe
              </Badge>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                Saia do Excel e opere sua escala medica em um sistema web que o cliente entende e paga.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Organize plantoes, reduza retrabalho da coordenacao e publique a escala mensal com regras, historico e visibilidade para a equipe inteira.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <a href={primaryUrl}>
                  {primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <a
                  href={salesContactUrl ?? "#como-funciona"}
                  {...(salesIsExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {salesContactUrl ? "Falar com comercial" : "Ver como funciona"}
                </a>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="border-white/50 bg-white/80 shadow-sm backdrop-blur dark:bg-card/70">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <Users className="h-4 w-4" />
                    Operacao-alvo
                  </div>
                  <p className="text-2xl font-bold tracking-tight">10 a 60</p>
                  <p className="text-sm text-muted-foreground">medicos por equipe</p>
                </CardContent>
              </Card>
              <Card className="border-white/50 bg-white/80 shadow-sm backdrop-blur dark:bg-card/70">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <Clock className="h-4 w-4" />
                    Implantacao
                  </div>
                  <p className="text-2xl font-bold tracking-tight">Poucos dias</p>
                  <p className="text-sm text-muted-foreground">para primeira escala publicada</p>
                </CardContent>
              </Card>
              <Card className="border-white/50 bg-white/80 shadow-sm backdrop-blur dark:bg-card/70">
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <Shield className="h-4 w-4" />
                    Fluxo
                  </div>
                  <p className="text-2xl font-bold tracking-tight">Regras + historico</p>
                  <p className="text-sm text-muted-foreground">mais previsibilidade na operacao</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-500/18 via-transparent to-cyan-500/18 blur-3xl" />
            <Card className="relative overflow-hidden rounded-[2rem] border-white/50 bg-white/85 shadow-2xl backdrop-blur dark:border-border dark:bg-card/80">
              <CardContent className="space-y-6 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                      Operacao em um lugar so
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight">
                      Escala profissional para equipes medicas
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                      O produto entra onde a dor existe: montar, revisar, aprovar e compartilhar a escala mensal sem caos operacional.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Stethoscope className="h-6 w-6" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-500/12 p-2 text-emerald-700 dark:text-emerald-300">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Regras e excecoes</p>
                        <p className="text-sm text-muted-foreground">
                          Semanais, fim de semana e ajustes mensais.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-cyan-500/12 p-2 text-cyan-700 dark:text-cyan-300">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Geracao e importacao</p>
                        <p className="text-sm text-muted-foreground">
                          Monte a escala ou traga a planilha atual.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-500/12 p-2 text-amber-700 dark:text-amber-300">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Governanca</p>
                        <p className="text-sm text-muted-foreground">
                          Aprovacao, lock e menos improviso fora do sistema.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-violet-500/12 p-2 text-violet-700 dark:text-violet-300">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">Visibilidade mensal</p>
                        <p className="text-sm text-muted-foreground">
                          Cobertura, equilibrio e relatorios em uma mesma tela.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Venda por equipe, nao por hospital inteiro
                  </div>
                  <p className="mt-2 leading-6 text-emerald-800/90 dark:text-emerald-200/90">
                    O produto foi desenhado para vender por setor ou unidade operacional, com implantacao simples e retorno facil de demonstrar.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="beneficios" className="container mx-auto px-4 py-8 md:px-6 md:py-12">
          <div className="mb-8 max-w-3xl space-y-3">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              O que faz o produto parecer profissional
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Beneficios claros para quem coordena a escala e para quem executa a operacao.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              Em vez de vender tecnologia pela tecnologia, a landing mostra o ganho operacional que o comprador entende logo na primeira conversa.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="rounded-[1.5rem] border-white/50 bg-white/80 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 dark:bg-card/70"
              >
                <CardContent className="space-y-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="container mx-auto px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur md:p-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Fluxo comercial simples
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                O caminho de implantacao cabe em uma demo curta.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                O comprador nao precisa entender o sistema inteiro. Ele precisa ver que a equipe sai de um processo fragil para uma rotina governada e mais rapida.
              </p>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  <Building2 className="h-4 w-4" />
                  Ideal para coordenadores, chefes de servico e secretaria da escala
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-800/90 dark:text-emerald-200/90">
                  O sistema se posiciona as gestao de escala por equipe, nao as prontuario, ERP ou plataforma hospitalar completa.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {steps.map((step, index) => (
                <Card key={step.title} className="rounded-[1.5rem] border-border/70">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                        0{index + 1}
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8 md:px-6 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <Card className="rounded-[2rem] border-border/70">
              <CardContent className="space-y-5 p-6 md:p-8">
                <div className="space-y-3">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Escopo do MVP vendavel
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight">
                    O que o cliente ja leva na versao web.
                  </h2>
                </div>

                <div className="space-y-3">
                  {capabilities.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-gradient-to-br from-slate-950 to-emerald-950 text-white shadow-xl">
              <CardContent className="space-y-6 p-6 md:p-8">
                <div className="space-y-3">
                  <Badge className="rounded-full bg-white/12 text-white hover:bg-white/12">
                    Venda com narrativa certa
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Nao tente vender um sistema hospitalar inteiro.
                  </h2>
                  <p className="text-sm leading-7 text-white/75">
                    A tese comercial mais forte e vender governanca da escala por equipe: menos retrabalho, mais previsibilidade e publicacao mais profissional do mes.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <FileText className="h-4 w-4" />
                      Proposta simples
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Venda por equipe ou setor, com implantacao assistida e contrato enxuto.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Users className="h-4 w-4" />
                      Comprador certo
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Coordenador medico, chefe de servico ou secretaria operacional.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
                  Ideal para vender em pilotos pagos, onboarding de poucos dias e expansao por novas equipes dentro da mesma conta.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pricing" className="container mx-auto px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 max-w-3xl space-y-3">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Precos sugeridos
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Planos prontos para comecar a vender por equipe.
            </h2>
            <p className="text-base leading-7 text-muted-foreground">
              O modelo por equipe simplifica proposta, implantacao e expansao. A implantacao assistida continua separada como servico.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`rounded-[2rem] border-border/70 ${
                  plan.highlight
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/10"
                    : "shadow-sm"
                }`}
              >
                <CardContent className="space-y-6 p-6 md:p-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                      {plan.highlight ? (
                        <Badge className="rounded-full">Mais equilibrado</Badge>
                      ) : null}
                    </div>
                    <p className="text-3xl font-bold tracking-tight">{plan.price}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {plan.target}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {plan.items.map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-dashed border-border/80 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                    Implantacao sugerida: R$ 2.500 a R$ 6.000 por equipe.
                  </div>

                  <Button asChild className="w-full">
                    <a
                      href={salesContactUrl ?? primaryUrl}
                      {...(salesIsExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      {salesContactUrl ? "Solicitar proposta" : "Entrar no sistema"}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="container mx-auto px-4 py-10 md:px-6 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Perguntas comuns
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Respostas curtas para as objecoes que travam a venda.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                A landing precisa reduzir a ansiedade do comprador antes mesmo da demo. Quanto mais clara a narrativa, mais facil avancar para proposta.
              </p>
            </div>

            <Card className="rounded-[2rem] border-border/70">
              <CardContent className="p-6 md:p-8">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((item) => (
                    <AccordionItem value={item.question} key={item.question}>
                      <AccordionTrigger className="text-base font-semibold">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-7 text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 md:px-6 md:py-14">
          <Card className="overflow-hidden rounded-[2.25rem] border-0 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-2xl">
            <CardContent className="grid gap-8 p-8 md:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <Badge className="rounded-full bg-white/12 text-white hover:bg-white/12">
                  Proximo passo comercial
                </Badge>
                <h2 className="max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
                  Deixe a escala da equipe sair do improviso e entrar em um processo vendavel, auditavel e replicavel.
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                  A camada publica do produto ja pode mostrar posicionamento, planos e CTA comercial, enquanto o app segue pronto para operacao em /app.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base">
                  <a
                    href={salesContactUrl ?? primaryUrl}
                    {...(salesIsExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {salesContactUrl ? "Agendar demonstracao" : primaryLabel}
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="h-12 border border-white/20 bg-white/10 px-6 text-base text-white hover:bg-white/15"
                >
                  <a href={appEntryUrl}>Entrar no app</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
