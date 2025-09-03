# Configuração do Backend no Render - Projeto Karen

## Pré-requisitos
- Conta no Render (https://render.com/)
- Repositório GitHub conectado
- Credenciais do Firebase, Groq e Hugging Face

## Passo 1: Criar Web Service no Render

1. Acesse https://render.com/ e faça login
2. Clique em "New +" > "Web Service"
3. Conecte seu repositório GitHub: `LadiesMan0217/Projeto-Karen`
4. Configure o serviço:
   - **Name**: `karen-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Instance Type**: `Free`

## Passo 2: Configurar Variáveis de Ambiente

No dashboard do Render, vá em "Environment" e adicione as seguintes variáveis:

### Variáveis Obrigatórias:
```
GROQ_API_KEY=sua_chave_groq_aqui
HF_TOKEN=seu_token_hugging_face_aqui
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
VITE_FIREBASE_API_KEY=sua_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
FLASK_ENV=production
PORT=10000
```

### Como obter as credenciais:

#### Groq API Key:
1. Acesse https://console.groq.com/
2. Faça login/cadastro
3. Vá em "API Keys"
4. Crie uma nova chave

#### Hugging Face Token:
1. Acesse https://huggingface.co/settings/tokens
2. Faça login/cadastro
3. Crie um novo token com permissões de leitura

#### Firebase Credentials:
1. Acesse https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em "Configurações do Projeto" > "Contas de Serviço"
4. Clique em "Gerar nova chave privada"
5. Baixe o arquivo JSON
6. **IMPORTANTE**: Você precisa fazer upload deste arquivo para o Render

## Passo 3: Upload do Arquivo de Credenciais Firebase

**ATENÇÃO**: O Render não permite upload direto de arquivos. Você tem duas opções:

### Opção 1: Usar variável de ambiente (Recomendado)
1. Abra o arquivo `firebase-credentials.json`
2. Copie todo o conteúdo JSON
3. No Render, crie uma variável chamada `FIREBASE_CREDENTIALS_JSON`
4. Cole o conteúdo JSON como valor
5. Modifique o código para usar esta variável

### Opção 2: Incluir no repositório (Menos seguro)
1. Adicione o arquivo ao repositório (temporariamente)
2. Faça deploy
3. Remove o arquivo do repositório depois

## Passo 4: Verificar Deploy

1. Após configurar tudo, clique em "Deploy"
2. Aguarde o build completar (pode levar alguns minutos)
3. Teste o endpoint de saúde: `https://seu-app.onrender.com/health`
4. Se retornar status 200 com JSON, está funcionando!

## Passo 5: Atualizar Frontend

1. Anote a URL gerada pelo Render (ex: `https://karen-backend.onrender.com`)
2. No arquivo `App.jsx`, atualize a variável `BACKEND_URL`:
   ```javascript
   const BACKEND_URL = 'https://karen-backend.onrender.com';
   ```

## Troubleshooting

### Backend retorna 404:
- Verifique se o Procfile está presente no repositório
- Confirme que o comando de start está correto: `gunicorn app:app`
- Verifique os logs no dashboard do Render

### Erro de CORS:
- Confirme que a configuração do CORS inclui o domínio da Vercel
- Verifique se os headers estão corretos

### Erro de Firebase:
- Confirme que todas as variáveis VITE_FIREBASE_* estão configuradas
- Verifique se o arquivo de credenciais está acessível
- Teste a conexão com o Firestore

### Erro de API Keys:
- Confirme que GROQ_API_KEY e HF_TOKEN estão corretos
- Teste as chaves em um ambiente local primeiro

## Comandos Úteis

```bash
# Testar localmente
python app.py

# Verificar se gunicorn funciona
gunicorn app:app

# Testar endpoint de saúde
curl https://seu-app.onrender.com/health
```

## Próximos Passos

1. Configure todas as variáveis de ambiente
2. Faça upload das credenciais Firebase
3. Teste o deploy
4. Atualize o frontend com a nova URL
5. Teste a integração completa