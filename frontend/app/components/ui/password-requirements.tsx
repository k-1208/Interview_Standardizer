import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/passwordPolicy";
import { cn } from "@/lib/utils";

/** Live checklist of password rules; met rules turn green as the user types. */
export function PasswordRequirements({ password, className }: { password: string; className?: string }) {
  return (
    <ul className={cn("space-y-1 text-xs", className)} aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={cn("flex items-center gap-1.5", met ? "text-emerald-600 dark:text-emerald-400" : "opacity-70")}
          >
            {met ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <X className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span>{rule.label}</span>
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
