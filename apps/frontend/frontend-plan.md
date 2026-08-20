# Plano de Implementação Frontend — PACELOG

> **Arquitetura Base:** Padrão Modular por Domínios (Domain-Driven Design - DDD)
> **Linguagem & Tipagem:** **TypeScript 5.8+** (Tipagem estrita para métricas, sessões, metas e autenticação)
> **Identidade Visual:** Google Stitch (`13232371183488200859`) — *Precision Chronograph / Modern Tactical*
> **Monorepo:** pnpm Workspaces + Turborepo — localizado em `apps/frontend/` na raiz do repositório
> **Deploy:** Cloudflare Pages — `root directory: apps/frontend`, `build command: pnpm build`

---

## 1. Visão Geral e Princípios Arquiteturais

O **PACELOG** é uma aplicação esportiva de alta precisão desenhada para registrar esforço e acompanhar consistência e evolução em múltiplas modalidades (Corrida, Boxe, Musculação, Futevôlei, Futebol).

### Princípios de Engenharia:
1. **TypeScript First:** Tipagem estrita de schemas esportivos, modelos de banco de dados, payloads de sincronização offline e props de componentes visuais.
2. **Domain-Driven Design (DDD):** Separação clara de responsabilidades por domínio de negócio em `src/domains/`. Cada domínio possui componentes, hooks, contextos e tipos próprios.
3. **Design System Tático & Coerente:** Aplicação estrita dos tokens do tema *Precision Chronograph* via `@theme` no Tailwind CSS v4 e Google Fonts (`Archivo Narrow` e `JetBrains Mono`).
4. **Resiliência Offline-First & PWA:** Suporte a registros em modo offline, fila de sincronização em segundo plano com idempotência (`client_uuid`), resolução de conflitos e indicadores visuais de status.
5. **Segurança de Sessão (Better Auth):** Sessão gerenciada no `AuthContext.tsx` via cookie `httpOnly` do Better Auth, com detecção de expiração, proteção de rotas com `ProtectedRoute` e autorização por `userId` garantida em toda chamada REST à API.
6. **Motor Unificado de Registro Adaptativo:** Um único wizard dinâmico (`/sessions/new`) que se adapta ao esporte selecionado, evitando telas duplicadas.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão & Finalidade |
|---|---|---|
| **Linguagem & Tipagem** | **TypeScript** | `typescript` ^5.8 + `@types/react`, `@types/react-dom`, `@types/node` |
| **Runtime & Core** | **React 19 (TSX)** | `react`, `react-dom` ^19.2 — componentes tipados e reatividade moderna |
| **Build Tool** | **Vite 8** | `vite` ^8, `@vitejs/plugin-react` — bundling ultrarrápido com HMR |
| **Estilização** | **Tailwind CSS v4** | `@tailwindcss/vite` + `@theme` com design tokens nativos em `global.css` |
| **Roteamento** | **React Router DOM 7** | `react-router-dom` ^7 — roteamento tipado e guardas de rota (`ProtectedRoute`) |
| **Backend & Autenticação** | **Better Auth Client** | `better-auth/client` — Auth baseada em cookie `httpOnly`, sessão gerenciada pelo servidor Express no Railway |
| **Ícones** | **Material Symbols + Lucide** | Google Material Symbols Outlined e `lucide-react` |
| **Tipografia** | **Google Fonts** | `Archivo Narrow` (Métricas/Displays) e `JetBrains Mono` (Labels técnicos) |
| **Utilitários** | **date-fns & Recharts & Confetti** | Manipulação de datas, gráficos táticos e celebração de metas |
| **Monorepo** | **pnpm Workspaces + Turborepo** | Orquestra build/dev/test com backend em pipeline paralelo com cache |
| **Deploy** | **Cloudflare Pages** | CDN global, SSL, integração GitHub, suporte nativo a monorepo via `root directory` |

---

## 3. Estratégia de Autenticação & Dados Offline (Better Auth + REST API)

### A. Autenticação & Gerenciamento de Sessão
1. **Variável de Ambiente:** Apenas `VITE_API_URL` (URL pública da API no Railway) é exposta no client via `import.meta.env`. Nenhuma chave secreta vai para o frontend.
2. **Sessão via Cookie `httpOnly` (Better Auth):**
   * O Better Auth emite um cookie `httpOnly; Secure; SameSite=None` na resposta de login — o browser o anexa automaticamente em toda requisição à API.
   * O `AuthContext.tsx` inicializa chamando `GET /api/auth/get-session` para restaurar a sessão de forma não-bloqueante.
   * No evento de `signOut()`, chama `POST /api/auth/sign-out` e limpa o estado local — o cookie é invalidado pelo servidor.
   * Redirecionamento mandatório para `/update-password` no fluxo de recuperação de senha.
