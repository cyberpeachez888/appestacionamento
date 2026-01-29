Título: 🚀 Chamada para Colaboradores: Organizando a Casa (Projeto Criado por IA)
Olá, Comunidade!

Meu nome é GABRIEL, sou o fundador e o "cérebro" por trás da lógica deste projeto. Antes de qualquer coisa, preciso ser 100% transparente: Eu não sou programador.

Este projeto nasceu de uma necessidade real e foi construído integralmente através de agentes de IA (como o Gemini/Claude/ChatGPT). Embora a lógica de negócio esteja funcionando, chegamos a um ponto onde a complexidade do código superou a capacidade de organização dos agentes, resultando em uma "Arquitetura Frankenstein".
⚠️ O Cenário Atual

O projeto possui módulos críticos de Convênios e Mensalistas, mas sofremos com:

    Falta de Fonte Única de Verdade: Divergência entre o que o banco de dados (PostgreSQL/RPC) faz e o que o Node.js/React exibe.

    Lógica Fragmentada: Regras de negócio importantes (cálculos financeiros) estão no Frontend, o que gera insegurança nos dados.

    Dificuldade de Manutenção: Arquivos como monthlyController.js e ConvenioDetailPanel.tsx tornaram-se "arquivos gigantes" (>1000 linhas) que a IA já não consegue debugar com precisão.

🎯 O que buscamos?

Não procuro apenas "alguém que codifique", mas sim desenvolvedores que queiram ajudar a profissionalizar a arquitetura de um produto que já tem uma lógica validada.

Os principais desafios agora são:

    Refatoração de Controladores: Unificar a lógica de criação e atualização dentro do Banco (RPC) ou em Services isolados.

    Padronização Financeira: Garantir que o Backend seja o dono das regras de cálculo, não o Frontend.

    Sincronização de Estado: Implementar uma gestão de estado mais robusta no React para evitar o uso excessivo de "Event Bus".

💡 Como você pode ajudar?

Se você é um desenvolvedor que gosta de Clean Code, Arquitetura de Sistemas ou apenas quer contribuir para um projeto real que nasceu da colaboração Humano-IA, seu apoio será extremamente bem-vindo.

Como idealizador, eu consigo explicar cada regra de negócio e o "porquê" de cada funcionalidade. O que preciso é de mãos experientes para traduzir isso em um código sustentável.

Sinta-se à vontade para abrir Issues, enviar Pull Requests ou deixar seu comentário abaixo com sugestões de melhoria!
