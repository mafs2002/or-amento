# Economias de Casa

App web instalável (PWA) para gerir as economias de casa, partilhada em tempo real por duas pessoas.
Funciona no telemóvel como uma app normal e guarda os dados no Firebase (plano gratuito chega).

## 1. Firebase (uma vez)

1. Em https://console.firebase.google.com cria um projeto (podes desligar o Google Analytics).
2. **Authentication** → Começar → ativa **Email/palavra-passe** → separador Utilizadores → **Adicionar utilizador** (cria as 2 contas).
3. **Firestore Database** → Criar base de dados (modo de produção, região `eur3`).
4. Firestore → separador **Regras** → cola o conteúdo de `firestore.rules`, troca os dois emails pelos das contas criadas → Publicar.
5. Definições do projeto → **As tuas apps** → Web `</>` → regista a app e copia o `firebaseConfig` para `firebase-config.js`.

## 2. GitHub Pages

1. Cria um repositório no GitHub e carrega todos os ficheiros desta pasta (mantém a pasta `icons`).
2. Repositório → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `(root)` → Save.
3. Ao fim de um minuto a app fica em `https://<utilizador>.github.io/<repositório>/`.

## 3. Instalar no telemóvel

- **iPhone (Safari):** Partilhar → *Adicionar ao ecrã principal*.
- **Android (Chrome):** menu ⋮ → *Instalar app*.

Entra com o email e palavra-passe de uma das contas. Os movimentos, orçamentos e objetivos sincronizam entre os dois telemóveis e ficam disponíveis offline (sincronizam quando voltar a haver rede).

## Notas

- Os dados da versão anterior (dentro do Claude) não migram automaticamente; esta versão começa vazia.
- O `firebase-config.js` pode ficar público no GitHub: o acesso aos dados é protegido pelo login e pelas regras.
- Para publicar uma alteração, basta fazer commit; a app atualiza na abertura seguinte.
