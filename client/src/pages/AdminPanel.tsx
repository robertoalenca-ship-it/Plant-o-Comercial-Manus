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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Search, Shield, User, X, Zap } from "lucide-react";

export default function AdminPanel() {
  const [search, setSearch] = useState("");
  const { data: users, refetch } = trpc.admin.listUsers.useQuery();
  const activateMutation = trpc.admin.manualActivate.useMutation({
    onSuccess: () => {
      toast.success("Licença atualizada com sucesso");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie licenças e permissões dos usuários.</p>
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
              <CardTitle>Usuários Registrados</CardTitle>
              <CardDescription>
                {filteredUsers?.length ?? 0} usuários encontrados no sistema.
              </CardDescription>
            </div>
            <div className="flex gap-4">
               <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Total Pago</p>
                  <p className="text-xl font-bold text-primary">{users?.filter(u => u.isPaid).length ?? 0}</p>
               </div>
               <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Admin/Staff</p>
                  <p className="text-xl font-bold text-amber-600">{users?.filter(u => ['admin', 'staff'].includes(u.role)).length ?? 0}</p>
               </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[250px]">Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Licenças (Unidades)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((u) => (
                <TableRow key={u.userId} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{u.name || "Sem Nome"}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(val) => handleChangeRole(u.userId, u.isPaid, u.maxProfiles, val)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="coordinator">Coordenador</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
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
                     <div className="flex items-center gap-2">
                        <Select
                          value={String(u.maxProfiles)}
                          onValueChange={(val) => handleChangeProfiles(u.userId, u.isPaid, Number(val))}
                        >
                          <SelectTrigger className="w-[70px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="999">∞</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground">unidades</span>
                     </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={u.isPaid ? "outline" : "default"}
                      size="sm"
                      className={!u.isPaid ? "bg-amber-500 hover:bg-amber-600 border-none h-8 px-3" : "h-8 px-3"}
                      onClick={() => handleTogglePaid(u.userId, u.isPaid, u.maxProfiles)}
                      disabled={activateMutation.isPending}
                    >
                      {u.isPaid ? (
                        <>
                          <X className="h-3 w-3 mr-1" /> Revogar
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3 mr-1 fill-white" /> Ativar Licença
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum usuário encontrado para "{search}"
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
