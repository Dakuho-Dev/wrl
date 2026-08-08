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
      className="border-b-2 border-line-strong bg-[#fbf1c7]"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-center text-[13px] leading-relaxed text-ink sm:text-sm">
          <span className="font-semibold">Note:</span> {ETSY_TRADEMARK_NOTICE}
        </p>
      </div>
    </aside>
  );
}
