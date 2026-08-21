# Pacelog

Pacelog é uma plataforma de acompanhamento esportivo (telemetria de alta precisão) para multimodais (Corrida, Boxe, Futevôlei, Futebol, Musculação). O objetivo do app é registrar treinos e cruzar os dados da evolução diária do atleta de forma analítica, oferecendo um Coach Virtual baseado em IA.

O projeto é um Monorepo gerenciado via **Turborepo** e **PNPM**, com as seguintes stacks:
- **Frontend**: React (Vite), TailwindCSS, React Router, Lucide Icons.
- **Backend**: Node.js, Express, Mongoose (MongoDB).
- **IA**: @google/genai (Gemini AI).
- **Autenticação**: Better Auth (Cookies Seguros HttpOnly).

## Pré-requisitos

Para rodar este projeto na sua máquina, você precisa ter instalado:
1. [Node.js](https://nodejs.org/en/) (Versão 20 ou 24+)
2. [PNPM](https://pnpm.io/installation) (`npm install -g pnpm`)
3. Uma instância do [MongoDB](https://www.mongodb.com/) rodando localmente na porta 27017, ou uma URI do MongoDB Atlas.

## Variáveis de Ambiente

Crie os arquivos `.env` nos seus respectivos pacotes:

### No Backend (`apps/backend/.env`)
```env
PORT=3333
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/pacelog
BETTER_AUTH_SECRET=sua_chave_secreta_super_forte_aqui
BETTER_AUTH_URL=http://localhost:3333
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=sua_chave_gemini_aqui
```
> **Nota**: Você precisará criar uma chave de API do Gemini no [Google AI Studio](https://aistudio.google.com/) para fazer os testes do Coach Virtual funcionarem.

### No Frontend (`apps/frontend/.env`)
```env
VITE_API_URL=http://localhost:3333
```

## Como Executar Localmente

Siga os passos abaixo na raiz do monorepo:

### 1. Instalar as Dependências
Abra o terminal na pasta raiz e execute:
```bash
pnpm install
```

### 2. Iniciar o Servidor (Backend + Frontend)
O Turborepo possibilita iniciar tudo ao mesmo tempo. Execute:
```bash
pnpm dev
```
Este comando vai rodar:
- O Backend no endereço: `http://localhost:3333`
- O Frontend no endereço: `http://localhost:5173`

### 3. Acessar a Aplicação
Abra seu navegador em [http://localhost:5173](http://localhost:5173).
Crie uma nova conta clicando em **Inscrever-se**, complete o processo de Onboarding (Nome) e comece a gravar suas sessões de treino!

---

## Estrutura do Monorepo

- `apps/frontend`: Interface do usuário, páginas, roteamento e estilização.
- `apps/backend`: Servidor Express, Rotas da API, Serviços, Controladores e Modelos do Mongoose.
- `packages/shared`: Tipos, Interfaces TypeScript e schemas (`SessionDTO`, `AIInsightDTO`, etc) consumidos por ambas as pontas.

## Dicas de Desenvolvimento

- Para testar a IA, grave um treino, depois outro treino da **mesma modalidade**. Vá na tela do segundo treino e clique no botão **"Gerar Análise Tática"**. O Gemini usará o histórico para construir o insight!
- A Autenticação requer que o Frontend e o Backend rodem em `localhost` (ou 127.0.0.1) devido a restrições de Cookies de Segurança no Chrome/Safari. Em produção, eles devem estar no mesmo domínio.
