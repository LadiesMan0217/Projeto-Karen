from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import base64
from datetime import datetime, timedelta
from dateutil import parser
from dotenv import load_dotenv

# Google APIs
import google.generativeai as genai
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Firebase
import firebase_admin
from firebase_admin import credentials, firestore

# ElevenLabs
from elevenlabs import generate, set_api_key

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend

# Configuração das chaves de API (carregadas do .env)
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH')

# Inicialização dos serviços
db = None
calendar_service = None
gemini_model = None

def initialize_services():
    """Inicializa todos os serviços externos"""
    global db, calendar_service, gemini_model
    
    try:
        # Inicializar Firebase Admin SDK
        if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
            if not firebase_admin._apps:
                cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
                firebase_admin.initialize_app(cred)
            db = firestore.client()
            print("✓ Firebase inicializado com sucesso")
        else:
            print("⚠ Firebase credentials não encontradas")
        
        # Inicializar Google Gemini
        if GOOGLE_API_KEY:
            genai.configure(api_key=GOOGLE_API_KEY)
            gemini_model = genai.GenerativeModel('gemini-pro')
            print("✓ Google Gemini inicializado com sucesso")
        else:
            print("⚠ Google API Key não encontrada")
        
        # Inicializar ElevenLabs
        if ELEVENLABS_API_KEY:
            set_api_key(ELEVENLABS_API_KEY)
            print("✓ ElevenLabs inicializado com sucesso")
        else:
            print("⚠ ElevenLabs API Key não encontrada")
        
        # Inicializar Google Calendar
        if FIREBASE_CREDENTIALS_PATH and os.path.exists(FIREBASE_CREDENTIALS_PATH):
            creds = Credentials.from_service_account_file(
                FIREBASE_CREDENTIALS_PATH,
                scopes=['https://www.googleapis.com/auth/calendar']
            )
            calendar_service = build('calendar', 'v3', credentials=creds)
            print("✓ Google Calendar inicializado com sucesso")
        else:
            print("⚠ Google Calendar credentials não encontradas")
            
    except Exception as e:
        print(f"❌ Erro na inicialização dos serviços: {str(e)}")

# Inicializar serviços na inicialização do app
initialize_services()

def interpret_user_intent(user_text):
    """Usa Gemini para interpretar a intenção do usuário"""
    if not gemini_model:
        return {
            "intent": "error",
            "message": "Gemini não está disponível"
        }
    
    try:
        prompt = f"""
Você é a Karen, uma assistente pessoal. Analise o texto do usuário e identifique a intenção.
Retorne APENAS um JSON válido com a estrutura:
{{
    "intent": "create_task" | "create_reminder" | "list_tasks" | "list_reminders" | "general_chat",
    "details": {{
        "what": "descrição da tarefa/lembrete",
        "when": "data/hora se especificada",
        "priority": "alta" | "média" | "baixa"
    }},
    "response": "resposta amigável para o usuário"
}}

Texto do usuário: "{user_text}"
"""
        
        response = gemini_model.generate_content(prompt)
        
        # Tentar extrair JSON da resposta
        response_text = response.text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:-3].strip()
        elif response_text.startswith('```'):
            response_text = response_text[3:-3].strip()
            
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Erro ao interpretar intenção: {str(e)}")
        return {
            "intent": "general_chat",
            "details": {},
            "response": f"Desculpe, não consegui entender completamente. Você disse: {user_text}"
        }

