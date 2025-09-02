Documento de Requisitos de Produto (PRD): Projeto Karen
Autor: Caio

Versão: 2.0 (Arquitetura Final)
Data: 02 de Setembro de 2025

1. Introdução
1.1. Visão Geral
Karen é uma assistente pessoal de IA, projetada para ser uma central de organização e produtividade. Com interação primária por uma interface de chat inteligente, Karen unifica o gerenciamento de tarefas, lembretes, finanças e ideias do usuário em um único ecossistema, com todos os dados sincronizados em tempo real.

1.2. O Problema
O gerenciamento de produtividade pessoal está fragmentado. Karen resolve isso centralizando tudo em uma única interface, acessível e natural, eliminando a necessidade de múltiplos aplicativos.

1.3. Objetivo
Construir uma assistente pessoal centralizada, com as seguintes características:

Nome: Karen

Interação Primária: Chat (texto e voz)

Voz: Feminina, ultra-realista (ElevenLabs)

Plataforma Inicial: Aplicação Web (React) com design profissional.

Cérebro de IA: Processamento de linguagem via API da Groq (Llama 3).

Cérebro de Dados: Firebase (Firestore) como banco de dados central e Firebase Authentication para login.

2. Funcionalidades Detalhadas
Módulo 1: Core - Interação e IA
Autenticação Segura: Login na aplicação web via Firebase Authentication (Google Sign-In).

Interface de Chat: A tela principal da aplicação será uma interface de chat para conversar com a Karen.

Processamento de Linguagem (LLM): O texto do usuário será enviado à API da Groq para interpretar a intenção e extrair dados em formato JSON, seguindo as regras do karen_prompt.txt.

Síntese de Voz: A resposta da Karen será convertida em áudio usando a API da ElevenLabs.

Módulo 2: Gestão de Produtividade (Dados no Firestore)
2.1. Tarefas:

Criar, consultar e gerenciar listas de tarefas e seus itens através de comandos no chat.

Os dados serão armazenados na coleção /users/{userId}/tasks no Firestore.

2.2. Lembretes e Agenda (Sistema Interno):

NÃO usará Google Calendar.

Criar, consultar e gerenciar lembretes e eventos através de comandos no chat.

Os dados serão armazenados em uma nova coleção /users/{userId}/reminders no Firestore. A aplicação web terá uma view de "Agenda" para visualizar esses dados.

Módulo 3: Organização Pessoal (Dados no Firestore)
3.1. Projetos, Finanças, Diário e Brain Dump:

Todas estas funcionalidades serão implementadas com sistemas próprios dentro do Firestore, acessíveis via comandos no chat.

3. Arquitetura e Tecnologias
Frontend: React com Tailwind CSS.

Backend: Python com Flask.

Banco de Dados: Firebase Firestore.

Autenticação: Firebase Authentication.

LLM (Cérebro): Groq API.

Voz: ElevenLabs API.

4. Plano de Lançamento (Milestones)
Versão 1 (Fundação Web):

[X] Configuração do ambiente e das chaves de API (Groq, ElevenLabs, Firebase).

[ ] Implementação da tela de login com Firebase Auth.

[ ] Construção da interface principal com menu lateral e a view de "Chat IA".

[ ] Backend funcional que recebe texto, processa com a Groq (lendo o karen_prompt.txt), gera áudio com a ElevenLabs e retorna.

Versão 2 (Produtividade Essencial):

[ ] Implementação completa da funcionalidade de Tarefas, com os dados salvos e lidos do Firestore.

[ ] Implementação completa da funcionalidade de Agenda/Lembretes (sistema próprio no Firestore).

[ ] Criação das views "Tarefas" e "Agenda" no frontend para visualizar os dados.

Versão 3 (Organização Total):

[ ] Implementação das demais funcionalidades (Finanças, Diário, etc.).

5. Métricas de Sucesso
O sistema processa um comando (do envio à resposta falada) em menos de 3 segundos.

Os dados aparecem na interface web em tempo real após serem criados via chat.

O login é seguro e separa os dados de cada usuário.