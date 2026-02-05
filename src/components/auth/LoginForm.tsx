import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Wrench } from "lucide-react";

export function LoginForm() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Find user by name in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("name", name.trim())
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData || !profileData.email) {
        throw new Error("Usuário não encontrado");
      }

      // Sign in using the stored email
      const { error } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password,
      });

      if (error) {
        throw new Error("Nome ou senha incorretos");
      }

      toast({
        title: "Login realizado",
        description: "Bem-vindo ao sistema CMMS",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message || "Verifique suas credenciais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <Wrench className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">CMMS Industrial</h1>
          <p className="text-muted-foreground mt-2">
            Sistema de Gestão de Manutenção
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="industrial-card p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 btn-industrial"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </>
            )}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">Não tem uma conta? </span>
            <Link to="/register" className="text-primary hover:underline font-medium">
              Cadastrar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
