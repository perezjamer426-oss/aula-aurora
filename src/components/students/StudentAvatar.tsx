import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StudentAvatarProps {
  photoPath: string | null;
  name: string;
  className?: string;
}

/** Avatar del estudiante — resuelve URL firmada del bucket privado o muestra iniciales. */
export function StudentAvatar({ photoPath, name, className }: StudentAvatarProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!photoPath) return;
    supabase.storage
      .from("student-photos")
      .createSignedUrl(photoPath, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary font-medium",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm">{initials || "·"}</span>
      )}
    </div>
  );
}
