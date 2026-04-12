import { useState } from "react";
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
import { Search, Users, Shield, User as UserIcon, Zap } from "lucide-react";

export default function AdminPanel() {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = trpc.admin.listTeamMembers.useQuery();

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe da Unidade</h1>
          <p className="text-muted-foreground">Gerencie quem tem acesso e permissões nesta escala.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground ml-2" />
          <Input
            placeholder="Buscar por e-mail ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 min-w-[300px]"
          />
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Membros Ativos
              </CardTitle>
              <CardDescription>
                {filteredUsers?.length ?? 0} pessoas com acesso a esta unidade.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Usuário</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Status da Conta</TableHead>
                <TableHead className="text-right">Último Acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Carregando membros...
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.map((u) => (
                <TableRow key={u.userId} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{u.name || "Sem Nome"}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {['admin', 'staff'].includes(u.role) ? (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Shield className="h-3 w-3 mr-1" /> {u.role === 'staff' ? 'SaaS Owner' : 'Clinic Admin'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {u.role}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.active ? (
                      <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Desativada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleString('pt-BR') : "Nunca"}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Nenhum membro encontrado para "{search}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-primary">Precisa adicionar novos membros?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Para convidar novos médicos ou coordenadores para esta unidade, utilize o menu de <strong>Configurações</strong>
                ou entre em contato com o suporte do sistema.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
