import { Mail, Phone } from "lucide-react";
import type { ClientCardContactProps } from "@/types/types";

export function ClientCardContact({ email, phone }: ClientCardContactProps) {
  if (!email && !phone) return null;

  return (
    <div className="space-y-2">
      {email && (
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">{email}</span>
        </div>
      )}
      {phone && (
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <Phone className="h-4 w-4 shrink-0" />
          <span>{phone}</span>
        </div>
      )}
    </div>
  );
}
