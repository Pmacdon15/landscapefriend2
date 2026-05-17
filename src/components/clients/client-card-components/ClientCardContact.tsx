import { Mail, Phone } from "lucide-react";
import type { ClientCardContactProps } from "@/types/types";

export function ClientCardContact({ email, phone }: ClientCardContactProps) {
  if (!email && !phone) return null;

  return (
    <div className="space-y-2">
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-3 text-muted-foreground text-sm hover:text-primary transition-colors group"
        >
          <Mail className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate underline-offset-4 group-hover:underline">
            {email}
          </span>
        </a>
      )}
      {phone && (
        <a
          href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
          className="flex items-center gap-3 text-muted-foreground text-sm hover:text-primary transition-colors group"
        >
          <Phone className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="underline-offset-4 group-hover:underline">
            {phone}
          </span>
        </a>
      )}
    </div>
  );
}
