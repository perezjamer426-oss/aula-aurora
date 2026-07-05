import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        aria-hidden
        className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 3 3 7.5v6.75c0 1.24.63 2.39 1.67 3.05L12 21l7.33-3.7A3.6 3.6 0 0 0 21 14.25V7.5L12 3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12.25 11 14.75l4.75-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight text-foreground">
          AureoSense
        </span>
      )}
    </div>
  );
}
