import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { appPath } from "@/lib/appRoutes";
import AppBrand from "@/components/AppBrand";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildScheduleProfilePayload,
  emptyScheduleProfileDraft,
  TEAM_SIZE_OPTIONS,
  type TeamSizeOption,
} from "@/lib/scheduleProfileDraft";
import { trpc } from "@/lib/trpc";

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { setActiveProfileId } = useScheduleProfile();
  const [form, setForm] = useState(emptyScheduleProfileDraft);
  const utils = trpc.useUtils();

  const createProfileMutation = trpc.scheduleProfiles.create.useMutation({
    onSuccess: (createdProfile) => {
      toast.success("Equipe criada com sucesso!");

      if (createdProfile?.id) {
        setActiveProfileId(createdProfile.id);
      }

      utils.scheduleProfiles.list.setData(undefined, (currentProfiles) => {
        if (!createdProfile) {
          return currentProfiles ?? [];
        }

        const profiles = currentProfiles ?? [];
        const alreadyExists = profiles.some(
          (profile) => profile.id === createdProfile.id
        );

        if (alreadyExists) {
          return profiles;
        }

        return [...profiles, createdProfile];
      });

      // Mantem o cache sincronizado em background e navega imediatamente
      void utils.scheduleProfiles.list.invalidate();
      setLocation(appPath(), { replace: true });
    },
    onError: (error) => {
      if (error.data?.code === "FORBIDDEN") {
        toast.error("Limite de licença atingido.");
        setLocation(appPath("/upgrade"));
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.teamName.trim()) return;
    if (!form.organizationName.trim()) return;
    if (!form.teamSize) return;

    createProfileMutation.mutate(buildScheduleProfilePayload(form));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="flex justify-center">
          <AppBrand />
        </div>

        <Card className="border-0 px-2 py-4 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Bem-vindo(a), {user?.name?.split(" ")[0] || "Usuário"}!
            </CardTitle>
            <CardDescription className="text-base text-slate-500">
              Vamos criar sua primeira equipe ou setor. O produto será vendido
              por escala, então começamos pelo ambiente operacional que realmente
              usa a agenda no dia a dia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="teamName"
                    className="text-sm font-medium text-slate-700"
                  >
                    Nome da equipe/setor
                  </Label>
                  <Input
                    id="teamName"
                    placeholder="Ex: UTI Adulto"
                    value={form.teamName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        teamName: event.target.value,
                      }))
                    }
                    disabled={createProfileMutation.isPending}
                    required
                    autoFocus
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="organizationName"
                    className="text-sm font-medium text-slate-700"
                  >
                    Hospital/unidade
                  </Label>
                  <Input
                    id="organizationName"
                    placeholder="Ex: Hospital São José"
                    value={form.organizationName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        organizationName: event.target.value,
                      }))
                    }
                    disabled={createProfileMutation.isPending}
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Tamanho da equipe
                  </Label>
                  <Select
                    value={form.teamSize}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        teamSize: value as TeamSizeOption,
                      }))
                    }
                    disabled={createProfileMutation.isPending}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione a faixa" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="specialty"
                    className="text-sm font-medium text-slate-700"
                  >
                    Especialidade
                    <span className="ml-1 text-slate-400">(opcional)</span>
                  </Label>
                  <Input
                    id="specialty"
                    placeholder="Ex: Emergência, Anestesia, UTI"
                    value={form.specialty}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        specialty: event.target.value,
                      }))
                    }
                    disabled={createProfileMutation.isPending}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                O ambiente será criado no modelo padrão
                <strong> Manhã, Tarde e Noite</strong>.
              </div>

              <Button
                type="submit"
                className="h-12 w-full text-md font-medium transition-all"
                disabled={
                  !form.teamName.trim() ||
                  !form.organizationName.trim() ||
                  !form.teamSize ||
                  createProfileMutation.isPending
                }
              >
                {createProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar equipe e começar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
