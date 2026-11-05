/** Dica de tecla ("Ctrl K"). Fica escondida no celular. */
export function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 hidden rounded border border-gray-200 px-1.5 py-px font-sans text-11 font-normal text-gray-500 sm:inline-block">
      {children}
    </kbd>
  );
}