3. **Proteção de Rotas com `ProtectedRoute`:** Todas as rotas autenticadas validam a sessão ativa no contexto antes de renderizar o `MainLayout` e as páginas internas.
4. **Autorização por `userId` na API:** Toda requisição autenticada carrega o cookie de sessão. O backend extrai o `userId` via `requireAuth` middleware e aplica `scopedFilter` em toda query — o frontend **nunca** envia `userId` no payload, apenas os dados do domínio.

### B. Segurança dos Dados Offline & Fila de Sincronização
1. **Autorização no Momento do Sync:** O payload offline **nunca** define o `userId` de forma explícita. Ao sincronizar, a API extrai o `userId` exclusivamente do cookie de sessão ativo via `requireAuth`.
2. **Idempotência e Prevenção de Duplicações (`clientUuid`):** Cada treino gerado offline recebe um `clientUuid` único (UUID v4). O backend faz `findOneAndUpdate` com `upsert: true` usando `{ userId, clientUuid }` como filtro — reenvios causados por oscilações de 4G/5G resultam em atualização segura, sem duplicar treinos ou corromper estatísticas.
3. **Isolamento de Storage por Usuário & Expurgo no Logout:** Chaves de cache e fila são prefixadas (`pacelog_${userId}_sync_queue`). No logout, o sistema executa a limpeza atômica de todos os caches e filas locais daquele usuário.
4. **Sandboxing da Same-Origin Policy (SOP):** O `localStorage` e o `IndexedDB` são restritos nativamente à origem do app, sem exposição de credenciais ou senhas no armazenamento local.
5. **Validação de Schema:** Sanitização contra XSS e validação de tipos de dados com interfaces TypeScript e Zod antes do armazenamento em rascunho e antes do envio à API.

---

## 4. Matriz Completa de Telas, Módulos e Estados do PACELOG

