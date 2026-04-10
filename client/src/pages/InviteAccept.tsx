import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppBrand from "@/components/AppBrand";
import { CheckCircle2, ShieldCheck, Lock, ArrowRight } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function InviteAccept() {
  const [location, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const acceptInviteMutation = trpc.auth.acceptInvite.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      toast.success("Conta ativada com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao ativar conta");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Link de convite inválido.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    await acceptInviteMutation.mutateAsync({
      token,
      password,
    });
  };

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Link Inválido</h1>
          <p className="text-slate-600">
            Este link de convite é inválido ou expirou. Por favor, solicite um novo convite ao administrador do sistema.
          </p>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-6 max-w-md animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center shadow-lg shadow-teal-100/50">
            <CheckCircle2 className="w-10 h-10 text-teal-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Tudo pronto!</h1>
            <p className="text-slate-600">
              Sua conta foi ativada com sucesso. Agora você pode acessar o sistema de escalas com suas novas credenciais.
            </p>
          </div>
          <Button 
            size="lg" 
            className="w-full bg-[#14B8A6] hover:bg-[#0D9488] shadow-lg shadow-[#14B8A6]/20 transition-all font-semibold"
            onClick={() => setLocation("/")}
          >
            Ir para o Login <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 flex-col lg:flex-row">
      <Toaster position="top-center" richColors />
      
      {/* Visual Identity Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-premium-gradient opacity-20" />
        <div className="relative z-10 max-w-lg space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#14B8A6] rounded-xl flex items-center justify-center shadow-lg shadow-[#14B8A6]/40">
              <Stethoscope className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Escala Inteligente</span>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight">
              Seja bem-vindo à nova era da coordenação médica.
            </h2>
            <p className="text-slate-400 text-lg">
              Simplificamos a gestão para que você foque no que realmente importa: o cuidado com seus pacientes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-1">Escalas Reais</h3>
              <p className="text-slate-500 text-sm">Atualizações em tempo real no seu celular.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-1">Trocas Fáceis</h3>
              <p className="text-slate-500 text-sm">Solicite e aprove trocas com um clique.</p>
            </div>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#14B8A6] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500 rounded-full blur-[120px] opacity-10 translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-4">
            <div className="lg:hidden mb-12">
               <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#14B8A6] rounded-lg flex items-center justify-center">
                  <Stethoscope className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold text-slate-900">Escala Inteligente</span>
              </div>
            </div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold uppercase tracking-wider">
              Configuração de Conta
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ative seu acesso</h2>
            <p className="text-slate-500">
              Para concluir seu cadastro, escolha uma senha segura para o sistema.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 h-12 bg-white border-slate-200 focus:border-[#14B8A6] focus:ring-[#14B8A6]/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="confirmPassword">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="pl-10 h-12 bg-white border-slate-200 focus:border-[#14B8A6] focus:ring-[#14B8A6]/20 transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 bg-[#14B8A6] hover:bg-[#0D9488] shadow-md shadow-[#14B8A6]/20 transition-all font-semibold"
              disabled={acceptInviteMutation.isPending}
            >
              {acceptInviteMutation.isPending ? "Ativando..." : "Confirmar e Ativar Conta"}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Ao ativar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stethoscope(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.8 2.3A.3.3 0 1 0 5 2a.3.3 0 0 0-.2.3Z" />
      <path d="M10 22v-2" />
      <path d="M11 14H9a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z" />
      <path d="M15.8 3.5c.4.1.7.5.7.9v1.1c0 .5-.4.9-.9.9s-.9-.4-.9-.9V4.4c0-.4.3-.8.7-.9Z" />
      <path d="M16 14v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2Z" />
      <path d="M21 21v-3" />
      <path d="M3 21v-3" />
      <path d="M5 10V6a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4" />
      <path d="M5 12h14" />
      <path d="M7 10h10" />
      <path d="M8 21v-3" />
    </svg>
  );
}
