[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=CasaSim_casamento&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=CasaSim_casamento)
# Sobre
## CasaSim
Projeto Open Source para pessoas que querem fazer a gestão de seu casamento, mas que não abrem mão de cuidar de seus dados.

## Stack:
Nextjs + Mongo.
## Configurar .env

``` bash
  MONGODB_URI=KEYDOMONGODB
  NEXTAUTH_SECRET=keynextauth

(gerar via openssl rand -base64 32)
```

## Features
- Dashboard gastos + contatos [ok]
- Agenda integrada [por implementar]
- Esqueci o Password [Falta implementar envio de e-mail com password/session temporário e elaborar novo password]
  
## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploy no Vercel

Como é o intuito de um projto relativamente pequeno, fiz o deploy no [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) me custou 0 reais até o momento.

## Instancia de Mongo
Se fizer um projeto local, Docker na veia.
Se fizer um projeto hostado em nuvem, cogite o AtlasDB no pacote Free

## Images
Images taken from Pixabay - open source images

## Ambiente local com Docker Desktop

O `.env` local contém credenciais aleatórias separadas para o administrador do MongoDB, o usuário `casasim_app` (acesso apenas ao banco `casamento`), o painel `desktop` e o segredo de sessão. Não publique esse arquivo. O Compose substitui o host do MongoDB por `mongodb` dentro da aplicação; a URI no `.env` usa `localhost` para ferramentas do desktop.

```bash
docker compose up -d --build
# Aplicação: http://localhost:3000
# MongoDB: localhost:27017 (credenciais e URI no .env)
docker compose exec app npm run test:security
docker compose exec app npm run typecheck
docker compose exec app node tests/integration.cjs
# Mongo Express: http://localhost:8081 (login desktop; senha MONGO_ADMIN_PASSWORD no .env)
docker compose up -d mongo_admin
```

O container da aplicação executa o servidor de desenvolvimento como usuário sem privilégios. Após alterações no código, execute novamente `docker compose up -d --build app`. O volume do MongoDB preserva os dados. O script de criação do usuário só roda no primeiro início de um volume novo. Para o envio de recuperação de senha, preencha `MAILGUN_KEY` e `MAILGUN_DOMAIN` no `.env` e recrie o serviço da aplicação.

As correções e limitações da revisão de segurança estão em [SECURITY.md](SECURITY.md).

## Visualização pública do Dashboard

No dashboard autenticado, clique em **Compartilhar visualização** para obter o link `/Dashboard/ID_DO_DASHBOARD`. O link funciona sem login e também para quem estiver conectado em outra conta, sempre mostrando o dashboard indicado. É possível consultar Categoria, Descrição, Data, Telefone, Contato e Valor, ver o total e exportar para Excel.

Quem conhece o ID de um dashboard existente tem acesso de leitura a seus gastos e contatos, mesmo sem ter usado o botão de compartilhar. O botão apenas obtém o ID e monta o link. Não há expiração nem revogação desse acesso por ID. Cadastro, edição e exclusão de gastos continuam restritos ao proprietário autenticado.