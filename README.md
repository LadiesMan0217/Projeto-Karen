# Projeto Karen - Versão 1 (Fundação Web)

Assistente pessoal inteligente com interação por voz, desenvolvida com React (frontend) e Flask (backend).

## 🚀 Funcionalidades

- **Interação por Voz**: Reconhecimento de fala usando Web Speech API
- **Interface Moderna**: Design responsivo com Tailwind CSS e tema escuro
- **Backend Mockado**: Endpoint Flask simulando integração com Gemini e ElevenLabs
- **Chat em Tempo Real**: Conversa fluida entre usuário e Karen

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
# Google API Key (Gemini + Google Calendar)
GOOGLE_API_KEY=sua_chave_aqui

# ElevenLabs API Key (Síntese de Voz)
ELEVENLABS_API_KEY=sua_chave_aqui

# Caminho para credenciais do Firebase
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json.json
```

### Como obter as chaves:

1. **Google API Key**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **ElevenLabs API Key**: [ElevenLabs Dashboard](https://elevenlabs.io/app/speech-synthesis)
3. **Firebase Credentials**: [Firebase Console](https://console.firebase.google.com/) > Configurações do Projeto > Contas de Serviço

## 📱 Como Usar

1. Abra o navegador em `http://localhost:3000`
2. Clique no botão do microfone (🎤)
3. Permita o acesso ao microfone quando solicitado
4. Fale com a Karen em português
5. Veja a resposta aparecer no chat

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
│   └── index.css         # Estilos globais
└── firebase-credentials.json.json  # Credenciais Firebase
```

## 🔍 Endpoints da API

### POST `/api/interact`
Recebe texto do usuário e retorna resposta mockada.

**Request:**
```json
{
  "text": "Crie uma tarefa para comprar pão"
}
```

**Response:**
```json
{
  "responseText": "Resposta do Gemini para: Crie uma tarefa para comprar pão",
  "audioUrl": "placeholder_audio.mp3"
}
```

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

- [ ] Integração real com Google Gemini
- [ ] Integração real com ElevenLabs
- [ ] Conexão com Firebase/Firestore
- [ ] Implementação de funcionalidades (Tarefas, Hábitos, etc.)
- [ ] Aplicação desktop com wake word

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para o Projeto Karen v1.0**