```text
====================================================================================================
CATÁLOGO GERAL DE TELAS & ESTADOS DO PACELOG
====================================================================================================

1. AUTENTICAÇÃO & ACESSO
   ├── Login (E-mail, senha, alternar visibilidade, login social)
   ├── Cadastro (Nome, e-mail, senha, confirmação)
   ├── Recuperação de Senha (Formulário para envio de link de reset)
   ├── E-mail Enviado para Recuperação (Feedback visual de confirmação de envio)
   ├── Confirmação de E-mail / Token (Verificação de e-mail e ativação de conta)
   ├── Atualizar Senha (Redefinição de senha pós-recuperação)
   ├── Sessão Expirada (Tela/Alerta informando necessidade de novo login)
   └── Erro de Autenticação (Feedback de credenciais inválidas ou conta bloqueada)

2. PRIMEIRO ACESSO & ONBOARDING
   ├── Boas-vindas (Introdução à proposta tática do PaceLog)
   ├── Seleção de Esportes Praticados (Seleção inicial multi-esporte: Boxe, Corrida, Musculação, etc.)
   ├── Preferências Iniciais (Unidades padrão: km, pace, kg, formato de hora)
   ├── Definição de Meta Inicial (Criação do primeiro marco de treino)
   └── Primeiro Acesso Concluído (Transição tática para o Dashboard)

3. DASHBOARD / HOME
   ├── Home com Dados (Streak de dias ativos, volume semanal, pace médio e feed de treinos)
   ├── Home sem Dados (Empty state para novos atletas com botão de ação rápida)
   ├── Resumo Semanal na Home (Cards analíticos de carga e consistência)
   ├── Seletor de Período do Dashboard (Alternância entre semana atual, mês e períodos customizados)
   ├── Estado de Carregamento da Home (Skeleton loaders táticos para cards e feed)
   ├── Estado de Erro da Home (Card de falha de conexão com botão de tentar novamente)
   └── Estado Offline da Home (Aviso de operação offline com dados em cache)

4. MOTOR UNIFICADO DE REGISTRO ADAPTATIVO (Fluxo Único que se Adapta Dinamicamente ao Esporte)
   ├── Rota Única: `/sessions/new` (Wizard Tático em 3 Etapas Dinâmicas)
   │   ├── Passo 1: Seleção de Esporte & Cronologia (Data, início, duração estimada)
   │   ├── Passo 2: Métricas Adaptativas do Esporte (Renderização dinâmica baseada no schema da modalidade):
   │   │   ├── Adaptação Corrida (Distância em km, tempo, pace calculado, altimetria, FC, esteira/rua)
   │   │   ├── Adaptação Boxe (Controle de rounds, duração do round/descanso, seletor de RPE 1-10)
   │   │   ├── Adaptação Musculação (Seleção de exercício da biblioteca, tabela de séries, reps e carga em kg)
   │   │   ├── Adaptação Futevôlei (Placar de sets, sets vencidos/perdidos, avaliação de fundamentos)
   │   │   └── Adaptação Futebol (Tipo de campo, posição, minutos jogados, gols e assistências)
   │   └── Passo 3: Revisão Técnica & Finalização (Notas táticas, esforço subjetivo e consolidação)
   ├── Estados de Registro & Resiliência:
   │   ├── Sessão Salva com Sucesso (Feedback tático com badge de consistência)
   │   ├── Sessão Salva Offline (Persistência no IndexedDB/LocalStorage com fila de sync)
   │   ├── Rascunho de Sessão Automático (Auto-save de dados preenchidos a cada alteração)
   │   ├── Recuperação de Rascunho (Detecção de sessão não finalizada e prompt de restauração)
   │   ├── Erro ao Salvar Sessão (Feedback claro com opção de retry)
   │   └── Sessão Sendo Sincronizada (Indicador de sync em background)
   ├── Detalhe Adaptativo da Sessão: `/sessions/:id` (Renderiza cards e gráficos específicos da modalidade gravada)
   └── Edição Adaptativa da Sessão: `/sessions/:id/edit` (Carrega os campos adaptativos para ajustes)

5. HISTÓRICO GERAL DE SESSÕES
   ├── Lista de Sessões (Feed cronológico completo de todas as modalidades)
   ├── Lista Filtrada por Esporte (Exibição exclusiva de Corrida, Boxe, etc.)
   ├── Lista Filtrada por Período (Filtros: Hoje, Esta Semana, Este Mês, Ano, Custom)
   ├── Busca de Sessões (Campo de busca por título, notas ou tags)
   ├── Detalhe de Sessão (Visualizador universal da sessão com métricas da modalidade)
   ├── Edição de Sessão (Redirecionamento para o editor específico da modalidade)
   ├── Confirmação de Exclusão (Modal tático destrutivo com aviso irreversível)
   ├── Sessão Excluída com Sucesso (Toast e remoção instantânea da lista)
   ├── Nenhuma Sessão Encontrada (Empty state geral)
   └── Nenhuma Sessão para o Filtro Atual (Empty state com botão para limpar filtros)

6. (MÓDULO DE SUPORTE) BIBLIOTECA DE EXERCÍCIOS (Específico para Musculação)
   ├── Biblioteca de Exercícios (Busca e filtro em biblioteca de exercícios)
   ├── Adição de Exercício Personalizado (Criação de novo exercício na biblioteca)
   ├── Cadastro de Séries (Repetições, carga em kg, RPE, tempo de descanso)
   ├── Edição de Série (Ajuste de carga ou repetições de série concluída)
   ├── Detalhe de Treino de Musculação (Volume total levantado [tonelagem], séries concluídas)
   ├── Edição de Musculação (Edição geral do treino)
   ├── Histórico de Carga (Gráfico de progressão de carga por exercício [1RM estimado])
   ├── Histórico de Volume (Volume semanal total por grupamento muscular)
   └── Evolução por Exercício (Gráfico de sobrecarga progressiva)

7. EVOLUÇÃO, MÉTRICAS & CONSISTÊNCIA
   ├── Evolução Geral (Painel consolidado com comparativos temporais e consistência)
   ├── Evolução dos Últimos 7 Dias (Visão de curto prazo e carga recente)
   ├── Evolução dos Últimos 30 Dias (Visão mensal e aderência a rotinas)
   ├── Evolução dos Últimos 90 Dias (Visão trimestral e evolução de performance)
   ├── Evolução Anual (Visão macro anual e sazonalidade de esforço)
   ├── Evolução por Esporte (Página dedicada para cada modalidade ativa)
   ├── Comparação com Período Anterior (Indicador delta percentual ex: +12% vs anterior)
   ├── Consistência (Heatmap / Calendário tático de dias treinados)
   ├── Sequência Atual (Streak ativo em dias consecutivos)
   ├── Maior Sequência Histórica (Recorde pessoal de consistência)
   ├── Dias Ativos (Contador de dias com treino no mês/período)
   ├── Tempo Total Praticado (Horas e minutos totais dedicados ao esforço)
   ├── Frequência de Sessões (Média de sessões por semana)
   ├── Marcas Pessoais (Quadro geral de recordes e melhores marcas do atleta)
   └── Métricas Insuficientes para Análise (Empty state de evolução com incentivo a novo treino)

8. METAS & OBJETIVOS
   ├── Lista de Metas (Painel com metas em andamento, pausadas e concluídas)
   ├── Criar Meta (Formulário completo de criação de novo marco)
   ├── Escolher Esporte da Meta (Seletor de modalidade vinculada)
   ├── Escolher Métrica da Meta (Distância, tempo, sessões, rounds, volume, peso)
   ├── Detalhe da Meta (Visualização styled com arco de progresso SVG circular de 360°)
   ├── Editar Meta (Ajuste de valor alvo ou data limite)
   ├── Pausar Meta (Ação para suspender temporariamente o acompanhamento)
   ├── Concluir Meta (Ação manual de encerramento do marco)
   ├── Meta Concluída (Estado visual de celebração com confetes e badge)
   ├── Meta Pausada (Estado visual indicando meta congelada)
   ├── Confirmação de Exclusão de Meta (Modal de confirmação)
   ├── Nenhuma Meta Cadastrada (Empty state com CTA de criação)
   └── Metas Filtradas por Esporte (Filtro rápido por modalidade)

9. INSIGHTS & INTELIGÊNCIA ARTIFICIAL
   ├── Lista de Insights (Feed de análises geradas pelo assistente esportivo)
   ├── Insight Semanal (Resumo consolidado do desempenho da semana)
   ├── Insight Mensal (Análise macro de volume e evolução)
   ├── Insight de Evolução (Identificação de ganhos de rendimento e pace)
   ├── Insight de Consistência (Reconhecimento de regularidade e disciplina)
   ├── Insight de Atenção (Alerta tático de sobrecarga, risco de overtraining ou queda de ritmo)
   ├── Insight de Conquista (Destaque de nova marca pessoal superada)
   ├── Insight de Reflexão (Pergunta ou provocação esportiva para autoavaliação)
   ├── Detalhe do Insight (Leitura expandida do relatório gerado)
   ├── Dados Utilizados no Insight (Transparência de métricas e sessões analisadas)
   ├── Insight Sendo Gerado (Estado de loading com animação de escaneamento tático)
   ├── Erro ao Gerar Insight (Feedback de falha com opção de tentar novamente)
   ├── Dados Insuficientes para Gerar Insight (Aviso solicitando mais registros de treino)
   ├── Avaliação do Insight (Feedback do usuário: Útil / Não relevante)
   └── Configuração de Insights de IA (Personalização de tom e frequência dos insights)

10. PERFIL DO ATLETA
    ├── Perfil do Usuário (Foto/avatar, nome, bio, marcas e resumo de atividade)
    ├── Editar Perfil (Formulário de dados pessoais e biometria)
    ├── Alterar Avatar (Upload e recorte de imagem de perfil)
    ├── Alterar Nome (Ajuste de nome e apelido de atleta)
    ├── Alterar E-mail (Fluxo de troca de e-mail com revalidação)
    ├── Alterar Senha (Formulário seguro de troca de senha)
    ├── Esportes Acompanhados (Gestão rápida das modalidades no perfil)
    ├── Resumo Pessoal de Atividade (Total de horas, sessões e quilometragem histórica)
    ├── Sair da Conta (Ação de logout)
    └── Confirmação de Logout (Modal de confirmação antes de deslogar)

11. CONFIGURAÇÕES
    ├── Configurações Gerais (Visão geral de preferências do aplicativo)
    ├── Configurações de Conta (Segurança, e-mail e dados da conta)
    ├── Configurações de Unidades (Menu de unidades de medida)
    ├── Configurações de Distância (Quilômetros / Milhas)
    ├── Configurações de Peso (Quilogramas / Libras)
    ├── Configurações de Tempo (Formato 24h / 12h AM-PM)
    ├── Configuração de Fuso Horário (Seleção de timezone do atleta)
    ├── Configuração de Idioma (Português / Inglês)
    ├── Configuração de Tema (Seletor visual de aparência)
    │   ├── Tema Escuro (Modo Tactical Dark padrão)
    │   ├── Tema Claro (Modo Clean Light)
    │   └── Tema Seguindo o Sistema (Sincronização automática com OS)
    ├── Configuração de Primeiro Dia da Semana (Segunda-feira / Domingo)
    ├── Configuração de Meta Semanal (Volume padrão desejado)
    ├── Configuração de Sequência (Regras de contagem de streak)
    ├── Configuração de Resumo Semanal (Notificação/exibição do digest)
    ├── Configuração de Notificações (Permissões e canais de notificação)
    ├── Configuração de Lembretes de Treino (Horários programados de lembrete)
    ├── Configuração de Notificações de Conquista (Alertas para novos recordes)
    └── Configuração de Atualizações do PWA (Verificação automática de novas versões)

12. ESPORTES E MÉTRICAS CUSTOMIZADAS
    ├── Lista de Esportes Ativos (Gestão de modalidades habilitadas)
    ├── Adicionar Esporte (Inclusão de nova modalidade à lista)
    ├── Editar Esporte Personalizado (Customização de nome, ícone e cor)
    ├── Ativar / Desativar Esporte (Controle de visibilidade nos menus)
    ├── Configurar Métricas do Esporte (Definição de quais campos exibir no registro)
    │   ├── Métricas Padrão do Futevôlei (Sets, placar, fundamentos)
    │   ├── Métricas Padrão do Boxe (Rounds, tempo, intervalo, RPE, notas)
    │   ├── Métricas Padrão da Corrida (Distância, tempo, pace, altimetria, FC)
    │   ├── Métricas Padrão do Futebol (Tempo, gols, assistências, posição)
    │   └── Métricas Padrão da Musculação (Exercícios, séries, reps, carga)
    └── Restaurar Métricas Padrão (Redefinição para as configurações originais)

13. DADOS, BACKUP & PRIVACIDADE
    ├── Dados e Privacidade (Painel central de controle de dados do atleta)
    ├── Política de Privacidade (Visualizador in-app dos termos de privacidade)
    ├── Termos de Uso (Visualizador in-app dos termos de serviço)
    ├── Exportar Dados (Geração de arquivo JSON/CSV com todos os treinos e métricas)
    │   ├── Exportação em Andamento (Barra de progresso de exportação)
    │   ├── Exportação Concluída (Download direto do arquivo)
    │   └── Falha na Exportação (Feedback de erro e retry)
    ├── Importar Backup (Restauração de histórico a partir de arquivo)
    │   ├── Validar Arquivo de Backup (Checagem de integridade do arquivo)
    │   ├── Confirmar Importação (Modal de aviso sobre mesclagem/substituição)
    │   ├── Importação Concluída (Sucesso e recarregamento dos dados)
    │   └── Falha na Importação (Mensagem explicativa sobre formato inválido)
    ├── Excluir Dados Locais (Limpeza do cache e dados armazenados no navegador)
    │   ├── Confirmar Exclusão de Dados Locais (Modal destrutivo)
    │   └── Dados Locais Excluídos (Feedback de limpeza)
    ├── Excluir Conta (Fluxo de exclusão permanente de conta e dados via API)
    │   ├── Confirmar Exclusão de Conta (Modal com digitação de confirmação)
    │   └── Conta Excluída (Redirecionamento para a tela inicial)

14. PWA, CONECTIVIDADE & SINCRONIZAÇÃO
    ├── Prompt de Instalação do PWA (Banner tático convidando para instalar como app)
    ├── PWA Instalado (Feedback de instalação bem-sucedida)
    ├── Atualização Disponível (Aviso no header sobre nova versão da aplicação)
    ├── Atualização em Andamento (Indicador de download do novo service worker)
    ├── Atualização Concluída (Botão de recarregar app para aplicar nova versão)
    ├── Aplicação Offline (Banner discreto informando operação sem conexão)
    ├── Sessões Pendentes de Sincronização (Lista de treinos gravados localmente)
    ├── Sincronização em Andamento (Ícone de sync girando e progresso)
    ├── Sincronização Concluída (Feedback positivo de envio à API)
    ├── Erro de Sincronização (Alerta com motivo da falha)
    ├── Tentar Sincronizar Novamente (Ação manual de retry da fila de sync)
    ├── Conflito de Dados (Identificação de discrepância entre servidor e local)
    └── Resolver Conflito de Dados (Modal permitindo escolher versão local ou servidor)

15. SISTEMA, FEEDBACK & COMPONENTES GLOBAIS
    ├── Loading Global (Tela de boot com logo tático animado)
    ├── Página Não Encontrada / 404 (Layout tático com botão de retorno à base)
    ├── Erro Inesperado (Error Boundary com captura e botão de reiniciar)
    ├── Acesso Não Autorizado / 401-403 (Redirecionamento seguro para login)
    ├── Serviço Temporariamente Indisponível (Página de manutenção com status)
    ├── Modal de Confirmação (Componente genérico com variantes: Normal, Perigo, Info)
    ├── Toast de Sucesso (Notificação verde luminescente no topo/rodapé)
    ├── Toast de Erro (Notificação vermelha de falha)
    ├── Toast de Aviso (Notificação âmbar/amarela de atenção)
    ├── Bottom Sheet de Ações (Menu deslizante inferior para opções contextuais)
    ├── Modal de Seleção (Seletor tático com busca e itens em cards)
    ├── Tooltip de Métrica (Explicação rápida ao tocar/passar sobre um valor técnico)
    └── Estado de Manutenção (Tela com aviso de atualização de infraestrutura)
```

