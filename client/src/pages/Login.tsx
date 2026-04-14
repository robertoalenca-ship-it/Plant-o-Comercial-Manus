import { useAuth } from "@/_core/hooks/useAuth";
import AppBrand from "@/components/AppBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import { appPath, STAFF_HOME_PATH } from "@/lib/appRoutes";
import { trpc } from "@/lib/trpc";
import { FormEvent, useEffect, useState } from "react";
import { Redirect, useLocation } from "wouter";

export default function LoginPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isRedirectingToGoogle, setIsRedirectingToGoogle] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      setError(null);
      await utils.auth.me.invalidate();
    },
    onError: (mutationError) => {
      setError(mutationError.message || "Nao foi possivel entrar.");
    },
  });

  const entryUrl = user?.role === "staff" ? STAFF_HOME_PATH : appPath();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation(entryUrl);
    }
  }, [entryUrl, isAuthenticated, loading, setLocation]);

  if (!loading && isAuthenticated) {
    return <Redirect to={entryUrl} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    await loginMutation.mutateAsync({ email, password }).catch(() => undefined);
  };

  const handleGoogleLogin = () => {
    setIsRedirectingToGoogle(true);
    window.location.assign(getLoginUrl({ type: "signIn" }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-xl space-y-6">
        <div className="space-y-4">
          <AppBrand compact />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Entrar no sistema</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Escolha como deseja entrar. O Google so abre quando voce clicar nele.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">E-mail</label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">Senha</label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading || loginMutation.isPending || isRedirectingToGoogle}>
            {loginMutation.isPending ? "Entrando..." : "Entrar com e-mail e senha"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading || loginMutation.isPending || isRedirectingToGoogle}>
          {isRedirectingToGoogle ? "Abrindo Google..." : "Entrar com Google"}
        </Button>
      </div>
    </div>
  );
}
