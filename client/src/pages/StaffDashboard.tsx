import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useScheduleProfile } from "@/contexts/ScheduleProfileContext";
import { STAFF_HOME_PATH, staffPath, supportPath } from "@/lib/appRoutes";
import { enableSupportMode } from "@/lib/supportAccess";
import { setStoredScheduleProfileId } from "@/lib/scheduleProfile";
import { trpc } from "@/lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Check, 
  Search, 
  Shield, 
  User, 
  X, 
  Zap, 
  LayoutDashboard, 
  Users, 
  Hospital, 
  Activity,
  Calendar as CalendarIcon,
  TrendingUp,
  AlertCircle,
  Mail,
  LogIn
} from "lucide-react";

export default function StaffDashboard() {
  const [userSearch, setUserSearch] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [location, setLocation] = useLocation();
  const { setActiveProfileId } = useScheduleProfile();
  
  // Queries
  const statsQuery = trpc.saasAdmin.getStats.useQuery();
  const notificationHealthQuery = trpc.saasAdmin.getNotificationHealth.useQuery();
  const usersQuery = trpc.saasAdmin.listUsers.useQuery();
  const profilesQuery = trpc.saasAdmin.listProfiles.useQuery();
  
  // Mutations
  const activateMutation = trpc.saasAdmin.manualActivate.useMutation({
    onSuccess: () => {
      toast.success("Licença atualizada com sucesso");
      usersQuery.refetch();
      statsQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  const filteredUsers = usersQuery.data?.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProfiles = profilesQuery.data?.filter(
    (p: any) =>
      p.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(profileSearch.toLowerCase())
  );

  const handleTogglePaid = (userId: number, currentPaid: boolean, maxProfiles: number) => {
    activateMutation.mutate({
      userId,
      isPaid: !currentPaid,
      maxProfiles: maxProfiles,
    });
  };

  const handleChangeProfiles = (userId: number, isPaid: boolean, newMax: number) => {
    activateMutation.mutate({
      userId,
      isPaid,
      maxProfiles: newMax,
    });
  };

  const handleChangeRole = (userId: number, isPaid: boolean, maxProfiles: number, newRole: any) => {
    activateMutation.mutate({
      userId,
      isPaid,
      maxProfiles,
      role: newRole,
    });
  };

  const handleAccessProfile = (profileId: number) => {
    setStoredScheduleProfileId(profileId);
    setActiveProfileId(profileId);
    enableSupportMode(profileId);
    const supportEntryPath = supportPath(`/${profileId}`);

    if (typeof window !== "undefined") {
      window.location.assign(supportEntryPath);
      return;
    }

    setLocation(supportEntryPath);
  };

  const stats = statsQuery.data || { totalUsers: 0, totalProfiles: 0, totalEntries: 0, premiumUsers: 0 };
  const activeTab = useMemo(() => {
    if (location === staffPath("/users")) {
      return "profiles";
    }

    if (location === staffPath("/analytics")) {
      return "system";
    }

    return "users";
  }, [location]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Painel de Gerencia SaaS</h1>
          <p className="text-muted-foreground mt-1">Gerencie clinicas, usuarios e a operacao administrativa da plataforma.</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary font-medium">
                <Shield className="h-3 w-3 mr-2" /> Super Admin Mode
            </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:shadow-blue-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-600 font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Usuários Totais
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Novos usuários nas últimas 24h: 0</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:shadow-purple-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600 font-semibold flex items-center gap-2">
              <Hospital className="h-4 w-4" /> Equipes Ativas
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.totalProfiles}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Unidades de saúde cadastradas</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500/10 to-green-600/5 hover:shadow-green-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600 font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4" /> Assinaturas Pagas
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.premiumUsers}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Taxa de conversão: {stats.totalUsers > 0 ? ((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 hover:shadow-orange-500/10 transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="text-orange-600 font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Plantões Criados
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.totalEntries}</CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground">Volume de dados gerados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value === "profiles") {
            setLocation(staffPath("/users"));
            return;
          }

          if (value === "system") {
            setLocation(staffPath("/analytics"));
            return;
          }

          setLocation(STAFF_HOME_PATH);
        }}
        className="w-full"
      >
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="users" className="rounded-lg gap-2">
            <Users className="h-4 w-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="profiles" className="rounded-lg gap-2">
            <Hospital className="h-4 w-4" /> Clinicas e Unidades
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-lg gap-2">
            <Activity className="h-4 w-4" /> Saúde do Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <Card className="border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
              <div>
                <CardTitle>Gestão Global de Usuários</CardTitle>
                <CardDescription>Controle de licenças e permissões administrativas.</CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                  placeholder="Buscar..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="border-0 shadow-none focus-visible:ring-0 min-w-[250px]"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nível Acesso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cota Equipes</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((u) => (
                    <TableRow key={u.userId} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{u.name || "Sem Nome"}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(val) => handleChangeRole(u.userId, u.isPaid, u.maxProfiles, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Doctor</SelectItem>
                            <SelectItem value="coordinator">Coordinator</SelectItem>
                            <SelectItem value="admin">Clinic Admin</SelectItem>
                            <SelectItem value="staff">SaaS Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {u.isPaid ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                            <Check className="h-3 w-3 mr-1" /> Premium
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-dashed">
                            Trial
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={String(u.maxProfiles)}
                          onValueChange={(val) => handleChangeProfiles(u.userId, u.isPaid, Number(val))}
                        >
                          <SelectTrigger className="w-[80px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="999">∞</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={u.isPaid ? "outline" : "default"}
                          size="sm"
                          className={!u.isPaid ? "bg-amber-500 hover:bg-amber-600 border-none h-8" : "h-8"}
                          onClick={() => handleTogglePaid(u.userId, u.isPaid, u.maxProfiles)}
                        >
                          {u.isPaid ? <X className="h-3 w-3 mr-1" /> : <Zap className="h-3 w-3 mr-1 fill-white" />}
                          {u.isPaid ? "Revogar" : "Ativar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="mt-6">
           <Card className="border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
              <div>
                <CardTitle>Tenants e Unidades</CardTitle>
                <CardDescription>Visualização de todas as clínicas e coordenadores cadastrados.</CardDescription>
              </div>
              <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                  placeholder="Buscar hospital ou proprietário..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="border-0 shadow-none focus-visible:ring-0 min-w-[300px]"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Hospital / Equipe</TableHead>
                    <TableHead>Proprietário</TableHead>
                    <TableHead>Data Criação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">AÃ§Ãµes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles?.map((p: any) => (
                    <TableRow key={p.id} className="hover:bg-muted/20">
                      <TableCell className="font-semibold">{p.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{p.ownerName}</span>
                          <span className="text-xs text-muted-foreground">{p.ownerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleAccessProfile(p.id)}
                        >
                          <LogIn className="h-3.5 w-3.5 mr-1" />
                          Acessar como suporte
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProfiles?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Nenhuma unidade encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl bg-card/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" /> Fila de Notificações
                  </CardTitle>
                  <CardDescription>Status geral das comunicações enviadas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notificationHealthQuery.data?.map((n: any) => (
                      <div key={n.status} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                         <div className="flex items-center gap-2">
                            {n.status === 'sent' && <Check className="h-4 w-4 text-green-500" />}
                            {n.status === 'queued' && <Activity className="h-4 w-4 text-amber-500 animate-pulse" />}
                            {n.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                            <span className="capitalize">{n.status === 'sent' ? 'Enviados' : n.status === 'queued' ? 'Na Fila' : 'Falhas'}</span>
                         </div>
                         <span className="font-bold">{n.count}</span>
                      </div>
                    ))}
                    {(!notificationHealthQuery.data || notificationHealthQuery.data.length === 0) && (
                      <p className="text-sm text-muted-foreground">Sem dados de notificações recentes.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-card/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Atividade e Performance
                  </CardTitle>
                  <CardDescription>Saúde técnica da plataforma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Database Response</span>
                        <span className="text-green-500 font-medium">Excellent (12ms)</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[95%]" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Storage (Media/Logs)</span>
                        <span className="text-amber-500 font-medium">42% Used</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 w-[42%]" />
                      </div>
                   </div>
                   <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-sm font-medium">Sugestão Automática</p>
                      <p className="text-xs text-muted-foreground mt-1">O volume de plantões cresceu 15% esta semana. Considere arquivar logs com mais de 90 dias para manter a performance do dashboard.</p>
                   </div>
                </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
