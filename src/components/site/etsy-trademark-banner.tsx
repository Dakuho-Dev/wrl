import { Info } from "lucide-react";

import { ETSY_TRADEMARK_NOTICE } from "@/lib/site-config";

/**
 * Etsy's API Terms §1 require this notice to be displayed. It is deliberately
 * loud and deliberately repeated in the top half of the home page — once as a
 * strip above the hero, once as a card inside the scopes band — so an API
 * reviewer cannot scroll past it. The footer carries it on every other page.
 */

/** Full-width amber strip. Sits directly under the nav, above the hero. */
export function EtsyTrademarkBanner() {
  return (
    <aside
      aria-label="Etsy trademark notice"
      className="border-y-2 border-amber-400 bg-[#fff3cd]"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3.5 px-4 py-4 sm:px-6">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950">
          <Info className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </span>
        <p className="text-[14px] font-medium leading-snug text-amber-950 sm:text-[15px]">
          <span className="font-bold uppercase tracking-wide">Note:</span>{" "}
          {ETSY_TRADEMARK_NOTICE}
        </p>
      </div>
    </aside>
  );
}

/** Card version, for placing on top of a dark or coloured section. */
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
