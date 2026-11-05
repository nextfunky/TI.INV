import { Topo } from "@/components/topo";

/** Moldura das telas com login: o topo e a área de conteúdo. */
export default function LayoutDoSistema({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <Topo />
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-16">{children}</main>
    </div>
  );
}
