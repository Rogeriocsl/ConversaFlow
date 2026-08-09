# ConversaFlow

Plataforma desktop em Electron para automação conversacional e campanhas pelo WhatsApp, com menus configuráveis, sessões por contato, atendimento humano, autenticação por QR Code, janela de funcionamento, opt-out, listas personalizadas e licenciamento offline.

## Automação conversacional

Ao receber a primeira mensagem, o ConversaFlow apresenta um menu configurável. Cada contato mantém sua própria sessão por até 30 minutos. Os comandos `menu`, `início`, `0` e `voltar` reiniciam a navegação; `9` encaminha para atendimento humano; e `sair`, `parar`, `stop` ou `cancelar` registram o opt-out.

## Arquitetura

```text
src/
├── main/          # ciclo de vida do Electron, janela e handlers IPC
├── services/      # WhatsApp, disparos, configurações, privacidade e licença
├── utils/         # funções puras de horário, template, telefone e delay
└── renderer/      # interface executada no processo de renderização
```

O `main.js` é apenas o ponto de entrada. As regras de negócio ficam nos serviços e os contratos com a interface permanecem isolados em `src/main/ipc`.

## Executar

1. Instale o Node.js e execute `npm install`.
2. Copie `.env.example` para `.env` e ajuste as opções desejadas.
3. Execute `npm start`.

Use `npm test` para validar os helpers puros e `npm run build:win` para gerar o instalador do Windows.

## Segurança

A chave privada usada para emitir licenças nunca deve ser versionada. Mantenha arquivos `private_key.pem`, licenças geradas e `.env` somente no ambiente local. Se uma chave privada já foi publicada, gere um novo par de chaves antes de distribuir o aplicativo.
