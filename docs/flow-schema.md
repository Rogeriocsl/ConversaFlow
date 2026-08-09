# Estrutura do motor de fluxos

O campo opcional `automation.flow` representa a automação como nós conectados. Quando ele não existe, o ConversaFlow converte automaticamente o menu linear atual em um nó raiz, preservando compatibilidade.

```json
{
  "root": "main",
  "nodes": {
    "main": {
      "type": "menu",
      "message": "Como podemos ajudar?",
      "options": [
        { "key": "1", "label": "Produtos", "target": "products" },
        { "key": "9", "label": "Atendente", "action": "handoff" }
      ]
    },
    "products": {
      "type": "menu",
      "message": "Escolha uma opção:",
      "options": [
        { "key": "1", "label": "Ver catálogo", "response": "Aqui está o catálogo." }
      ]
    }
  }
}
```

## Regras

- `root` identifica o menu inicial.
- Um nó `menu` apresenta opções numeradas.
- `target` navega para outro nó e registra o caminho no histórico.
- `response` envia uma resposta sem trocar de nó.
- `action: "handoff"` pausa a automação para atendimento humano.
- `voltar` ou `0` retorna ao nó anterior.
- `menu` ou `início` limpa o histórico e retorna à raiz.
- Fluxos inválidos são ignorados e o menu linear continua funcionando.
