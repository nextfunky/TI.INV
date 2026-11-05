import Link from "next/link";
import { Fragment } from "react";

import { cx } from "@/lib/classes";

type ParteDaTrilha = { rotulo: string; href?: string; mono?: boolean };

/** "Inventário / DSK0001 / Editar". O último item é a página atual. */
export function Trilha({ partes }: { partes: ParteDaTrilha[] }) {
  return (
    <nav aria-label="Trilha" className="-mt-4 mb-6 text-13 text-gray-500">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {partes.map((parte, i) => {
          const ultima = i === partes.length - 1;
          const classe = cx(parte.mono && "font-mono");
          return (
            <Fragment key={`${parte.rotulo}-${i}`}>
              <li>
                {ultima || !parte.href ? (
                  <span aria-current={ultima ? "page" : undefined} className={cx(classe, ultima && "text-gray-900")}>
                    {parte.rotulo}
                  </span>
                ) : (
                  <Link href={parte.href} className={cx(classe, "transition-colors duration-150 hover:text-gray-900")}>
                    {parte.rotulo}
                  </Link>
                )}
              </li>
              {ultima ? null : (
                <li aria-hidden="true" className="text-gray-300">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
