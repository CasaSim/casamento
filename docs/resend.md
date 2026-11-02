# Recuperação de senha com Resend

O formulário `/auth/forgot` solicita apenas o e-mail. Para contas cadastradas, a aplicação envia um link para `/auth/reset-password`, onde o usuário informa e confirma a nova senha. O link expira em uma hora e só pode ser usado uma vez. A alteração invalida as sessões anteriores.

## 1. Criar a conta e a chave

Crie sua conta em https://resend.com. Em **API Keys**, crie uma chave com permissão de envio (**Sending access**) e guarde-a em `RESEND_API_KEY`. Não coloque a chave no código nem em variáveis `NEXT_PUBLIC_*`.

## 2. Começar sem domínio próprio

Use `RESEND_FROM_EMAIL=CasaSim <onboarding@resend.dev>`. Esse remetente de teste só envia para o endereço de e-mail associado à sua conta Resend. Cadastre uma conta CasaSim com esse mesmo endereço no ambiente que será testado e solicite a recuperação.

O endereço `casamento-six-chi.vercel.app` pode continuar sendo usado para abrir a aplicação e os links de recuperação. Ele não pode ser usado como domínio de envio: você não controla os registros DNS de `vercel.app`.

## 3. Habilitar envios para outros usuários

Quando tiver um domínio próprio, abra **Domains → Add Domain** no Resend. Adicione o domínio ou um subdomínio de envio, copie os registros DNS indicados pelo Resend para seu provedor DNS e aguarde o status **Verified**. Depois, troque o remetente para um endereço desse domínio, por exemplo `CasaSim <nao-responda@seu-dominio.com>`. Não é necessário mudar o endereço do site na Vercel para usar um domínio próprio somente no envio.

## 4. Configurar o desenvolvimento local

Preencha no `.env`:

```dotenv
RESEND_API_KEY=re_SUA_CHAVE
RESEND_FROM_EMAIL=CasaSim <onboarding@resend.dev>
NEXTAUTH_URL=http://localhost:3000
```

Com Docker, aplique as variáveis com `docker compose up -d --build app`. Com `npm run dev`, reinicie o processo. As variáveis do `.env.production` são separadas das configurações do painel da Vercel.

## 5. Configurar a Vercel

Em **Project → Settings → Environment Variables**, configure para **Production**:

```dotenv
RESEND_API_KEY=re_SUA_CHAVE
RESEND_FROM_EMAIL=CasaSim <onboarding@resend.dev>
NEXTAUTH_URL=https://casamento-six-chi.vercel.app
```

Mantenha também `MONGODB_URI` e `NEXTAUTH_SECRET` configurados. Quando verificar um domínio próprio, atualize `RESEND_FROM_EMAIL`. Publique o código atualizado e faça um novo deployment. Apenas refazer um deployment de código antigo não inclui as alterações locais. Configure Preview separadamente se quiser testar nesse ambiente, usando a URL correspondente.

## 6. Validar

Abra **Esqueci a senha**, informe um endereço cadastrado autorizado pelo Resend e confira a caixa de entrada e o spam. Abra o link, salve uma senha de pelo menos 12 caracteres e entre com ela: o destino do login é `/Dashboard`. O link não deve funcionar novamente, e as sessões anteriores devem ser invalidadas.

A resposta do formulário é intencionalmente igual para contas existentes e desconhecidas, inclusive quando o provedor rejeita o envio. Verifique **Emails/Logs** no Resend e **Runtime Logs** na Vercel se a mensagem não chegar. O código registra falhas sem imprimir chave, destinatário ou token.

Os testes automatizados simulam o Resend; não enviam mensagens reais. O teste integrado de redefinição prepara um token no banco local para testar expiração, consumo único e revogação de sessão independentemente do provedor.

## Referências

- [API de envio](https://resend.com/docs/api-reference/emails/send-email)
- [Limitação do remetente de teste](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain)
- [Verificação de domínio](https://resend.com/docs/dashboard/domains/introduction)
- [Variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables)