---

## 5. Estrutura de Diretórios e Domínios (TypeScript First)

```text
src/
├── app/
│   ├── App.tsx                       # Roteador central tipado e provedores globais
│   ├── ErrorBoundary.tsx             # Captura global de erros inesperados
│   └── routes.tsx                    # Definição e mapeamento de rotas tipadas
├── assets/                           # Ícones, ilustrações e logos táticos
├── types/                            # Tipos e Schemas Globais TypeScript
│   ├── session.types.ts              # Tipagem de sessões, métricas e schemas esportivos
│   ├── sport.types.ts                # Tipagem de modalidades ativas e configurações
│   ├── goal.types.ts                 # Tipagem de metas, progresso e status
│   ├── user.types.ts                 # Tipagem de perfil, biometria e preferências
│   ├── insight.types.ts              # Tipagem de relatórios e insights de IA
│   ├── sync.types.ts                 # Tipagem da fila de sincronização e rascunhos offline
│   └── database.types.ts             # Tipos de resposta da API REST e modelos do MongoDB
├── domains/
│   ├── auth/                         # 1. Domínio de Autenticação
│   │   ├── components/ (Login.tsx, Signup.tsx, ForgotPassword.tsx, UpdatePassword.tsx, EmailConfirmation.tsx)
│   │   ├── context/ (AuthContext.tsx)
│   │   └── hooks/ (useAuth.ts)
│   ├── onboarding/                   # 2. Domínio de Primeiro Acesso
│   │   ├── components/ (Welcome.tsx, SportsSelection.tsx, InitialPreferences.tsx, InitialGoal.tsx, OnboardingDone.tsx)
│   │   └── hooks/ (useOnboarding.ts)
│   ├── dashboard/                    # 3. Domínio da Home / Dashboard
│   │   ├── components/ (Dashboard.tsx, WeeklyVolumeCard.tsx, PaceAverageCard.tsx, RecentSessionsList.tsx, EmptyDashboard.tsx)
│   │   └── hooks/ (useDashboardMetrics.ts)
│   ├── sessions/                     # 4. Domínio de Sessões (Motor Adaptativo Unificado)
│   │   ├── components/
│   │   │   ├── SessionWizard.tsx     # Wizard tático adaptativo em 3 etapas (/sessions/new)
│   │   │   ├── Step1SessionInfo.tsx  # Passo 1: Seleção do esporte e cronologia (cc16b5b0)
│   │   │   ├── Step2AdaptiveMetrics.tsx # Passo 2: Renderizador dinâmico de métricas por esporte
│   │   │   ├── Step3TechnicalReview.tsx # Passo 3: Revisão técnica e notas (a9a569bec)
│   │   │   ├── SessionDetails.tsx    # Visualização detalhada adaptativa (/sessions/:id)
│   │   │   ├── EditSession.tsx       # Editor adaptativo (/sessions/:id/edit)
│   │   │   ├── DeleteSessionModal.tsx # Modal destrutivo de confirmação (4544faa9)
│   │   │   └── metrics/              # Componentes de métricas dinâmicas injetados pelo schema:
│   │   │       ├── RunningFields.tsx    # Distância, pace, altimetria, FC
│   │   │       ├── BoxingFields.tsx     # Rounds, tempos, intervalos, RPE
│   │   │       ├── GymFields.tsx        # Construtor de séries, reps e carga em kg
│   │   │       ├── FootvolleyFields.tsx # Sets, placar e avaliação de fundamentos
│   │   │       └── SoccerFields.tsx     # Posição, minutos, gols e assistências
│   │   └── hooks/ (useSessions.ts, useDraftSession.ts, useSportSchema.ts)
│   ├── history/                      # 5. Domínio de Histórico de Sessões
│   │   ├── components/ (HistoryList.tsx, HistoryFilters.tsx, HistorySearch.tsx, EmptyHistory.tsx)
│   │   └── hooks/ (useSessionHistory.ts)
│   ├── evolution/                    # 7. Domínio de Estatísticas & Evolução
│   │   ├── components/ (EvolutionGeneral.tsx, EvolutionBySport.tsx, ConsistencyHeatmap.tsx, PersonalRecords.tsx, TimeframeTabs.tsx)
│   │   └── hooks/ (useEvolution.ts)
│   ├── goals/                        # 8. Domínio de Metas & Objetivos
│   │   ├── components/ (GoalsList.tsx, CreateGoal.tsx, GoalDetails.tsx, GoalProgressBar.tsx, GoalCelebrateModal.tsx)
│   │   └── hooks/ (useGoals.ts)
│   ├── insights/                     # 9. Domínio de Inteligência Artificial & Insights
│   │   ├── components/ (InsightsList.tsx, InsightCard.tsx, InsightDetailsModal.tsx, GeneratingInsight.tsx)
│   │   └── hooks/ (useInsights.ts)
│   ├── profile/                      # 10. Domínio de Perfil do Atleta
│   │   ├── components/ (Profile.tsx, EditProfile.tsx, ChangeAvatar.tsx, ChangePassword.tsx, PersonalStats.tsx)
│   │   └── hooks/ (useProfile.ts)
│   ├── settings/                     # 11, 12 & 13. Domínio de Configurações, Métricas & Privacidade
│   │   ├── components/
│   │   │   ├── SettingsMain.tsx
│   │   │   ├── UnitSettings.tsx
│   │   │   ├── ThemeSettings.tsx
│   │   │   ├── SportMetricsConfig.tsx
│   │   │   ├── DataPrivacy.tsx
│   │   │   ├── ExportDataModal.tsx
│   │   │   ├── ImportBackupModal.tsx
│   │   │   └── DeleteAccountModal.tsx
│   │   └── hooks/ (useSettings.ts, useDataBackup.ts)
│   └── pwa/                          # 14. Domínio de PWA & Conectividade
│       ├── components/ (InstallPromptBanner.tsx, OfflineBanner.tsx, SyncStatusIndicator.tsx, ConflictResolverModal.tsx)
│       └── hooks/ (useSyncQueue.ts, useOnlineStatus.ts)
├── shared/                           # 15. Componentes Compartilhados & Design System Core
│   ├── components/
│   │   ├── Layout/ (MainLayout.tsx, Header.tsx, BottomNav.tsx, StepWizardHeader.tsx, Container.tsx)
│   │   ├── Button/ (TactileButton.tsx)
│   │   ├── Input/ (PrecisionInput.tsx, StepperInput.tsx, SelectInput.tsx)
│   │   ├── MetricCard/ (MetricCard.tsx, StatBadge.tsx)
│   │   ├── Progress/ (CircularGauge.tsx, LinearProgress.tsx)
│   │   ├── Modal/ (Modal.tsx, ConfirmationModal.tsx, BottomSheet.tsx)
│   │   ├── Toast/ (Toast.tsx, ToastContext.tsx)
│   │   ├── Skeleton/ (CardSkeleton.tsx, FeedSkeleton.tsx, ScreenSkeleton.tsx)
│   │   └── Status/ (LoadingScreen.tsx, NotFoundScreen.tsx, ErrorScreen.tsx)
│   └── services/
│       └── api/ (api.client.ts, auth.client.ts)
├── lib/
│   ├── api.ts                        # Cliente HTTP tipado (fetch com baseURL, credentials: include e interceptores)
│   ├── authClient.ts                 # Cliente Better Auth tipado para sign-in, sign-out e get-session
│   └── utils.ts                      # Helpers esportivos tipados: cálculo de pace, tempo e conversões
├── styles/
│   └── global.css                    # Tailwind CSS v4 com os tokens exatos do Stitch (@theme)
├── tsconfig.json                     # Configuração estrita do compilador TypeScript
├── tsconfig.node.json                # Configuração TypeScript para scripts Node/Vite
└── main.tsx                          # Ponto de entrada React 19 em TypeScript
```

