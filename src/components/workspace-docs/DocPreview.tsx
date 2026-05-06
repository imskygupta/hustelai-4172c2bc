import type { DocType, ThemeId } from "@/lib/workspace-docs/types";
import { QuotationTemplate } from "./templates/QuotationTemplate";
import { AgreementTemplate } from "./templates/AgreementTemplate";
import { InvoiceTemplate } from "./templates/InvoiceTemplate";
import { ServiceCardTemplate } from "./templates/ServiceCardTemplate";
import { BusinessCardTemplate } from "./templates/BusinessCardTemplate";

export function DocPreview({
  type, data, themeId, watermark, refEl,
}: {
  type: DocType;
  data: any;
  themeId: ThemeId;
  watermark?: boolean;
  refEl?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={refEl} style={{ display: "inline-block" }}>
      {type === "quotation" && <QuotationTemplate data={data} themeId={themeId} watermark={watermark} />}
      {type === "agreement" && <AgreementTemplate data={data} themeId={themeId} watermark={watermark} />}
      {type === "invoice" && <InvoiceTemplate data={data} themeId={themeId} watermark={watermark} />}
      {type === "service_card" && <ServiceCardTemplate data={data} themeId={themeId} watermark={watermark} />}
      {type === "business_card" && <BusinessCardTemplate data={data} themeId={themeId} watermark={watermark} />}
    </div>
  );
}