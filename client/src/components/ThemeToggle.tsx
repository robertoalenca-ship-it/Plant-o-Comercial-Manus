import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  variant = "ghost",
  size = "icon",
  className,
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={showLabel ? "default" : size}
      onClick={toggleTheme}
      className={cn(
        "transition-all duration-200",
        showLabel && "gap-2",
        className
      )}
      aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
    >
      {theme === "light" ? (
        <>
          <Moon className="h-[1.1rem] w-[1.1rem]" />
          {showLabel && <span>Modo escuro</span>}
        </>
      ) : (
        <>
          <Sun className="h-[1.1rem] w-[1.1rem]" />
          {showLabel && <span>Modo claro</span>}
        </>
      )}
    </Button>
  );
}