---

## 6. Roteamento Completo da Aplicação (`src/app/App.tsx`)

```tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../domains/auth/context/AuthContext';
import { ToastProvider } from '../shared/components/Toast/ToastContext';
import { MainLayout } from '../shared/components/Layout/MainLayout';
import { ErrorBoundary } from './ErrorBoundary';

// 1. Auth
import { Login } from '../domains/auth/components/Login';
import { Signup } from '../domains/auth/components/Signup';
import { ForgotPassword } from '../domains/auth/components/ForgotPassword';
import { UpdatePassword } from '../domains/auth/components/UpdatePassword';

// 2. Onboarding
import { OnboardingWizard } from '../domains/onboarding/components/OnboardingWizard';

// 3. Dashboard
import { Dashboard } from '../domains/dashboard/components/Dashboard';

// 4. Sessions (Motor Adaptativo Unificado)
import { SessionWizard } from '../domains/sessions/components/SessionWizard';
import { SessionDetails } from '../domains/sessions/components/SessionDetails';
import { EditSession } from '../domains/sessions/components/EditSession';

// 5. History
import { History } from '../domains/history/components/History';

// 7. Evolution
import { Evolution } from '../domains/evolution/components/Evolution';
import { EvolutionBySport } from '../domains/evolution/components/EvolutionBySport';

// 8. Goals
import { Goals } from '../domains/goals/components/Goals';
import { CreateGoal } from '../domains/goals/components/CreateGoal';
import { GoalDetails } from '../domains/goals/components/GoalDetails';

// 9. Insights
import { Insights } from '../domains/insights/components/Insights';

// 10. Profile
import { Profile } from '../domains/profile/components/Profile';
import { EditProfile } from '../domains/profile/components/EditProfile';

// 11, 12, 13. Settings & Privacy
import { Settings } from '../domains/settings/components/SettingsMain';
import { DataPrivacy } from '../domains/settings/components/DataPrivacy';
import { SportMetricsConfig } from '../domains/settings/components/SportMetricsConfig';

// 15. System
import { NotFoundScreen } from '../shared/components/Status/NotFoundScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <MainLayout>{children}</MainLayout>;
};

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Rotas Públicas de Acesso */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              
              {/* Onboarding */}
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

              {/* Rotas Principais Protegidas */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              
              {/* Histórico & Sessões */}
              <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
              <Route path="/sessions/new" element={<ProtectedRoute><SessionWizard /></ProtectedRoute>} />
              <Route path="/sessions/:id" element={<ProtectedRoute><SessionDetails /></ProtectedRoute>} />
              <Route path="/sessions/:id/edit" element={<ProtectedRoute><EditSession /></ProtectedRoute>} />

              {/* Metas */}
              <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
              <Route path="/goals/new" element={<ProtectedRoute><CreateGoal /></ProtectedRoute>} />
              <Route path="/goals/:id" element={<ProtectedRoute><GoalDetails /></ProtectedRoute>} />

              {/* Evolução & Métricas */}
              <Route path="/evolution" element={<ProtectedRoute><Evolution /></ProtectedRoute>} />
              <Route path="/evolution/:sportId" element={<ProtectedRoute><EvolutionBySport /></ProtectedRoute>} />

              {/* Insights com IA */}
              <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />

              {/* Perfil */}
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

              {/* Configurações, Métricas e Privacidade */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/metrics" element={<ProtectedRoute><SportMetricsConfig /></ProtectedRoute>} />
              <Route path="/settings/privacy" element={<ProtectedRoute><DataPrivacy /></ProtectedRoute>} />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundScreen />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

---

## 7. Cronograma de Execução por Fases (TypeScript)

1. **Fase 1: Inicialização do Projeto & Configuração TypeScript + Stack**
   - Criação do `package.json` com React 19, Vite 8, TypeScript ^5.8, Tailwind v4 (`@tailwindcss/vite`), React Router DOM v7, `better-auth/client`, Lucide e Canvas Confetti.
   - Configuração do `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html` (fontes e Material Symbols) e `src/styles/global.css`.
   - Criação de `src/lib/api.ts` (cliente HTTP com `credentials: 'include'` e `VITE_API_URL`) e `src/lib/authClient.ts` (Better Auth client tipado).
   - Criação das tipagens globais em `src/types/` (`session.types.ts`, `sport.types.ts`, `goal.types.ts`, `user.types.ts`, `sync.types.ts`).

2. **Fase 2: Design System Core & Shell Compartilhado (`src/shared/`)**
   - Implementação tipada de `MainLayout.tsx`, `Header.tsx`, `BottomNav.tsx`, `StepWizardHeader.tsx`.
   - Implementação de componentes atômicos: `TactileButton.tsx`, `PrecisionInput.tsx`, `MetricCard.tsx`, `CircularGauge.tsx`, `Modal.tsx`, `ToastContext.tsx`, `Skeleton.tsx` e `StatusScreen.tsx`.

3. **Fase 3: Autenticação, Onboarding & Ciclo de Sessão (`src/domains/auth/` e `src/domains/onboarding/`)**
   - Implementação do `AuthContext.tsx` tipado usando Better Auth client via cookie `httpOnly` (sem JWT manual — a sessão é gerenciada inteiramente pelo servidor).
   - Telas de Login, Signup, Recuperação de Senha e Wizard de Onboarding (Boas-vindas, Esportes, Preferências, Meta inicial).

4. **Fase 4: Dashboard & Diário de Treinos (`src/domains/dashboard/`)**
   - Implementação da Home com dados, Home sem dados (empty state), resumo semanal, streak de consistência e feed de sessões recentes com estados de loading e offline.

5. **Fase 5: Motor Unificado de Registro de Treino Adaptativo (`src/domains/sessions/`)**
   - Wizard tático adaptativo em 3 etapas (`SessionWizard.tsx`) com renderização dinâmica de campos para Corrida, Boxe, Musculação, Futevôlei e Futebol.
   - Revisão técnica, salvamento offline com idempotência (`client_uuid`), auto-save de rascunhos e modal de exclusão.

6. **Fase 6: Histórico & Detalhamento Adaptativo (`src/domains/history/`)**
   - Lista completa com filtros dinâmicos por esporte e período, busca textual, visualizador adaptativo (`SessionDetails.tsx`) e editor (`EditSession.tsx`).

7. **Fase 7: Módulo de Evolução, Métricas & Recordes (`src/domains/evolution/`)**
   - Visão de consistência geral (7D, 30D, 90D, 1Y), evolução detalhada por modalidade, comparativos com período anterior e marcas pessoais.

8. **Fase 8: Módulo de Metas & Insights de IA (`src/domains/goals/` e `src/domains/insights/`)**
   - Painel de metas com arco circular de 360°, criação, pausa, conclusão festiva com confetes e feed de insights táticos com IA.

9. **Fase 9: Perfil, Configurações, Métricas Customizadas & Backup (`src/domains/profile/` e `src/domains/settings/`)**
   - Perfil do atleta, alternância de unidades de medida, configuração de métricas esportivas, exportação/importação de backup e privacidade.

10. **Fase 10: PWA, Fila de Sincronização & Testes Finais (`src/domains/pwa/`)**
    - Service worker PWA, sincronização em background, resolução de conflitos e validação de 100% dos tipos e estados do catálogo.

---

## 8. Estrutura no Monorepo

O frontend reside em `apps/frontend/` dentro da raiz do monorepo PACELOG.

```text
apps/frontend/
├── src/                          # (estrutura interna descrita na seção 5)
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json               # name: "@pacelog/frontend"
└── .env.example               # apenas VITE_API_URL
```

O `package.json` raiz do monorepo é responsável por subir frontend e backend em paralelo via:

```bash
pnpm dev        # sobe apps/backend e apps/frontend simultaneamente com HMR
pnpm build      # builda ambos com cache Turborepo
pnpm test       # roda Vitest (backend) + testes de componente (frontend)
```

---

## 9. Deploy no Cloudflare Pages (Monorepo)

O Cloudflare Pages tem suporte nativo a monorepos via configuração de `root directory`. Configuração do projeto:

| Configuração | Valor |
|---|---|
| **Source** | Repositório GitHub do monorepo |
| **Root Directory** | `apps/frontend` |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm build` |
| **Output Directory** | `dist` |
| **Variáveis de Ambiente** | `VITE_API_URL` = URL pública do Railway |

> [!IMPORTANT]
> O Cloudflare Pages requer um arquivo `_redirects` (ou `public/_redirects`) com `/* /index.html 200` para que o React Router DOM funcione corretamente em SPA.
