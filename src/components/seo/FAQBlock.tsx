import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface FAQItem { q: string; a: string }

export function FAQBlock({ items, title = "Frequently asked questions", id = "faq" }: { items: FAQItem[]; title?: string; id?: string }) {
  if (!items?.length) return null;
  return (
    <section id={id} className="px-4 mt-20">
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-6 tracking-tight text-slate-900">{title}</h2>
        <Accordion type="single" collapsible className="w-full">
          {items.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}