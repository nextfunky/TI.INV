import { Logo } from "@/components/logo";

/**
 * Moldura das telas sem login (Entrar e Primeiro acesso): fundo cinza com a
 * grade suave, e uma coluna central com o logo, o título e o subtítulo.
 */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gray-50 px-4 py-12">
      <div aria-hidden="true" className="grade-login pointer-events-none absolute inset-0" />
      <main className="relative flex w-full max-w-sm flex-col gap-10">
        <div className="flex flex-col items-center text-center">
          <Logo tamanho="grande" />
          <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em]">Inventário de TI</h1>
          <p className="mt-3 text-15 text-gray-600">Cada equipamento, quem usa e onde está.</p>
        </div>
        {children}
      </main>
    </div>
  );
}
