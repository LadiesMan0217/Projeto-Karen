# Projeto Karen - Assistente Virtual Inteligente

## 📋 Visão Geral do Projeto

Karen é uma assistente virtual inteligente desenvolvida com arquitetura moderna e desacoplada. O projeto utiliza:

- **Backend**: Python/Flask hospedado no Render
- **Frontend**: React hospedado na Vercel
- **IA**: Groq API para processamento de linguagem natural
- **TTS**: Hugging Face para síntese de voz
- **Banco de Dados**: Firebase Firestore
- **Autenticação**: Firebase Authentication (Google Sign-In)

### Funcionalidades

- ✅ Chat por texto e voz
- ✅ Autenticação com Google
- ✅ Histórico de conversas persistente
- ✅ Síntese de voz em português
- ✅ Interface responsiva e moderna
- ✅ Memória persistente da assistente

## 🔧 Configuração de Ambiente

### Chaves de API Necessárias

#### 1. Groq API
- Acesse: https://console.groq.com/
- Crie uma conta e gere uma API Key
- Adicione ao `.env` como `GROQ_API_KEY`

#### 2. Hugging Face Token
- Acesse: https://huggingface.co/settings/tokens
- Crie um token de acesso
- Adicione ao `.env` como `HF_TOKEN`

#### 3. Firebase
- Acesse: https://console.firebase.google.com/
- Crie um novo projeto
- Ative Authentication (Google Sign-In)
- Ative Firestore Database
- Baixe o arquivo `firebase-credentials.json` em:
  - Project Settings > Service Accounts > Generate new private key
- Configure as variáveis do frontend no `.env`

### Arquivo .env

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Python 3.8+
- Node.js 16+
- npm ou yarn

### Backend (Flask)

1. **Instalar dependências**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configurar variáveis de ambiente**:
   - Copie `.env.example` para `.env`
   - Preencha todas as variáveis necessárias
   - Coloque o arquivo `firebase-credentials.json` na raiz do projeto

3. **Executar o servidor**:
   ```bash
   python app.py
   ```

   O backend estará disponível em: `http://localhost:5000`

### Frontend (React)

1. **Instalar dependências**:
   ```bash
   npm install
   # ou
   yarn install
   ```

2. **Configurar variáveis de ambiente**:
   - Configure as variáveis `VITE_FIREBASE_*` no `.env`
   - Ajuste a URL do backend em `App.jsx` se necessário

3. **Executar o desenvolvimento**:
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

   O frontend estará disponível em: `http://localhost:5173`

## 🌐 Instruções de Deploy

### Deploy do Backend no Render

#### Passo 1: Preparar o Repositório
1. Faça commit de todos os arquivos (exceto `.env` e `firebase-credentials.json`)
2. Push para um repositório Git (GitHub, GitLab, etc.)

#### Passo 2: Criar Web Service no Render
1. Acesse: https://render.com/
2. Clique em "New" > "Web Service"
3. Conecte seu repositório Git
4. Configure:
   - **Name**: `karen-backend` (ou nome de sua escolha)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: `Free` (para testes)

#### Passo 3: Configurar Variáveis de Ambiente
No dashboard do Render, vá em "Environment" e adicione:

```
GROQ_API_KEY=sua_chave_groq_aqui
HF_TOKEN=seu_token_hugging_face_aqui
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

#### Passo 4: Upload do Firebase Credentials
1. No dashboard do Render, vá em "Settings"
2. Na seção "Files", faça upload do `firebase-credentials.json`
3. Certifique-se de que o caminho seja `./firebase-credentials.json`

#### Passo 5: Deploy
1. Clique em "Create Web Service"
2. Aguarde o build e deploy (pode levar alguns minutos)
3. Anote a URL gerada (ex: `https://karen-backend.onrender.com`)

### Deploy do Frontend na Vercel

#### Passo 1: Preparar o Frontend
1. Certifique-se de que o `App.jsx` está configurado corretamente
2. Atualize a variável `BACKEND_URL` com a URL do Render
3. Crie um arquivo `package.json` se não existir:

```json
{
  "name": "karen-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^10.7.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.8"
  }
}
```

#### Passo 2: Configurar Vite
Crie `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
```

#### Passo 3: Configurar Tailwind CSS
Crie `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Crie `postcss.config.js`:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

#### Passo 4: Criar index.html
```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Karen - Assistente Virtual</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.jsx"></script>
  </body>
</html>
```

#### Passo 5: Criar main.jsx
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

#### Passo 6: Criar index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

#### Passo 7: Deploy na Vercel
1. Acesse: https://vercel.com/
2. Clique em "New Project"
3. Conecte seu repositório Git
4. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (se o frontend está na raiz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### Passo 8: Configurar Variáveis de Ambiente na Vercel
Na seção "Environment Variables", adicione:

```
VITE_FIREBASE_API_KEY=sua_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

#### Passo 9: Deploy
1. Clique em "Deploy"
2. Aguarde o build e deploy
3. Acesse a URL gerada pela Vercel

## 📁 Estrutura do Projeto

```
Projeto Karen/
├── app.py                 # Backend Flask
├── requirements.txt       # Dependências Python
├── karen_prompt.txt       # Prompt da assistente
├── karen_memory.txt       # Memória persistente
├── firebase-credentials.json # Credenciais Firebase (não commitado)
├── .env                   # Variáveis de ambiente (não commitado)
├── .env.example          # Exemplo de variáveis
├── App.jsx               # Frontend React
├── package.json          # Dependências Node.js
├── vite.config.js        # Configuração Vite
├── tailwind.config.js    # Configuração Tailwind
├── postcss.config.js     # Configuração PostCSS
├── index.html            # HTML principal
├── main.jsx              # Entry point React
├── index.css             # Estilos CSS
└── README.md             # Este arquivo
```

## 🔒 Segurança

- ✅ Nunca commite arquivos `.env` ou `firebase-credentials.json`
- ✅ Use variáveis de ambiente para todas as chaves sensíveis
- ✅ Configure CORS adequadamente no backend
- ✅ Valide todas as entradas do usuário

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de CORS**: Verifique se o Flask-CORS está configurado corretamente
2. **Firebase não conecta**: Verifique as credenciais e configurações
3. **Groq API falha**: Verifique se a chave está correta e tem créditos
4. **TTS não funciona**: Verifique o token do Hugging Face

### Logs

- **Backend**: Verifique os logs no dashboard do Render
- **Frontend**: Use o console do navegador (F12)

## 📞 Suporte

Para suporte técnico:
1. Verifique os logs de erro
2. Consulte a documentação das APIs utilizadas
3. Verifique se todas as variáveis de ambiente estão configuradas

## 📄 Licença

Este projeto é de uso pessoal e educacional.

---

**Desenvolvido com ❤️ para demonstrar uma arquitetura moderna de assistente virtual**