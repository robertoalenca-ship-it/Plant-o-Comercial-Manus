import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Repeat, Calendar, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function Swaps() {
  const { activeProfileId } = useScheduleProfile();
  const utils = trpc.useUtils();

  // No backend, o getScheduleByMonth retorna a escala com entries.
  // Precisamos de uma lista de swapRequests pendentes para o perfil ativo.
  // Vou assumir que existe um endpoint ou filtrar no frontend por enquanto.
  
  const schedulesQuery = trpc.schedules.getByMonth.useQuery(
    { year: new Date().getFullYear(), month: new Date().getMonth() + 1 },
    { enabled: !!activeProfileId }
  );

  const swapRequestsQuery = trpc.swapRequests.listForSchedule.useQuery(
    { scheduleId: schedulesQuery.data?.id ?? 0 },
    { enabled: !!schedulesQuery.data?.id }
  );

  const approveMutation = trpc.swapRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Troca aprovada", { description: "A escala foi atualizada com sucesso." });
      utils.swapRequests.listForSchedule.invalidate();
      utils.schedules.getByMonth.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao aprovar", { description: err.message });
    }
  });

  const rejectMutation = trpc.swapRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Troca rejeitada", { description: "A solicitação foi encerrada." });
      utils.swapRequests.listForSchedule.invalidate();
    }
  });

  const openRequests = swapRequestsQuery.data?.filter(r => r.status === "pending") ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mural de Trocas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie as solicitações de troca e plantões disponíveis no mural.
          </p>
        </div>
        <Badge variant="outline" className="h-8 px-4 text-sm">
          {openRequests.length} solicitações pendentes
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {openRequests.length === 0 ? (
          <Card className="col-span-full border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Repeat className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium">Nenhuma solicitação no mural</p>
              <p className="text-sm text-muted-foreground">
                Novas solicitações de troca direta ou "Open Cover" aparecerão aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          openRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden border-2 border-primary/10 hover:border-primary/20 transition-all">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex items-center justify-between">
                  <Badge variant={request.requestType === "open_cover" ? "secondary" : "outline"}>
                    {request.requestType === "open_cover" ? "Mural (Open)" : "Troca Direta"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    #{request.id}
                  </span>
                </div>
                <CardTitle className="text-lg mt-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Plantão em {format(new Date(request.createdAt), "dd/MM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Solicitante</p>
                    <p className="font-medium">Médico Atual</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Repeat className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Destinatário</p>
                    <p className="font-medium text-primary">
                      {request.targetDoctorId ? "Médico Substituto" : "Qualquer um (Mural)"}
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs font-semibold uppercase mb-1">Motivo</p>
                  <p className="text-sm italic">"{request.reason}"</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={() => approveMutation.mutate({ requestId: request.id })}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-destructive hover:bg-destructive/10"
                    onClick={() => rejectMutation.mutate({ requestId: request.id })}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
