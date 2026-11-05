# Inventário de TI

Cada equipamento, quem usa e onde está. Sistema interno da equipe de TI, usado por uma pessoa só.

## Andamento

| Etapa | O que entra | Situação |
|---|---|---|
| 1 | Base: primeiro acesso, login, alterar senha, banco, visual e topo | ✅ feita |
| 2 | Tipos e itens: códigos, formulário, Inventário, detalhe, busca rápida | ⬜ próxima |
| 3 | Colaboradores e alocação | ⬜ |
| 4 | Locais | ⬜ |
| 5 | Início completo e tipos de item | ⬜ |
| 6 | Movimentações (histórico) | ⬜ |
| 7 | Mapa: desenhar | ⬜ |
| 8 | Mapa: posicionar e ver | ⬜ |
| 9 | Relatórios e exportação | ⬜ |
| 10 | Publicação (Vercel + Neon + Cloudflare) | ⬜ |
| 11 | Extras | ⬜ |

---

## Rodar no seu computador (Windows)

Todos os comandos são para o **PowerShell**. Rode **um por vez**, na ordem.

### 1. Instalar os programas (só na primeira vez)

Abra o **PowerShell** (menu Iniciar → digite "PowerShell" → Enter). Pode ser em qualquer pasta.

Instale o **Git**:

```powershell
winget install --id Git.Git -e --source winget --accept-source-agreements --accept-package-agreements
```

Instale o **Node.js** (versão LTS, a de longo prazo):

```powershell
winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-source-agreements --accept-package-agreements
```

Recomendado, para ver e editar o código: o **Visual Studio Code**.

```powershell
winget install --id Microsoft.VisualStudioCode -e --source winget --accept-source-agreements --accept-package-agreements
```

Se o Windows perguntar se o programa pode fazer alterações, clique em **Sim**. Ao final de cada um deve aparecer **"Instalado com êxito"** (ou "Successfully installed"). Se aparecer "Nenhuma atualização disponível", ele já estava instalado.

**Feche o PowerShell e abra de novo** (para ele enxergar os programas novos) e confira:

```powershell
node -v
```

Deve aparecer `v26` ou mais.

```powershell
git --version
```

Deve aparecer `git version 2...`.

> **Se o `winget` não existir ou for bloqueado pela empresa:** instale pelos sites oficiais, com as opções padrão do instalador: [git-scm.com/download/win](https://git-scm.com/download/win) e [nodejs.org](https://nodejs.org) (botão "LTS").

### 2. Baixar o projeto (só na primeira vez)

Vá para a pasta onde ficam os seus projetos do GitHub:

```powershell
cd "$HOME\Documents\GitHub"
```

Baixe o projeto:

```powershell
git clone https://github.com/nextfunky/TI.INV.git
```

Como o repositório é privado, na primeira vez o Git abre uma janela para entrar no GitHub. Entre e autorize. No fim deve aparecer `done.`.

Entre na pasta do projeto:

```powershell
cd TI.INV
```

### 3. Criar o banco de dados no Neon (só na primeira vez)

1. Abra [neon.com](https://neon.com) e crie uma conta gratuita (dá para entrar com Google ou GitHub).
2. Crie um projeto com o nome `ti-inv`. Na região, escolha **AWS South America (São Paulo)** se aparecer; senão, a mais próxima. O resto pode ficar como está.
3. Na página do projeto, clique em **Connect** e copie o endereço que começa com `postgresql://`.
4. **Não mande esse endereço para ninguém**: ele tem a senha do banco.

> Enquanto a empresa não aprovar guardar dados na nuvem (LGPD), use dados de teste.

### 4. Configurar o projeto (só na primeira vez)

Na pasta do projeto, crie o arquivo de configuração a partir do modelo:

```powershell
Copy-Item .env.example .env.local
```

Abra o arquivo no Bloco de Notas:

```powershell
notepad .env.local
```

Cole o endereço do Neon logo depois de `DATABASE_URL=`, sem espaços e sem aspas. Salve (Ctrl+S) e feche.

### 5. Instalar, preparar o banco e abrir

Sempre na pasta do projeto (`Documents\GitHub\TI.INV`):

```powershell
npm install
```

Baixa as bibliotecas (leva 1 ou 2 minutos). Avisos amarelos (`npm warn`) e a frase "vulnerabilities" podem aparecer: são das ferramentas de desenvolvimento e não afetam o sistema. **Não rode** `npm audit fix --force`.

```powershell
npm run db:migrate
```

Cria as tabelas no banco. Deve terminar com `migrations applied successfully!`.

```powershell
npm run dev
```

Liga o sistema. Deve aparecer `Ready` e `Local: http://localhost:3000`. Deixe essa janela aberta enquanto usa o sistema; para desligar, aperte **Ctrl+C** nela.

Abra [http://localhost:3000](http://localhost:3000) no navegador. Na primeira vez aparece a tela **Primeiro acesso**, para criar a sua conta.

### Atualizar quando sair uma etapa nova

Na pasta do projeto, com o sistema desligado (Ctrl+C):

```powershell
git pull
```

```powershell
npm install
```

```powershell
npm run db:migrate
```

```powershell
npm run dev
```

---

## Se der erro

| O que aparece | O que fazer |
|---|---|
| `npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada` | Rode `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, responda **S**, e tente de novo. Isso libera os scripts só para o seu usuário. |
| `node` ou `git` "não é reconhecido como nome de cmdlet" | Feche e abra o PowerShell de novo. Se continuar, reinstale pelo passo 1. |
| `fatal: not a git repository` | O PowerShell está na pasta errada. Rode `cd "$HOME\Documents\GitHub\TI.INV"`. |
| `Falta o DATABASE_URL` | O arquivo `.env.local` não existe ou está vazio. Refaça o passo 4. |
| `password authentication failed` ou `getaddrinfo ENOTFOUND` | O endereço do banco está errado ou incompleto. Copie de novo do Neon (botão Connect) e cole no `.env.local`. |
| Tela "Algo deu errado" | Confira se o `npm run db:migrate` terminou com sucesso. |
| `Port 3000 is in use` | O sistema já está ligado em outra janela. Use aquela, ou feche-a com Ctrl+C. |
| Esqueci a senha | No painel do Neon, abra **SQL Editor**, rode `delete from contas;` e abra o sistema: a tela de **Primeiro acesso** volta. |

---

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | Liga o sistema no seu computador (http://localhost:3000). |
| `npm run db:migrate` | Atualiza as tabelas do banco. Rode depois de cada `git pull`. |
| `npm test` | Roda os testes automáticos das regras. Não precisa de banco. |
| `npm run build` | Monta a versão de produção (confere se está tudo certo). |
| `npm run lint` | Procura problemas no código. |
| `npm run test:e2e` | Testes no navegador. Precisa de um banco **só para testes** em `E2E_DATABASE_URL` (ele é apagado) e de `npx playwright install chromium` uma vez. |

## Tecnologias

Next.js 16 e React 19 (TypeScript), Tailwind CSS 4, Postgres no Neon com Drizzle ORM, senhas com Argon2id, ícones Lucide, fontes Inter e IBM Plex Mono guardadas no projeto. Testes com Vitest e Playwright.

## Como o projeto está organizado

```
app/            As telas (cada pasta é um endereço do sistema)
components/     Peças da tela: topo, botões, campos, avisos
lib/auth/       Conta, login, sessões e senha
lib/db/         Tabelas e conexão com o banco
drizzle/        Histórico de mudanças do banco (migrations)
tests/          Testes automáticos (unidade/ e e2e/)
```
