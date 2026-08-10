import { Info } from "lucide-react";

import { ETSY_TRADEMARK_NOTICE } from "@/lib/site-config";

/**
 * Etsy's API Terms §1 require this notice to be displayed. It is shown once, as
 * a high-contrast card inside the scopes band on the home page — the section a
 * reviewer reads most closely, since that is where the requested scopes are
 * declared.
 */
export function EtsyTrademarkCard() {
  return (
    <div
      aria-label="Etsy trademark notice"
      className="flex items-start gap-4 rounded-2xl border-2 border-amber-400 bg-[#fff3cd] p-5 shadow-2xl shadow-black/25 sm:items-center sm:p-6"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950">
        <Info className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <p className="text-[15px] font-medium leading-relaxed text-amber-950 sm:text-base">
        <span className="font-bold uppercase tracking-wide">Note:</span>{" "}
        {ETSY_TRADEMARK_NOTICE}
      </p>
    </div>
  );
}
