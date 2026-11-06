import type { Evento } from "./valores";

type RegistroParaTexto = {
  evento: Evento;
  dePessoa: string | null;
  paraPessoa: string | null;
  deLocal: string | null;
  paraLocal: string | null;
};

const lugar = (l: string | null) => l ?? "Sem local definido";

/** A frase do registro: "Entregue a João Lima", "Passou de Ana para João", "Estoque da TI → Financeiro". */
export function textoDoRegistro(r: RegistroParaTexto): string {
  switch (r.evento) {
    case "cadastro":
      return r.paraPessoa ? `Cadastrado com ${r.paraPessoa}` : `Cadastrado em ${lugar(r.paraLocal)}`;
    case "entrega":
      return `Entregue a ${r.paraPessoa}`;
    case "troca":
      return `Passou de ${r.dePessoa} para ${r.paraPessoa}`;
    case "devolucao":
      return r.paraLocal ? `Devolvido por ${r.dePessoa} → ${r.paraLocal}` : `Devolvido por ${r.dePessoa}`;
    case "mudanca_de_local":
      return `${lugar(r.deLocal)} → ${lugar(r.paraLocal)}`;
    case "mudou_com_a_pessoa":
      return `Mudou com ${r.paraPessoa}: ${lugar(r.deLocal)} → ${lugar(r.paraLocal)}`;
    case "exclusao":
      return "Excluído do inventário";
  }
}
