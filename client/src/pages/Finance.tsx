import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Calendar, Download, PieChart, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Finance() {
  const { activeProfileId } = useScheduleProfile();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const schedulesQuery = trpc.schedules.getByMonth.useQuery(
    { year: selectedYear, month: selectedMonth },
    { enabled: !!activeProfileId }
  );

  const doctorsQuery = trpc.doctors.list.useQuery(undefined, {
    enabled: !!activeProfileId
  });

  // Cálculo de bônus e taxas (Simulação até termos os endpoints de fechamento)
  const totalEarned = doctorsQuery.data?.reduce((acc, doc) => acc + (doc.shiftRate || 0), 0) ?? 0;
  const totalShifts = schedulesQuery.data?.entries.length ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Financeiro</h1>
          <p className="text-muted-foreground">
            Gestão de honorários, bônus e fechamento de repasses médicos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button className="bg-[#14B8A6] hover:bg-[#0D9488]">
            <Wallet className="mr-2 h-4 w-4" />
            Fechar Mês
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(totalEarned / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Plantões</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShifts}</div>
            <p className="text-xs text-muted-foreground">Cobertura de 100% dos turnos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Plantão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 1.200,00</div>
            <p className="text-xs text-muted-foreground">Incluindo bônus noturnos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Divergências</CardTitle>
            <Badge variant="destructive" className="h-5">2 Pendentes</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 2.400,00</div>
            <p className="text-xs text-muted-foreground">Aguardando validação de ponto</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Fechamento por Médico</CardTitle>
            <CardDescription>Valores calculados com base na escala aprovada.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {doctorsQuery.data?.slice(0, 5).map((doctor) => (
                <div key={doctor.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                      {doctor.shortName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{doctor.name}</p>
                      <p className="text-xs text-muted-foreground">6 plantões | 2 noites</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">R$ {(doctor.shiftRate / 100).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-green-600 font-medium">Pronto para repasse</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs" onClick={() => {}}>Ver todos os médicos</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Distribuição de Custos</CardTitle>
            <CardDescription>Proporção de gastos por tipo de turno e bônus.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px]">
             <PieChart className="h-24 w-24 text-muted-foreground/20 mb-4" />
             <p className="text-sm text-muted-foreground italic">Gráfico de distribuição em desenvolvimento.</p>
             <div className="w-full mt-6 space-y-2">
                <div className="flex justify-between text-xs">
                    <span>Plantões Diurnos (60%)</span>
                    <span className="font-bold">R$ 45.000,00</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '60%' }} />
                </div>
                <div className="flex justify-between text-xs mt-2">
                    <span>Adicional Noturno (30%)</span>
                    <span className="font-bold">R$ 22.500,00</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: '30%' }} />
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
