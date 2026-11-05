import {
  Cable,
  Cctv,
  Headset,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Network,
  Package,
  Phone,
  Printer,
  Radio,
  Router,
  ScanBarcode,
  Smartphone,
  Tablet,
  Tag,
  Webcam,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  monitor: Monitor,
  laptop: Laptop,
  keyboard: Keyboard,
  mouse: Mouse,
  headset: Headset,
  webcam: Webcam,
  printer: Printer,
  zap: Zap,
  package: Package,
  phone: Phone,
  cctv: Cctv,
  radio: Radio,
  "scan-barcode": ScanBarcode,
  tablet: Tablet,
  smartphone: Smartphone,
  tag: Tag,
  network: Network,
  router: Router,
  cable: Cable,
};

/** O ícone de cada tipo. Tipos criados pelo usuário usam a caixa (package). */
export function IconeDoTipo({ icone, ...props }: LucideProps & { icone: string }) {
  const Icone = ICONES[icone] ?? Package;
  return <Icone aria-hidden="true" {...props} />;
}