def handle_task_creation(details, user_id="anonymous"):
    """Cria uma nova tarefa no Firestore"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        task_data = {
            "what": details.get("what", ""),
            "priority": details.get("priority", "média"),
            "completed": False,
            "created_at": datetime.now(),
            "user_id": user_id
        }
        
        # Adicionar ao Firestore
        doc_ref = db.collection('users').document(user_id).collection('tasks').add(task_data)
        return f"Tarefa '{details.get('what')}' criada com sucesso!"
        
    except Exception as e:
        print(f"Erro ao criar tarefa: {str(e)}")
        return "Erro ao criar a tarefa"

def handle_reminder_creation(details, user_id="anonymous"):
    """Cria um lembrete no Google Calendar"""
    if not calendar_service:
        return "Erro: Google Calendar não está disponível"
    
    try:
        # Processar data/hora
        when = details.get("when", "")
        start_time = datetime.now() + timedelta(hours=1)  # Default: 1 hora a partir de agora
        
        if when:
            # Tentar interpretar datas relativas
            if "amanhã" in when.lower():
                start_time = datetime.now() + timedelta(days=1)
                if "10" in when or "10h" in when:
                    start_time = start_time.replace(hour=10, minute=0, second=0, microsecond=0)
            elif "próxima" in when.lower() and "sexta" in when.lower():
                days_ahead = 4 - datetime.now().weekday()  # 4 = Friday
                if days_ahead <= 0:
                    days_ahead += 7
                start_time = datetime.now() + timedelta(days=days_ahead)
        
        event = {
            'summary': details.get("what", "Lembrete da Karen"),
            'description': f"Lembrete criado pela assistente Karen",
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/Sao_Paulo',
            },
            'end': {
                'dateTime': (start_time + timedelta(minutes=30)).isoformat(),
                'timeZone': 'America/Sao_Paulo',
            },
        }
        
        created_event = calendar_service.events().insert(calendarId='primary', body=event).execute()
        return f"Lembrete '{details.get('what')}' criado para {start_time.strftime('%d/%m/%Y às %H:%M')}!"
        
    except Exception as e:
        print(f"Erro ao criar lembrete: {str(e)}")
        return "Erro ao criar o lembrete"

def generate_audio_response(text):
    """Gera áudio usando ElevenLabs"""
    if not ELEVENLABS_API_KEY:
        return None
    
    try:
        audio = generate(
            text=text,
            voice="Bella",  # Voz feminina padrão
            model="eleven_multilingual_v2"
        )
        
        # Converter para base64 para enviar ao frontend
        audio_base64 = base64.b64encode(audio).decode('utf-8')
        return f"data:audio/mpeg;base64,{audio_base64}"
        
    except Exception as e:
        print(f"Erro ao gerar áudio: {str(e)}")
        return None

@app.route('/api/interact', methods=['POST'])
def interact():
    """
    Endpoint principal para interação com a Karen.
    Usa Gemini para interpretar intenções e ElevenLabs para gerar áudio.
    """
    try:
        # Recebe o JSON do frontend
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'error': 'Texto não fornecido'
            }), 400
        
        user_text = data['text']
        user_id = data.get('userId', 'anonymous')
        
        print(f"📝 Processando: {user_text}")
        
        # 1. Interpretar intenção com Gemini
        intent_result = interpret_user_intent(user_text)
        
        if intent_result.get('intent') == 'error':
            return jsonify({
                'error': intent_result.get('message', 'Erro ao processar')
            }), 500
        
        # 2. Processar com base na intenção
        intent = intent_result.get('intent')
        details = intent_result.get('details', {})
        response_text = intent_result.get('response', 'Processado com sucesso!')
        
        if intent == 'create_task':
            task_result = handle_task_creation(details, user_id)
            response_text = task_result
            
        elif intent == 'create_reminder':
            reminder_result = handle_reminder_creation(details, user_id)
            response_text = reminder_result
            
        elif intent == 'list_tasks':
            # TODO: Implementar listagem de tarefas
            response_text = "Funcionalidade de listar tarefas será implementada em breve."
            
        elif intent == 'list_reminders':
            # TODO: Implementar listagem de lembretes
            response_text = "Funcionalidade de listar lembretes será implementada em breve."
        
        # 3. Gerar áudio da resposta
        audio_data = generate_audio_response(response_text)
        
        print(f"✅ Resposta: {response_text}")
        
        # 4. Retornar resposta completa
        return jsonify({
            'responseText': response_text,
            'audioUrl': audio_data,
            'intent': intent,
            'details': details
        })
        
    except Exception as e:
        print(f"❌ Erro no endpoint interact: {str(e)}")
        return jsonify({
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500

@app.route('/api/tasks', methods=['GET', 'POST'])
def tasks():
    """Endpoint para gerenciar tarefas"""
    try:
        if request.method == 'GET':
            # Listar todas as tarefas do usuário
            user_id = request.args.get('userId', 'anonymous')
            
            if not db:
                return jsonify({'error': 'Firebase não disponível'}), 500
            
            tasks_ref = db.collection('users').document(user_id).collection('tasks')
            tasks = tasks_ref.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
            
            tasks_list = []
            for task in tasks:
                task_data = task.to_dict()
                task_data['id'] = task.id
                # Converter datetime para string
                if 'created_at' in task_data:
                    task_data['created_at'] = task_data['created_at'].isoformat()
                tasks_list.append(task_data)
            
            return jsonify({'tasks': tasks_list})
            
        elif request.method == 'POST':
            # Criar nova tarefa
            data = request.get_json()
            user_id = data.get('userId', 'anonymous')
            
            if not data or 'what' not in data:
                return jsonify({'error': 'Descrição da tarefa não fornecida'}), 400
            
            task_data = {
                'what': data['what'],
                'priority': data.get('priority', 'média'),
                'completed': data.get('completed', False),
                'created_at': datetime.now(),
                'user_id': user_id
            }
            
            if not db:
                return jsonify({'error': 'Firebase não disponível'}), 500
            
            doc_ref = db.collection('users').document(user_id).collection('tasks').add(task_data)
            
            return jsonify({
                'message': 'Tarefa criada com sucesso',
                'taskId': doc_ref[1].id
            })
            
    except Exception as e:
        print(f"❌ Erro no endpoint tasks: {str(e)}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/reminders', methods=['GET', 'POST'])
def reminders():
    """Endpoint para gerenciar lembretes/agenda"""
    try:
        if request.method == 'GET':
            # Listar próximos eventos do Google Calendar
            if not calendar_service:
                return jsonify({'error': 'Google Calendar não disponível'}), 500
            
            # Buscar eventos dos próximos 30 dias
            now = datetime.now().isoformat() + 'Z'
            events_result = calendar_service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=20,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            reminders_list = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                reminders_list.append({
                    'id': event['id'],
                    'summary': event.get('summary', 'Sem título'),
                    'description': event.get('description', ''),
                    'start': start,
                    'created_by_karen': 'Karen' in event.get('description', '')
                })
            
            return jsonify({'reminders': reminders_list})
            
        elif request.method == 'POST':
            # Criar novo lembrete
            data = request.get_json()
            
            if not data or 'what' not in data:
                return jsonify({'error': 'Descrição do lembrete não fornecida'}), 400
            
            details = {
                'what': data['what'],
                'when': data.get('when', '')
            }
            
            result = handle_reminder_creation(details)
            
            return jsonify({
                'message': result
            })
            
    except Exception as e:
        print(f"❌ Erro no endpoint reminders: {str(e)}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """
    Endpoint para verificar se o servidor está funcionando.
    """
    return jsonify({
        'status': 'OK',
        'message': 'Karen Backend está funcionando'
    })

if __name__ == '__main__':
    # Verifica se as variáveis de ambiente estão configuradas
    if not GOOGLE_API_KEY:
        print("AVISO: GOOGLE_API_KEY não encontrada no arquivo .env")
    if not ELEVENLABS_API_KEY:
        print("AVISO: ELEVENLABS_API_KEY não encontrada no arquivo .env")
    if not FIREBASE_CREDENTIALS_PATH:
        print("AVISO: FIREBASE_CREDENTIALS_PATH não encontrada no arquivo .env")
    
    # Inicia o servidor Flask
    app.run(debug=True, host='0.0.0.0', port=5000)