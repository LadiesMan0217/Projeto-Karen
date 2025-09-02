Regras do Projeto Karen - Diretrizes para a IA Programadora
Este documento define as regras e boas práticas que devem ser seguidas estritamente durante todo o desenvolvimento do "Projeto Karen". O objetivo é garantir consistência, qualidade e aderência à arquitetura definida no PRD v1.3.

1. Princípios Gerais
Fonte da Verdade: O PRD - Projeto Karen v1.3.md e este documento (project_rules.md) são as únicas fontes da verdade. Em caso de ambiguidade, as especificações contidas aqui prevalecem.

Foco na Versão 1: Todas as implementações iniciais devem se ater exclusivamente ao escopo da "Versão 1 (Fundação Web)" do plano de lançamento. Não implemente funcionalidades de versões futuras (Hábitos, Finanças, etc.) a menos que seja explicitamente solicitado.

Simplicidade e Clareza: O código deve ser simples, legível e bem comentado. Priorize a clareza sobre a complexidade desnecessária.

2. Regras de Arquitetura e Tecnologia
Backend (Python/Flask - app.py):

Arquivo Único: Todo o código do backend deve, inicialmente, residir em um único arquivo app.py.

Framework: Utilizar exclusivamente Flask.

CORS: A configuração do Flask-Cors é obrigatória para permitir a comunicação com o frontend.

Variáveis de Ambiente: Nenhuma chave de API ou credencial deve estar escrita diretamente no código (hardcoded). Todas as chaves (GOOGLE_API_KEY, ELEVENLABS_API_KEY) e caminhos de arquivos de credenciais (FIREBASE_CREDENTIALS_PATH) devem ser carregados a partir de um arquivo .env usando a biblioteca python-dotenv.

Frontend (React - App.jsx):

Arquivo Único: Todos os componentes React devem ser definidos dentro do arquivo App.jsx. Não crie arquivos de componentes separados nesta fase.

Estilização: Utilizar exclusivamente Tailwind CSS. Não use arquivos .css separados ou estilos inline, a menos que seja absolutamente inevitável.

Estado: Para gerenciamento de estado, utilize os hooks nativos do React (useState, useEffect, useCallback). Não introduza bibliotecas de gerenciamento de estado como Redux ou Zustand.

Comunicação: A comunicação com o backend deve ser feita via fetch API para o endpoint /api/interact.

Banco de Dados (Firebase/Firestore):

SDK: No backend, utilize o SDK firebase-admin para operações de administrador. No frontend, utilize o SDK cliente do Firebase para JavaScript.

Estrutura de Dados: A estrutura das coleções e documentos deve seguir o exemplo definido na seção 3.3 do PRD. As coleções devem ser criadas sob /users/{userId}/.

3. Regras de Codificação e Boas Práticas
Segurança em Primeiro Lugar:

NUNCA exponha chaves de API ou credenciais no código do frontend (App.jsx). Toda a lógica que envolve chaves secretas deve residir exclusivamente no backend (app.py).

O arquivo .env e os arquivos de credenciais (.json) devem ser incluídos em um .gitignore hipotético (trate-os como se não devessem ir para um repositório público).

Comentários:

Comente seções importantes do código, especialmente a lógica de comunicação entre frontend-backend e as chamadas para APIs externas. Explique o "porquê" da implementação, não apenas "o que" ela faz.

Nomenclatura:

Python: Siga o padrão PEP 8 (variáveis em snake_case, classes em CamelCase).

React/JavaScript: Use camelCase para variáveis e funções, e PascalCase para componentes.

Tratamento de Erros:

Implemente blocos try...catch nas chamadas de API (tanto no frontend quanto no backend) para lidar com possíveis falhas de rede ou respostas inesperadas.

Forneça feedback visual mínimo ao usuário em caso de erro (ex: uma mensagem "Erro ao contatar a Karen" no chat).

Ciclo de Interação:

O fluxo de dados deve seguir rigorosamente o ciclo definido no prompt_engenharia.md:

Frontend (Ouvir): Web Speech API captura a voz.

Frontend (Enviar): Texto transcrito é enviado para /api/interact.

Backend (Processar): Recebe o texto, simula chamadas às APIs (Gemini, ElevenLabs).

Backend (Responder): Retorna JSON com responseText e audioUrl.

Frontend (Exibir/Falar): Exibe a conversa e simula a reprodução do áudio.