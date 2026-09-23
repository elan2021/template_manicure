# L'Émail Studio

Projeto Next.js que disponibiliza os protótipos originais do L'Émail Studio em rotas independentes, preservando integralmente a apresentação e as interações já existentes.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. A rota inicial redireciona para o dashboard.

## Rotas

- `/login`
- `/cadastro`
- `/dashboard`
- `/agenda`
- `/servicos`
- `/profissionais`
- `/comissoes`
- `/configuracoes`

Os HTMLs originais ficam em `public/prototypes`. Eles são carregados em uma moldura sem bordas para preservar o resultado visual pixel a pixel enquanto a aplicação Next.js passa a fornecer as rotas.

## Dados locais

O backend usa SQLite local por meio do módulo nativo `node:sqlite`. Na primeira execução, o arquivo `data/lemail-studio.db` é criado e preenchido com os dados iniciais do estúdio.

Endpoints disponíveis:

- `GET /api/health`
- `GET` e `POST /api/services`
- `GET` e `POST /api/professionals`
- `GET` e `POST /api/appointments`

As telas de Serviços e Profissionais leem esses dados no carregamento. Os formulários “Novo Serviço” e “Nova Profissional” também registram os novos dados no SQLite.
