import { Topo } from "@/components/topo";

/** Moldura das telas com login: o topo e a área de conteúdo. */
export default function LayoutDoSistema({ children }: LayoutProps<"/">) {
  return (
    // Com o painel lateral aberto (data-painel), a área fica mais larga para caber a lista e o painel.
    <div className="group/app min-h-dvh">
      <Topo />
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-16 lg:has-[[data-painel]]:max-w-[1600px] print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
