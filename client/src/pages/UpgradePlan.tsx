import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSalesContactUrl } from "@/const";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { isSupportModeEnabled } from "@/lib/supportAccess";
import { trpc } from "@/lib/trpc";
import {
  Check,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const plans = [
  {
    id: "individual" as const,
    name: "Plano Individual",
    description: "Ideal para gerenciar uma unica unidade hospitalar.",
    price: "R$ 500",
    period: "/ mes",
    doctors: "Ate 30 medicos",
    features: [
      "1 Unidade / Clinica",
      "Escala Automatica",
      "Suporte via E-mail",
    ],
    recommended: false,
    maxProfiles: 1,
  },
  {
    id: "expansion" as const,
    name: "Plano Expansao",
    description: "Ideal para gerenciar ate 3 unidades com prioridade.",
    price: "R$ 750",
    period: "/ mes",
    doctors: "Medicos Ilimitados",
    features: [
      "Ate 3 Unidades",
      "Prioridade na Geracao",
      "Suporte WhatsApp",
      "Exportacao Ilimitada",
    ],
    recommended: true,
    maxProfiles: 3,
  },
  {
    id: "enterprise" as const,
    name: "Plano Enterprise",
    description: "Solucao completa para grandes redes e cooperativas.",
    price: "R$ 1.000",
    period: "/ mes",
    doctors: "Ilimitado",
    features: [
      "Ate 10 Unidades",
      "API de Integracao",
      "Gerente Dedicado",
      "Treinamento Onboarding",
    ],
    recommended: false,
    maxProfiles: 10,
  },
];

type SupportProfileSummary = {
  active: boolean;
  createdAt: Date;
  description: string | null;
  id: number;
  name: string;
  ownerEmail: string;
  ownerIsPaid: boolean;
  ownerMaxProfiles: number;
  ownerName: string;
  ownerUserId: number | null;
  updatedAt: Date;
};

export default function UpgradePlan() {
  const salesContactUrl = getSalesContactUrl() || "#";
  const { user } = useAuth();
  const { activeProfileId } = useScheduleProfile();
  const supportModeActive = user?.role === "staff" && isSupportModeEnabled();

  const profilesQuery = trpc.saasAdmin.listProfiles.useQuery(undefined, {
    enabled: supportModeActive,
  });

  const supportProfiles = (profilesQuery.data ?? []) as SupportProfileSummary[];
  const supportTargetProfile =
    supportProfiles.find((profile) => profile.id === activeProfileId) ?? null;

  const checkoutMutation = trpc.payments.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const manualUpgradeMutation = trpc.saasAdmin.manualActivate.useMutation({
    onSuccess: async () => {
      toast.success("Plano aplicado manualmente com sucesso.");
      await profilesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      toast.success("Pagamento realizado! Sua conta sera atualizada em instantes.");
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("canceled")) {
      toast.error("O pagamento foi cancelado.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const isSupportUpgradeAvailable = Boolean(
    supportModeActive && supportTargetProfile?.ownerUserId
  );

  function handlePlanAction(plan: (typeof plans)[number]) {
    if (isSupportUpgradeAvailable && supportTargetProfile?.ownerUserId) {
      manualUpgradeMutation.mutate({
        userId: supportTargetProfile.ownerUserId,
        isPaid: true,
        maxProfiles: plan.maxProfiles,
      });
      return;
    }

    checkoutMutation.mutate({ plan: plan.id });
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Potencialize sua{" "}
          <span className="text-primary font-black uppercase tracking-tighter">
            Escala
          </span>
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Escolha o plano ideal para a sua operacao e livre-se das complexidades
          manuais.
        </p>
      </div>

      {supportModeActive && (
        <div className="mb-8 rounded-[2rem] border border-primary/20 bg-primary/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-primary">
                Modo SaaS
              </p>
              <h2 className="text-xl font-black tracking-tight">
                {supportTargetProfile
                  ? `Aplicar plano para ${supportTargetProfile.name}`
                  : "Selecione uma unidade em suporte para aplicar upgrade"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {supportTargetProfile
                  ? `Conta alvo: ${supportTargetProfile.ownerName} (${supportTargetProfile.ownerEmail}). Status atual: ${
                      supportTargetProfile.ownerIsPaid
                        ? `pago com ${supportTargetProfile.ownerMaxProfiles} unidade(s)`
                        : "trial"
                    }.`
                  : "Sem uma unidade ativa, esta tela continua funcionando como checkout normal."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-bold shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Upgrade manual sem checkout
            </div>
          </div>
        </div>
      )}

      <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
              plan.recommended
                ? "border-primary shadow-lg ring-2 ring-primary/20"
                : ""
            }`}
          >
            {plan.recommended && (
              <div className="absolute top-0 right-0 rounded-bl-lg bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                Mais Vendido
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="min-h-[3rem] text-sm leading-relaxed">
                {plan.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">
                  {plan.price}
                </span>
                <span className="font-medium text-muted-foreground">
                  {plan.period}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-600">
                  <ShieldCheck className="h-5 w-5" />
                  {plan.doctors}
                </div>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm font-medium">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-6">
              <Button
                className={`h-12 w-full text-md font-black transition-all ${
                  plan.recommended
                    ? "bg-primary shadow-lg shadow-primary/25 hover:bg-primary/90"
                    : ""
                }`}
                variant={plan.recommended ? "default" : "outline"}
                disabled={
                  checkoutMutation.isPending ||
                  manualUpgradeMutation.isPending ||
                  (supportModeActive && !isSupportUpgradeAvailable)
                }
                onClick={() => handlePlanAction(plan)}
              >
                {checkoutMutation.isPending || manualUpgradeMutation.isPending ? (
                  "Processando..."
                ) : (
                  <>
                    {isSupportUpgradeAvailable ? (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {isSupportUpgradeAvailable ? "Aplicar Plano" : "Assinar Agora"}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground transition-colors hover:text-primary"
                onClick={() => window.open(salesContactUrl, "_blank")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Tirar duvidas via WhatsApp
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-8 rounded-[2.5rem] border border-dashed border-primary/20 bg-muted/30 p-10 backdrop-blur-sm md:flex-row">
        <div className="flex items-center gap-6">
          <div className="rounded-3xl bg-primary/10 p-4 text-primary shadow-inner">
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight">
              Precisa de algo sob medida?
            </h3>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Customizamos solucoes para grandes instituicoes de saude e redes
              com centenas de unidades.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          className="h-12 rounded-2xl border bg-white px-8 font-bold shadow-sm hover:bg-slate-50"
          onClick={() => window.open(salesContactUrl, "_blank")}
        >
          Consultar Nosso Time
        </Button>
      </div>
    </div>
  );
}
