import { useState } from "react";
import AppBrand from "@/components/AppBrand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  
  const createProfileMutation = trpc.scheduleProfiles.create.useMutation({
    onSuccess: async () => {
      toast.success("Sua clínica foi criada com sucesso!");
      await utils.scheduleProfiles.list.invalidate();
      setLocation("/");
    },
    onError: (error) => toast.error(`Erro: ${error.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProfileMutation.mutate({ name: name.trim() });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <AppBrand />
        </div>
        
        <Card className="border-0 shadow-lg px-2 py-4">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Bem-vindo(a), {user?.name?.split(' ')[0] || "Usuário"}!
            </CardTitle>
            <CardDescription className="text-base text-slate-500">
              Parece que este é seu primeiro acesso. Para começarmos, crie o ambiente da sua primeira clínica ou hospital.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clinicName" className="text-sm font-medium text-slate-700">
                  Nome da Clínica/Hospital
                </Label>
                <Input
                  id="clinicName"
                  placeholder="Ex: Clínica São José"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={createProfileMutation.isPending}
                  required
                  autoFocus
                  className="h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-md font-medium transition-all"
                disabled={!name.trim() || createProfileMutation.isPending}
              >
                {createProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Ambiente e Começar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
