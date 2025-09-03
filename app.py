from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from datetime import datetime
import base64
import requests
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
from groq import Groq
from functools import wraps

# Carrega variáveis de ambiente
load_dotenv()

# Configuração do Flask
app = Flask(__name__)

# Configuração do CORS para permitir requisições da Vercel
CORS(app, 
     origins=['https://*.vercel.app', 'https://*.vercel.com', 'http://localhost:5173', 'http://localhost:3000'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     supports_credentials=True)

# Configuração das chaves de API
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
HF_TOKEN = os.getenv('HF_TOKEN')  # Hugging Face Token para TTS
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH')

# Caminhos dos arquivos de treinamento
KAREN_PROMPT_PATH = 'karen_prompt.txt'
KAREN_MEMORY_PATH = 'karen_memory.txt'

# Inicialização dos serviços
db = None
groq_client = None

def verify_firebase_token(f):
    """Decorator para verificar Bearer Token do Firebase"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Extrair o token do cabeçalho Authorization
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'Token de autorização necessário'}), 401
            
            # Extrair o token (remover 'Bearer ')
            id_token = auth_header.split('Bearer ')[1]
            
            # Verificar o token com Firebase Admin
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
            # Adicionar o uid ao request para uso na função
            request.uid = uid
            
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"(ERROR) Erro na verificação do token: {e}")
            return jsonify({'error': 'Token inválido'}), 401
    
    return decorated_function

def initialize_services():
    """Inicializa todos os serviços externos"""
    global db, groq_client
    
    try:
        # Inicializar Firebase Admin SDK
        if not firebase_admin._apps:
            # Tentar usar credenciais via variável de ambiente primeiro (para Render)
            firebase_creds_json = os.getenv('FIREBASE_CREDENTIALS_JSON')
            
            if firebase_creds_json:
                # Usar credenciais do JSON na variável de ambiente
                cred_dict = json.loads(firebase_creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase inicializado com credenciais da variável de ambiente")
            else:
                # Fallback para arquivo local (desenvolvimento)
                if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
                    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred)
                    print(f"✅ Firebase inicializado com credenciais de: {FIREBASE_CREDENTIALS_PATH}")
                else:
                    print("❌ Credenciais Firebase não encontradas. Configure FIREBASE_CREDENTIALS_JSON ou FIREBASE_CREDENTIALS_PATH")
                    return False
        
        db = firestore.client()
        print("(OK) Firebase inicializado com sucesso")
        
        # Inicializar Groq AI
        if GROQ_API_KEY:
            groq_client = Groq(api_key=GROQ_API_KEY)
            print("(OK) Groq AI inicializado com sucesso")
        else:
            print("(WARNING) Groq API Key não encontrada")
            
    except Exception as e:
        print(f"(ERROR) Erro na inicialização dos serviços: {str(e)}")

def read_karen_prompt():
    """Lê o manual de instruções da Karen"""
    try:
        if os.path.exists(KAREN_PROMPT_PATH):
            with open(KAREN_PROMPT_PATH, 'r', encoding='utf-8') as file:
                content = file.read()
                print(f"(PROMPT) Manual da Karen carregado: {len(content)} caracteres")
                return content
        else:
            print("(WARNING) Arquivo karen_prompt.txt não encontrado")
            return "Você é Karen, uma assistente virtual inteligente e prestativa."
    except Exception as e:
        print(f"(ERROR) Erro ao ler karen_prompt.txt: {str(e)}")
        return "Você é Karen, uma assistente virtual inteligente e prestativa."

def read_karen_memory():
    """Lê a memória de longo prazo da Karen"""
    try:
        if os.path.exists(KAREN_MEMORY_PATH):
            with open(KAREN_MEMORY_PATH, 'r', encoding='utf-8') as file:
                content = file.read()
                print(f"(MEMORY) Memória da Karen carregada: {len(content)} caracteres")
                return content
        else:
            print("(WARNING) Arquivo karen_memory.txt não encontrado")
            return ""
    except Exception as e:
        print(f"(ERROR) Erro ao ler karen_memory.txt: {str(e)}")
        return ""

def update_karen_memory(memory_content):
    """Adiciona nova informação à memória da Karen"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_entry = f"\n[{timestamp}] {memory_content}"
        
        with open(KAREN_MEMORY_PATH, 'a', encoding='utf-8') as file:
            file.write(new_entry)
        
        print(f"(MEMORY) Nova entrada adicionada: {memory_content[:50]}...")
        return True
    except Exception as e:
        print(f"(ERROR) Erro ao atualizar memória: {str(e)}")
        return False

def save_chat_to_firestore(user_id, user_message, karen_response):
    """Salva a conversa no Firestore"""
    try:
        if not db:
            print("(WARNING) Firebase não inicializado")
            return False
        
        chat_data = {
            'timestamp': datetime.now(),
            'userMessage': user_message,
            'karenResponse': karen_response,
            'userId': user_id
        }
        
        # Salva no caminho /users/{userId}/chatHistory
        db.collection('users').document(user_id).collection('chatHistory').add(chat_data)
        print(f"(FIRESTORE) Conversa salva para usuário: {user_id}")
        return True
        
    except Exception as e:
        print(f"(ERROR) Erro ao salvar no Firestore: {str(e)}")
        return False

def generate_audio_with_huggingface(text):
    """Gera áudio usando a API de TTS do Hugging Face"""
    try:
        if not HF_TOKEN:
            print("(ERROR) Hugging Face Token não encontrado")
            return None
        
        # URL da API de TTS do Hugging Face (usando modelo Microsoft SpeechT5)
        api_url = "https://api-inference.huggingface.co/models/microsoft/speecht5_tts"
        
        headers = {
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "inputs": text,
            "options": {
                "wait_for_model": True
            }
        }
        
        print(f"(AUDIO) Gerando áudio para: '{text[:50]}...'")
        
        response = requests.post(api_url, headers=headers, json=payload)
        
        if response.status_code == 200:
            audio_content = response.content
            print(f"(AUDIO) Áudio gerado com sucesso! Tamanho: {len(audio_content)} bytes")
            return audio_content
        else:
            print(f"(ERROR) Erro na API Hugging Face: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"(ERROR) Erro ao gerar áudio: {str(e)}")
        return None

def process_with_groq(user_message, system_prompt):
    """Processa a mensagem do usuário usando Groq AI"""
    try:
        if not groq_client:
            print("(ERROR) Groq client não inicializado")
            return None
        
        print(f"(GROQ) Processando mensagem: '{user_message[:50]}...'")
        
        # Chama a API da Groq
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            model="llama3-8b-8192",  # Modelo recomendado da Groq
            temperature=0.7,
            max_tokens=1024
        )
        
        response_content = chat_completion.choices[0].message.content
        print(f"(GROQ) Resposta recebida: {len(response_content)} caracteres")
        
        # Tenta fazer parse como JSON para verificar se há memory_update
        try:
            response_json = json.loads(response_content)
            return response_json
        except json.JSONDecodeError:
            # Se não for JSON válido, retorna como texto simples
            return {"responseText": response_content}
            
    except Exception as e:
        print(f"(ERROR) Erro ao processar com Groq: {str(e)}")
        return None

@app.route('/api/interact', methods=['POST'])
@verify_firebase_token
def interact():
    """Endpoint principal para interação com a Karen"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        user_id = request.uid  # Usar o uid verificado do token Firebase
        
        if not user_message:
            return jsonify({'error': 'Mensagem não fornecida'}), 400
        
        print(f"(API) Nova interação - Usuário: {user_id}, Mensagem: '{user_message[:50]}...'")
        
        # Lê o manual e a memória da Karen
        karen_prompt = read_karen_prompt()
        karen_memory = read_karen_memory()
        
        # Monta o system prompt completo
        system_prompt = f"{karen_prompt}\n\nMEMÓRIA ATUAL:\n{karen_memory}"
        
        # Processa com Groq
        groq_response = process_with_groq(user_message, system_prompt)
        
        if not groq_response:
            return jsonify({'error': 'Erro ao processar mensagem'}), 500
        
        # Verifica se há atualização de memória
        if 'memory_update' in groq_response:
            update_karen_memory(groq_response['memory_update'])
        
        # Extrai o texto da resposta
        response_text = groq_response.get('responseText', 'Desculpe, não consegui processar sua mensagem.')
        
        # Gera o áudio
        audio_content = generate_audio_with_huggingface(response_text)
        
        # Salva a conversa no Firestore
        save_chat_to_firestore(user_id, user_message, response_text)
        
        # Retorna apenas o áudio puro como solicitado
        if audio_content:
            return audio_content, 200, {'Content-Type': 'audio/wav'}
        else:
            return jsonify({'error': 'Erro ao gerar áudio'}), 500
            
    except Exception as e:
        print(f"(ERROR) Erro no endpoint interact: {str(e)}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

@app.route('/api/chat-history', methods=['GET'])
@verify_firebase_token
def get_chat_history():
    """Busca o histórico de chat do Firestore"""
    try:
        user_id = request.uid  # Usar o uid verificado do token Firebase
        
        if not db:
            return jsonify({'error': 'Firebase não inicializado'}), 500
        
        # Busca o histórico do usuário
        chat_ref = db.collection('users').document(user_id).collection('chatHistory')
        docs = chat_ref.order_by('timestamp').stream()
        
        history = []
        for doc in docs:
            data = doc.to_dict()
            history.append({
                'id': doc.id,
                'userMessage': data.get('userMessage', ''),
                'karenResponse': data.get('karenResponse', ''),
                'timestamp': data.get('timestamp')
            })
        
        print(f"(API) Histórico recuperado para {user_id}: {len(history)} mensagens")
        return jsonify({'history': history})
        
    except Exception as e:
        print(f"(ERROR) Erro ao buscar histórico: {str(e)}")
        return jsonify({'error': 'Erro ao buscar histórico'}), 500

@app.route('/api/clear-chat', methods=['DELETE'])
@verify_firebase_token
def clear_chat():
    """Apaga o histórico de chat do Firestore"""
    try:
        user_id = request.uid  # Usar o uid verificado do token Firebase
        
        if not db:
            return jsonify({'error': 'Firebase não inicializado'}), 500
        
        # Apaga todas as mensagens do usuário
        chat_ref = db.collection('users').document(user_id).collection('chatHistory')
        docs = chat_ref.stream()
        
        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        
        print(f"(API) Histórico limpo para {user_id}: {deleted_count} mensagens removidas")
        return jsonify({'message': f'{deleted_count} mensagens removidas'})
        
    except Exception as e:
        print(f"(ERROR) Erro ao limpar histórico: {str(e)}")
        return jsonify({'error': 'Erro ao limpar histórico'}), 500

@app.route('/', methods=['GET'])
def root():
    """Rota raiz para verificar se o serviço está rodando"""
    return jsonify({
        'message': 'Karen Backend API está rodando!',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de saúde para o Render"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'groq': groq_client is not None,
            'firebase': db is not None,
            'huggingface': HF_TOKEN is not None
        }
    })

# Inicializa os serviços sempre (tanto para desenvolvimento quanto produção)
initialize_services()

if __name__ == '__main__':
    # Configuração para desenvolvimento local
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
