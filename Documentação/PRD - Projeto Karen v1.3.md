Documento de Requisitos de Produto (PRD): Projeto Caren
Autor: Caio

Versão: 1.0
Data: 02 de Setembro de 2025

1. Introdução
1.1. Visão Geral
Caren é uma assistente pessoal de inteligência artificial, projetada para ser uma central de organização e produtividade. Ativada por voz e acessível através de uma interface web e uma aplicação de desktop, Caren visa unificar o gerenciamento de tarefas, finanças, hábitos e ideias do usuário em um único ecossistema inteligente e sincronizado.

1.2. O Problema
Atualmente, o gerenciamento de produtividade pessoal está fragmentado em múltiplos aplicativos: um para listas de tarefas, outro para hábitos, uma agenda para lembretes, um app para finanças e blocos de notas para ideias. Essa fragmentação cria atrito, dificulta a visão geral da própria vida e carece de uma interface unificada e natural, como a voz.

1.3. Objetivo
Construir uma assistente pessoal centralizada, com as seguintes características:

Nome: Caren

Interação Primária: Voz, com uma "palavra de ativação" (wake word).

Voz: Feminina, natural e em português do Brasil.

Plataformas: Uma interface web para visualização de dados (acessível no celular e desktop) e uma aplicação desktop para controle do computador e escuta ativa.

Cérebro de Dados: Utilizar o Google Firebase (Firestore) como banco de dados central, garantindo sincronização em tempo real.

2. Funcionalidades Detalhadas
O sistema será modular, com cada funcionalidade construída sobre uma base de interação por voz e armazenamento no Firebase.

Módulo 1: Core - Interação e IA
Wake Word: O sistema de desktop deve ouvir continuamente pela palavra de ativação "Caren" de forma eficiente e offline.

Reconhecimento de Fala: Após a ativação, o sistema deve transcrever o comando de voz do usuário para texto com alta precisão.

Processamento de Linguagem Natural (LLM): O texto transcrito será enviado à API do Gemini para interpretar a intenção do usuário (ex: "criar tarefa", "registrar gasto").

Síntese de Voz: A resposta gerada pela LLM será convertida em áudio usando a API Google Cloud Text-to-Speech, garantindo uma resposta natural e fluida.

Módulo 2: Gestão de Produtividade
2.1. Tarefas:

User Story: "Como usuário, quero gerenciar minhas listas de tarefas por voz para organizar meu dia sem precisar digitar."

Requisitos:

Criar, renomear e deletar listas de tarefas (ex: "Trabalho", "Supermercado").

Adicionar e remover itens de uma lista.

Marcar tarefas como "concluídas" ou "pendentes".

Consultar todas as tarefas de uma lista específica ou todas as tarefas pendentes.

2.2. Hábitos:

User Story: "Como usuário, quero criar e acompanhar hábitos para construir uma rotina mais saudável e produtiva."

Requisitos:

Definir um novo hábito (ex: "Meditar", "Ler 10 páginas").

Estabelecer uma frequência (diário, semanal, etc.).

Registrar a conclusão de um hábito para o dia/período.

Consultar o progresso e a frequência de um hábito.

2.3. Lembretes e Agenda:

User Story: "Como usuário, quero definir lembretes para compromissos e integrá-los à minha agenda principal."

Requisitos:

Criar lembretes para datas e horários específicos (ex: "me lembre de ligar para a pizzaria às 19h").

Integração com Google Calendar: Os lembretes e eventos criados devem ser sincronizados (adicionados e consultados) na agenda Google do usuário.

Módulo 3: Organização Pessoal
3.1. Projetos:

User Story: "Como usuário, quero agrupar tarefas relacionadas em projetos para organizar objetivos maiores."

Requisitos:

Criar uma entidade "Projeto".

Associar listas de tarefas ou tarefas individuais a um projeto.

Visualizar o progresso de um projeto (ex: "mostrar todas as tarefas do projeto 'Férias'").

3.2. Finanças:

User Story: "Como usuário, quero registrar meus gastos e receitas de forma simples e rápida, usando apenas a voz."

Requisitos:

Registrar uma nova despesa (valor e descrição).

Registrar uma nova receita.

Consultar o total de despesas ou receitas de um período (ex: "quanto gastei este mês?").

3.3. Diário & Brain Dump:

User Story: "Como usuário, quero um espaço para registrar pensamentos do dia e capturar ideias aleatórias sem esforço."

Requisitos:

Diário: Criar/adicionar conteúdo a uma nota específica para a data atual.

Brain Dump: Manter uma única nota geral para adicionar ideias rápidas e não categorizadas.

3. Arquitetura e Tecnologias
3.1. Aplicação Web (Frontend)
Tecnologias: React, Tailwind CSS, SDK do Firebase para JavaScript, Web Speech API.

3.2. Servidor (Backend)
Objetivo: Orquestrar a lógica de negócio e a comunicação com as APIs externas.

Tecnologias:

Linguagem/Framework: Python com Flask.

Comunicação com APIs Externas:

IA (LLM): google-generativeai para a API do Google Gemini.

Voz (TTS): API da ElevenLabs para síntese de voz ultra-realista.

Agenda: google-api-python-client para a integração com o Google Calendar.

Comunicação com Banco de Dados: SDK Admin do Firebase para Python (firebase-admin).

3.3. Banco de Dados
Tecnologia: Google Firebase (Firestore).

Estratégia: Servirá como a fonte única da verdade para todas as funcionalidades criadas (Tarefas, Finanças, Hábitos, etc.), com exceção dos eventos de agenda, que serão espelhados no Google Calendar. Não utilizaremos a API do Google Tasks para garantir maior flexibilidade e controle.

4. Plano de Lançamento (Milestones) - Foco Web
(O plano de lançamento permanece o mesmo da v1.2)

5. Métricas de Sucesso
(As métricas permanecem as mesmas da v1.0)

6. Configuração do Ambiente e Chaves de API
Esta seção documenta as credenciais necessárias para o funcionamento do projeto. As chaves reais não devem ser armazenadas aqui, apenas os placeholders indicando onde elas serão usadas.

6.1. Google Firebase (Firestore)
Finalidade: Banco de dados principal da aplicação.

Credencial: Arquivo de Conta de Serviço (.json).

Como Obter: Gerado em "Configurações do Projeto" > "Contas de Serviço" no Console do Firebase.

Uso no Código (Backend): O caminho para este arquivo será usado para inicializar o SDK Admin do Firebase.

Placeholder: firebase-credentials.json

6.2. Google Cloud Platform
Finalidade: Fornecer acesso às APIs do Gemini e Google Calendar.

Credencial: Chave de API (API Key).

Como Obter: Gerada em "APIs e Serviços" > "Credenciais" no Google Cloud Console.

APIs a serem ativadas:

Generative Language API

Google Calendar API

Uso no Código (Backend): Esta chave será usada para autenticar as chamadas para as APIs do Google.

Placeholder: AIzaSyCVUleGAs2B7iTgeDo3SVd-gb7qFP0PKiU

6.3. ElevenLabs
Finalidade: Síntese de voz (TTS) natural e de alta qualidade para as respostas da Karen.

Credencial: Chave de API (API Key).

Como Obter: Gerada na seção "Profile + API Key" no painel do site da ElevenLabs.

Uso no Código (Backend): A chave será usada no cabeçalho das requisições para a API da ElevenLabs.

Placeholder: sk_f7d819b4d9b35b6cedae1057afb657d2d99170cf4c0f814e