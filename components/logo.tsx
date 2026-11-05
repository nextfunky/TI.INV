import { cx } from "@/lib/classes";

/** O logo: um quadradinho quase preto com "TI" em branco. */
export function Logo({ tamanho = "pequeno" }: { tamanho?: "pequeno" | "grande" }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex shrink-0 items-center justify-center bg-gray-900 font-semibold text-white",
        tamanho === "grande"
          ? "size-10 rounded-[10px] text-sm tracking-[0.02em]"
          : "size-6 rounded-md text-[10px] leading-none",
      )}
    >
      TI
    </span>
  );
}
