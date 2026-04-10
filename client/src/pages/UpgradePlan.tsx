import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { getSalesContactUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function UpgradePlan() {
  const SALES_CONTACT_URL = getSalesContactUrl() || "#";
  const [location, setLocation] = useLocation();
  
  const checkoutMutation = trpc.payments.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      toast.success("Pagamento realizado! Sua conta será atualizada em instantes.");
      // Limpar URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("canceled")) {
      toast.error("O pagamento foi cancelado.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const plans = [
    {
      id: "individual",
      name: "Plano Individual",
      description: "Ideal para gerenciar uma única unidade hospitalar.",
      price: "R$ 500",
      period: "/ mês",
      doctors: "Até 30 médicos",
      features: ["1 Unidade / Clínica", "Escala Automática", "Suporte via E-mail"],
      recommended: false,
    },
    {
      id: "expansion",
      name: "Plano Expansão",
      description: "Ideal para gerenciar até 3 unidades com prioridade.",
      price: "R$ 750",
      period: "/ mês",
      doctors: "Médicos Ilimitados",
      features: [
        "Até 3 Unidades",
        "Prioridade na Geração",
        "Suporte WhatsApp",
        "Exportação Ilimitada",
      ],
      recommended: true,
    },
    {
      id: "enterprise",
      name: "Plano Enterprise",
      description: "Solução completa para grandes redes e cooperativas.",
      price: "R$ 1.000",
      period: "/ mês",
      doctors: "Ilimitado",
      features: [
        "Até 10 Unidades",
        "API de Integração",
        "Gerente Dedicado",
        "Treinamento Onboarding",
      ],
      recommended: false,
    },
  ];

  return (
    <div className="container mx-auto py-10 px-4 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
          Potencialize sua <span className="text-primary font-black uppercase tracking-tighter">Escala</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Escolha o plano ideal para a sua operação e livre-se das complexidades manuais.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => (
          <Card 
            key={plan.name} 
            className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
              plan.recommended ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
            }`}
          >
            {plan.recommended && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-[10px] font-black tracking-widest rounded-bl-lg uppercase">
                Mais Vendido
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <CardDescription className="min-h-[3rem] text-sm leading-relaxed">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-black text-foreground">{plan.price}</span>
                <span className="text-muted-foreground font-medium">{plan.period}</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <ShieldCheck className="h-5 w-5" />
                  {plan.doctors}
                </div>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm font-medium">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {feature}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-6">
              <Button 
                className={`w-full font-black h-12 text-md transition-all ${
                  plan.recommended ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" : ""
                }`} 
                variant={plan.recommended ? "default" : "outline"}
                disabled={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate({ plan: plan.id as any })}
              >
                {checkoutMutation.isPending ? (
                  "Processando..."
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Assinar Agora
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => window.open(SALES_CONTACT_URL, "_blank")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Tirar dúvidas via WhatsApp
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-muted/30 rounded-[2.5rem] p-10 border border-dashed border-primary/20 flex flex-col md:flex-row items-center gap-8 justify-between backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="bg-primary/10 p-4 rounded-3xl text-primary shadow-inner">
            <Zap className="h-8 w-8" />
          </div>
          <div>
            <h3 className="font-black text-xl tracking-tight">Precisa de algo sob medida?</h3>
            <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
              Customizamos soluções para grandes instituições de saúde e redes com centenas de unidades.
            </p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          className="h-12 px-8 font-bold rounded-2xl bg-white hover:bg-slate-50 border shadow-sm"
          onClick={() => window.open(SALES_CONTACT_URL, "_blank")}
        >
          Consultar Nosso Time
        </Button>
      </div>
    </div>
  );
}
