import { ETSY_TRADEMARK_NOTICE } from "@/lib/site-config";

/**
 * Etsy's API Terms §1 require this notice to be displayed. It sits at the very
 * top of the home page — above the fold, before any product copy — so an API
 * reviewer sees it without scrolling. The footer carries it on every other page.
 */
export function EtsyTrademarkBanner() {
  return (
    <aside
      aria-label="Etsy trademark notice"
      className="border-b border-amber-300/70 bg-[#fdf5da]"
    >
      <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8">
        <p className="text-center text-[13px] leading-relaxed text-amber-950 sm:text-sm">
          <span className="font-bold">Note:</span> {ETSY_TRADEMARK_NOTICE}
        </p>
      </div>
    </aside>
  );
}
