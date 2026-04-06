import { cn } from "@/lib/utils";

type AppBrandProps = {
  className?: string;
  compact?: boolean;
  hideSubtitle?: boolean;
};

export default function AppBrand({
  className,
  compact = false,
  hideSubtitle = false,
}: AppBrandProps) {
  return (
    <div className={cn("app-brand flex items-center gap-3", compact && "app-brand-compact gap-2", className)}>
      <div className={cn(
        "app-brand-plaque text-primary-foreground flex items-center justify-center rounded-xl",
        "bg-gradient-to-br from-primary to-blue-600 shadow-[0_0_15px_rgba(0,229,255,0.4)]",
        compact ? "h-8 w-8 shrink-0" : "h-12 w-12 shrink-0 p-2"
      )}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="app-brand-svg h-full w-full drop-shadow-md"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeWidth="1.5" />
          <path d="M6 12h2.5l1.5-3 2.5 6 3-8 2 5h3.5" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="21" cy="3" r="1.5" fill="#FFFFFF" stroke="none" />
        </svg>
      </div>

      <div className="min-w-0">
        <p className={cn(
          "app-brand-kicker text-primary font-semibold tracking-wider uppercase",
          compact ? "text-[0.6rem]" : "text-xs"
        )}>
          Gestão de Plantões
        </p>
        <h1 className={cn(
          "app-brand-title font-bold leading-none tracking-tight text-foreground",
          compact ? "text-lg" : "text-2xl mt-0.5"
        )}>
          Escala Inteligente
        </h1>
        {!hideSubtitle && !compact ? (
          <p className="app-brand-subtitle text-xs text-muted-foreground truncate mt-0.5">
            B2B SaaS Platform
          </p>
        ) : null}
      </div>
    </div>
  );
}
