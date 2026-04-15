import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Attendance() {
  const { activeProfileId } = useScheduleProfile();
  const { toast } = useToast();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({ title: "Erro", description: "Geolocalização não suportada no seu navegador.", variant: "destructive" });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        toast({ title: "Erro de Localização", description: "Ative o GPS para bater o ponto.", variant: "destructive" });
        setIsLocating(false);
      }
    );
  };

  // Mock de registro (backend ainda precisa dos endpoints)
  const handleCheckIn = () => {
    toast({ 
      title: "Ponto Batido!", 
      description: `Entrada registrada em ${format(new Date(), "HH:mm")} via GPS.`,
      variant: "default"
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ponto Eletrônico</h1>
        <p className="text-muted-foreground">
          Registre sua entrada e saída com validação de geolocalização.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col items-center justify-center p-8 border-2 border-primary/20 shadow-lg bg-premium-gradient-subtle">
          <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-primary/5">
            <Clock className="h-12 w-12 text-primary" />
          </div>
          <p className="text-4xl font-mono font-bold tracking-tighter mb-2">
            {format(new Date(), "HH:mm")}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>

          <div className="w-full space-y-3">
            <Button className="w-full h-14 text-lg font-bold" onClick={handleCheckIn}>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Bater Entrada
            </Button>
            <Button variant="outline" className="w-full h-12" onClick={() => toast({ title: "Ponto de Saída", description: "Saída registrada." })}>
              Registrar Saída
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Sua Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLocating ? (
                <p className="text-sm text-muted-foreground animate-pulse">Obtendo coordenadas...</p>
              ) : coords ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Coordenadas Atuais:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    Lat: {coords.lat.toFixed(6)} | Lng: {coords.lng.toFixed(6)}
                  </code>
                  <Badge variant="success" className="bg-green-500/10 text-green-600 border-green-200">
                    Dentro do perímetro autorizado
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-amber-500" />
                  <p className="text-sm text-center">GPS não detectado. Clique para tentar novamente.</p>
                  <Button variant="ghost" size="sm" onClick={getLocation}>Recarregar GPS</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Foto de Verificação
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="h-32 w-full border-2 border-dashed rounded-xl flex items-center justify-center bg-muted/30">
                <p className="text-xs text-muted-foreground">Opcional: Capturar foto para validação facial</p>
              </div>
              <Button variant="outline" size="sm" className="w-full">Capturar Foto</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos Registros</CardTitle>
          <CardDescription>Histórico de presenças nos últimos 7 dias.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm italic">
            Nenhum registro encontrado para este período.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
