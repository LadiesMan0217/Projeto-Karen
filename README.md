# Projeto Karen - Versão 1 (Fundação Web)

Assistente pessoal inteligente com interação por voz, desenvolvida com React (frontend) e Flask (backend).

## 🚀 Funcionalidades

- **Interação por Voz**: Reconhecimento de fala usando Web Speech API
- **Interface Moderna**: Design responsivo com Tailwind CSS e tema escuro
- **Integração com IA**: Groq AI para processamento de linguagem natural
- **Síntese de Voz**: ElevenLabs para respostas em áudio (configurável)
- **Chat em Tempo Real**: Conversa fluida entre usuário e Karen
- **Histórico Persistente**: Conversas salvas no Firebase Firestore
- **Sistema de Memória**: Memória de longo prazo para personalização
- **Gerenciamento de Tarefas**: Criação e organização de tarefas via comandos de voz

## 📋 Pré-requisitos

- **Python 3.8+**
- **Node.js 16+**
- **npm ou yarn**
- Navegador moderno com suporte ao Web Speech API (Chrome recomendado)

## 🛠️ Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd "Projeto Karen"
```

### 2. Configuração do Backend (Python/Flask)

```bash
# Instalar dependências Python
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas chaves de API reais
```

### 3. Configuração do Frontend (React)

```bash
# Instalar dependências Node.js
npm install

# ou usando yarn
yarn install
```

## 🚀 Execução

### 1. Iniciar o Backend

```bash
# Em um terminal
python app.py
```

O servidor Flask estará rodando em `http://localhost:5000`

### 2. Iniciar o Frontend

```bash
# Em outro terminal
npm run dev

# ou usando yarn
yarn dev
```

O frontend estará disponível em `http://localhost:3000`

## 🔧 Configuração das APIs

Para funcionalidade completa, configure as seguintes chaves no arquivo `.env`:

```env
# Google API Key (Google Calendar)
GOOGLE_API_KEY=sua_chave_aqui

# Groq API Key (Processamento de IA)
GROQ_API_KEY=sua_chave_aqui

# ElevenLabs API Key (Síntese de Voz)
ELEVENLABS_API_KEY=sua_chave_aqui

# Caminho para credenciais do Firebase
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

### Como obter as chaves:

1. **Google API Key**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Groq API Key**: [Groq Console](https://console.groq.com/keys)
3. **ElevenLabs API Key**: [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)
4. **Firebase Credentials**: [Firebase Console](https://console.firebase.google.com/) > Configurações do Projeto > Contas de Serviço

## 📱 Como Usar

1. Abra o navegador em `http://localhost:3000`
2. Faça login com: **teste@teste.com** / **123456**
3. Clique no botão do microfone (🎤) ou digite sua mensagem
4. Permita o acesso ao microfone quando solicitado
5. Fale com a Karen em português
6. Veja a resposta aparecer no chat e ouça o áudio (se configurado)

## 🧠 Sistema de Memória

A Karen possui um sistema de memória de longo prazo que:

- **Lembra informações pessoais**: Nome, profissão, preferências
- **Contextualiza conversas**: Usa informações anteriores para personalizar respostas
- **Armazena projetos**: Mantém registro dos projetos em que você trabalha
- **Adapta comunicação**: Ajusta o tom baseado nas suas preferências

### Exemplos de uso:
```
"Oi Karen, me chamo João e sou desenvolvedor Python"
"Estou trabalhando em um projeto de machine learning"
"Prefiro explicações técnicas detalhadas"
```

A Karen lembrará dessas informações em conversas futuras!

## 🏗️ Estrutura do Projeto

```
Projeto Karen/
├── app.py                 # Backend Flask
├── requirements.txt       # Dependências Python
├── .env.example          # Exemplo de variáveis de ambiente
├── package.json          # Dependências Node.js
├── vite.config.js        # Configuração do Vite
├── tailwind.config.js    # Configuração do Tailwind
├── postcss.config.js     # Configuração do PostCSS
├── index.html            # HTML principal
├── src/
│   ├── main.jsx          # Ponto de entrada React
│   ├── App.jsx           # Componente principal
│   ├── index.css         # Estilos globais
│   ├── karen_prompt.txt  # Prompt da IA Karen
│   └── karen_memory.txt  # Arquivo de memória de longo prazo
└── firebase-credentials.json  # Credenciais Firebase
```

## 🔍 Endpoints da API

### POST `/api/interact`
Recebe texto do usuário e retorna resposta processada pela IA.

**Request:**
```json
{
  "text": "Crie uma tarefa para comprar pão"
}
```

**Response:**
```json
{
  "responseText": "Tarefa 'comprar pão' criada com sucesso!",
  "audioUrl": "data:audio/mpeg;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA..."
}
```

### GET `/api/chat-history`
Retorna o histórico de conversas do usuário.

### POST `/api/clear-chat`
Limpa o histórico de conversas do usuário.

### GET `/health`
Verifica se o servidor está funcionando.

## 🐛 Solução de Problemas

### Erro de CORS
- Verifique se o Flask-CORS está instalado
- Confirme que o backend está rodando na porta 5000

### Microfone não funciona
- Use HTTPS ou localhost
- Verifique permissões do navegador
- Teste no Chrome (melhor suporte)

### Erro de conexão com backend
- Confirme que o backend está rodando
- Verifique se não há firewall bloqueando a porta 5000

## 📝 Próximos Passos

- [x] ~~Integração com Groq AI~~
- [x] ~~Integração com ElevenLabs~~
- [x] ~~Conexão com Firebase/Firestore~~
- [x] ~~Sistema de memória de longo prazo~~
- [x] ~~Histórico de conversas~~
- [ ] Implementação completa de Tarefas (CRUD)
- [ ] Sistema de Hábitos
- [ ] Integração com Google Calendar
- [ ] Sistema de Finanças
- [ ] Aplicação desktop com wake word
- [ ] Notificações push
- [ ] Backup automático da memória

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para o Projeto Karen v1.0**