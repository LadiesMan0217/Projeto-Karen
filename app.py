from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import base64
from datetime import datetime, timedelta
from dateutil import parser
from dotenv import load_dotenv

# Google APIs (Mantido para compatibilidade)
import google.generativeai as genai
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Groq AI
from groq import Groq

# Firebase
import firebase_admin
from firebase_admin import credentials, firestore

# ElevenLabs
from elevenlabs import generate, set_api_key

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend

# Caminho para o arquivo de memória
MEMORY_FILE_PATH = os.path.join('src', 'karen_memory.txt')

# Configuração das chaves de API (carregadas do .env)
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
FIREBASE_CREDENTIALS_PATH = os.getenv('FIREBASE_CREDENTIALS_PATH')

# Inicialização dos serviços
db = None
calendar_service = None
gemini_model = None
groq_client = None

def initialize_services():
    """Inicializa todos os serviços externos"""
    global db, calendar_service, gemini_model, groq_client
    
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
        
        # Inicializar Google Gemini (Mantido para compatibilidade)
        if GOOGLE_API_KEY:
            genai.configure(api_key=GOOGLE_API_KEY)
            gemini_model = genai.GenerativeModel('gemini-pro')
            print("✓ Google Gemini inicializado com sucesso")
        else:
            print("⚠ Google API Key não encontrada")
        
        # Inicializar Groq AI
        if GROQ_API_KEY:
            groq_client = Groq(api_key=GROQ_API_KEY)
            print("✓ Groq AI inicializado com sucesso")
        else:
            print("⚠ Groq API Key não encontrada")
        
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

# ===== FUNÇÕES DE MEMÓRIA DE LONGO PRAZO =====

def read_memory():
    """Lê o conteúdo atual da memória de longo prazo"""
    try:
        if os.path.exists(MEMORY_FILE_PATH):
            with open(MEMORY_FILE_PATH, 'r', encoding='utf-8') as file:
                content = file.read()
                print(f"🧠 [DEBUG] Memória lida: {len(content)} caracteres")
                return content
        else:
            print("⚠️ [DEBUG] Arquivo de memória não encontrado")
            return ""
    except Exception as e:
        print(f"❌ [DEBUG] Erro ao ler memória: {str(e)}")
        return ""

def write_memory_entry(category, information):
    """Adiciona uma nova entrada à memória de longo prazo"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        new_entry = f"\n[{timestamp}] {category.upper()}: {information}"
        
        with open(MEMORY_FILE_PATH, 'a', encoding='utf-8') as file:
            file.write(new_entry)
        
        print(f"🧠 [DEBUG] Nova entrada de memória salva: {category} - {information[:50]}...")
        return True
    except Exception as e:
        print(f"❌ [DEBUG] Erro ao escrever na memória: {str(e)}")
        return False

def update_memory_with_context(user_text, response_text, intent_data):
    """Analisa a conversa e atualiza a memória com informações relevantes"""
    try:
        # Detectar informações importantes para salvar na memória
        memory_triggers = {
            'nome': ['me chamo', 'meu nome é', 'sou o', 'sou a'],
            'projeto': ['trabalhando em', 'projeto', 'desenvolvendo', 'criando'],
            'preferencia': ['prefiro', 'gosto de', 'não gosto', 'melhor seria'],
            'objetivo': ['meu objetivo', 'quero', 'preciso', 'meta'],
            'profissional': ['trabalho como', 'sou', 'empresa', 'cargo']
        }
        
        user_lower = user_text.lower()
        
        for category, triggers in memory_triggers.items():
            for trigger in triggers:
                if trigger in user_lower:
                    # Extrair contexto relevante
                    context = user_text.strip()
                    if len(context) > 200:
                        context = context[:200] + "..."
                    
                    write_memory_entry(category, context)
                    break
        
        # Salvar interações importantes baseadas na intenção
        if intent_data.get('intent') in ['create_project', 'create_task']:
            details = intent_data.get('details', {})
            if details:
                context = f"Criou {intent_data['intent'].replace('create_', '')}: {details}"
                write_memory_entry('atividade', context)
        
        return True
    except Exception as e:
        print(f"❌ [DEBUG] Erro ao atualizar memória com contexto: {str(e)}")
        return False

def get_memory_context_for_prompt():
    """Retorna um resumo da memória para incluir no prompt da IA"""
    try:
        memory_content = read_memory()
        if not memory_content:
            return ""
        
        # Extrair apenas as entradas mais recentes (últimas 10)
        lines = memory_content.split('\n')
        recent_entries = []
        
        for line in lines:
            if line.strip() and line.startswith('[') and (']:' in line or '] ' in line):
                recent_entries.append(line.strip())
        
        # Pegar as 10 mais recentes
        recent_entries = recent_entries[-10:] if len(recent_entries) > 10 else recent_entries
        
        if recent_entries:
            context = "\n\nCONTEXTO DA MEMÓRIA (informações sobre o usuário):\n"
            context += "\n".join(recent_entries)
            context += "\n\nUse essas informações para personalizar sua resposta.\n"
            return context
        
        return ""
    except Exception as e:
        print(f"❌ [DEBUG] Erro ao obter contexto da memória: {str(e)}")
        return ""

def interpret_user_intent(user_text, memory_context=""):
    """Interpreta a intenção do usuário usando Groq AI com fallback para lógica de palavras-chave"""
    global groq_client
    
    # Tentar usar Groq AI primeiro
    print(f"🤖 [DEBUG] Groq client disponível: {groq_client is not None}")
    if groq_client:
        try:
            # Ler o prompt do arquivo karen_prompt.txt
            try:
                prompt_file_path = os.path.join('src', 'karen_prompt.txt')
                with open(prompt_file_path, 'r', encoding='utf-8') as f:
                    base_prompt = f.read()
                
                prompt = f"""{base_prompt}

Texto do usuário: "{user_text}"

Contexto da memória:
{memory_context}
"""
                print(f"📝 [DEBUG] Prompt carregado do arquivo karen_prompt.txt")
            except Exception as e:
                print(f"❌ [DEBUG] Erro ao ler karen_prompt.txt: {str(e)}")
                # Fallback para prompt básico
                prompt = f"""
Você é Karen, uma assistente virtual inteligente. Analise o texto do usuário.

Texto do usuário: "{user_text}"
{memory_context}

Retorne um JSON com: {{"intent": "general_chat", "details": {{}}, "response": "sua resposta"}}
"""
                print(f"📝 [DEBUG] Usando prompt básico de fallback")
            
            print(f"🚀 [DEBUG] Enviando requisição para Groq AI...")
            chat_completion = groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                model="llama-3.1-8b-instant",
                temperature=0.3,
                max_tokens=500
            )
            
            response_text = chat_completion.choices[0].message.content.strip()
            print(f"📥 [DEBUG] Resposta da Groq AI: {response_text[:200]}...")
            
            # Tentar fazer parse do JSON
            try:
                groq_response = json.loads(response_text)
                print(f"✅ [DEBUG] JSON parseado com sucesso: {groq_response}")
                
                # Verificar se a resposta tem a estrutura esperada pela Groq
                if 'command' in groq_response and 'responseText' in groq_response:
                    # Estrutura da Groq: {"command": {"intent": ..., "details": ...}, "responseText": ...}
                    command = groq_response.get('command', {})
                    result = {
                        'intent': command.get('intent', 'general_chat'),
                        'details': command.get('details', {}),
                        'response': groq_response.get('responseText', 'Processado com sucesso!')
                    }
                    print(f"🔄 [DEBUG] Convertido para estrutura padrão - Intent: {result['intent']}, Response: {result['response'][:50]}...")
                    return result
                elif 'intent' in groq_response:
                    # Estrutura padrão: {"intent": ..., "details": ..., "response": ...}
                    print(f"✅ [DEBUG] Estrutura padrão detectada - Intent: {groq_response.get('intent')}, Response: {groq_response.get('response', '')[:50]}...")
                    return groq_response
                else:
                    print(f"❌ [DEBUG] Estrutura JSON não reconhecida: {groq_response}")
                    return interpret_user_intent_fallback(user_text)
                    
            except json.JSONDecodeError:
                print(f"❌ [DEBUG] Erro ao fazer parse do JSON da Groq: {response_text}")
                print(f"🔄 [DEBUG] Usando fallback de palavras-chave")
                # Fallback para lógica de palavras-chave
                return interpret_user_intent_fallback(user_text)
                
        except Exception as e:
            print(f"❌ [DEBUG] Erro na chamada da Groq: {str(e)}")
            print(f"🔄 [DEBUG] Usando fallback de palavras-chave")
            # Fallback para lógica de palavras-chave
            return interpret_user_intent_fallback(user_text)
    
    # Se Groq não estiver disponível, usar fallback
    return interpret_user_intent_fallback(user_text)

def interpret_user_intent_fallback(user_text):
    """Lógica de fallback baseada em palavras-chave expandida"""
    user_text_lower = user_text.lower()
    
    # Palavras-chave para identificar intenções (ordem importa - mais específicas primeiro)
    
    # Comandos de listagem
    list_task_keywords = ['minhas tarefas', 'listar tarefas', 'ver tarefas', 'quais tarefas', 'mostrar tarefas', 'tarefas pendentes', 'o que preciso fazer']
    list_project_keywords = ['meus projetos', 'listar projetos', 'ver projetos', 'quais projetos', 'mostrar projetos', 'projetos ativos']
    list_reminder_keywords = ['meus lembretes', 'listar lembretes', 'ver lembretes', 'quais lembretes', 'mostrar lembretes', 'meus compromissos', 'agenda']
    
    # Comandos de criação
    task_keywords = ['criar tarefa', 'nova tarefa', 'adicionar tarefa', 'fazer', 'preciso fazer', 'tenho que', 'devo', 'vou fazer']
    project_keywords = ['criar projeto', 'novo projeto', 'adicionar projeto', 'iniciar projeto', 'começar projeto']
    reminder_keywords = ['lembrar', 'lembrete', 'me lembre', 'não esquecer', 'alarme', 'agendar', 'marcar']
    
    # Comandos de conclusão
    complete_task_keywords = ['concluir tarefa', 'finalizar tarefa', 'marcar como concluída', 'tarefa concluída', 'terminei']
    complete_project_keywords = ['concluir projeto', 'finalizar projeto', 'projeto concluído', 'terminei o projeto']
    
    # Comandos de atualização
    update_keywords = ['atualizar', 'modificar', 'alterar', 'mudar', 'editar']
    
    # Comandos de exclusão
    delete_keywords = ['deletar', 'remover', 'excluir', 'apagar']
    
    # Detectar intenção baseada em palavras-chave
    if any(keyword in user_text_lower for keyword in list_task_keywords):
        return {
            "intent": "list_tasks",
            "details": {},
            "response": "Vou listar suas tarefas para você!"
        }
    
    elif any(keyword in user_text_lower for keyword in list_project_keywords):
        return {
            "intent": "list_projects",
            "details": {},
            "response": "Vou listar seus projetos para você!"
        }
    
    elif any(keyword in user_text_lower for keyword in list_reminder_keywords):
        return {
            "intent": "list_reminders",
            "details": {},
            "response": "Aqui estão seus lembretes!"
        }
    
    elif any(keyword in user_text_lower for keyword in complete_task_keywords):
        return {
            "intent": "complete_task",
            "details": {"task_id": "", "title": user_text},
            "response": "Vou marcar a tarefa como concluída! ✅"
        }
    
    elif any(keyword in user_text_lower for keyword in complete_project_keywords):
        return {
            "intent": "complete_project",
            "details": {"project_id": "", "name": user_text},
            "response": "Vou finalizar o projeto! 🎉"
        }
    
    elif any(keyword in user_text_lower for keyword in update_keywords) and ('tarefa' in user_text_lower or 'task' in user_text_lower):
        return {
            "intent": "update_task",
            "details": {"task_id": "", "title": user_text},
            "response": "Vou atualizar a tarefa! ✏️"
        }
    
    elif any(keyword in user_text_lower for keyword in update_keywords) and ('projeto' in user_text_lower or 'project' in user_text_lower):
        return {
            "intent": "update_project",
            "details": {"project_id": "", "name": user_text},
            "response": "Vou atualizar o projeto! 📝"
        }
    
    elif any(keyword in user_text_lower for keyword in delete_keywords) and ('tarefa' in user_text_lower or 'task' in user_text_lower):
        return {
            "intent": "delete_task",
            "details": {"task_id": "", "title": user_text},
            "response": "Vou remover a tarefa! 🗑️"
        }
    
    elif any(keyword in user_text_lower for keyword in delete_keywords) and ('projeto' in user_text_lower or 'project' in user_text_lower):
        return {
            "intent": "delete_project",
            "details": {"project_id": "", "name": user_text},
            "response": "Vou excluir o projeto! 🗑️"
        }
    
    elif any(keyword in user_text_lower for keyword in task_keywords):
        # Extrair descrição da tarefa
        what = user_text
        for keyword in task_keywords:
            if keyword in user_text_lower:
                what = user_text_lower.replace(keyword, '').strip()
                break
        
        return {
            "intent": "create_task",
            "details": {
                "what": what if what else user_text,
                "priority": "média",
                "category": "pessoal"
            },
            "response": f"Perfeito! Vou criar a tarefa '{what if what else user_text}' para você."
        }
    
    elif any(keyword in user_text_lower for keyword in project_keywords):
        # Extrair nome do projeto
        name = user_text
        for keyword in project_keywords:
            if keyword in user_text_lower:
                name = user_text_lower.replace(keyword, '').strip()
                break
        
        return {
            "intent": "create_project",
            "details": {
                "name": name if name else user_text,
                "priority": "medium",
                "status": "active"
            },
            "response": f"Excelente! Vou criar o projeto '{name if name else user_text}' para você."
        }
    
    elif any(keyword in user_text_lower for keyword in reminder_keywords):
        # Extrair descrição do lembrete
        what = user_text
        for keyword in reminder_keywords:
            if keyword in user_text_lower:
                what = user_text_lower.replace(keyword, '').strip()
                break
        
        return {
            "intent": "create_reminder",
            "details": {
                "what": what if what else user_text,
                "when": "hoje",
                "priority": "média"
            },
            "response": f"Entendi! Vou criar um lembrete para '{what if what else user_text}'."
        }
    
    else:
        return {
            "intent": "general_chat",
            "details": {},
            "response": f"Olá! Você disse: '{user_text}'. Como posso ajudar você hoje? Posso criar tarefas, lembretes ou listar suas atividades."
        }

def handle_task_creation(details, user_id="anonymous"):
    """Cria uma nova tarefa no Firestore"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        # Processar data de vencimento se fornecida
        due_date = None
        if details.get('when'):
            due_date = parse_relative_date(details['when'])
        
        task_data = {
            "what": details.get("what", ""),
            "description": details.get("description", ""),
            "priority": details.get("priority", "média"),
            "category": details.get("category", "pessoal"),
            "completed": False,
            "due_date": due_date,
            "tags": details.get("tags", []),
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "user_id": user_id
        }
        
        # Adicionar ao Firestore
        doc_ref = db.collection('users').document(user_id).collection('tasks').add(task_data)
        
        due_text = f" para {due_date.strftime('%d/%m/%Y às %H:%M')}" if due_date else ""
        return f"Tarefa '{details.get('what')}' criada com sucesso{due_text}!"
        
    except Exception as e:
        print(f"Erro ao criar tarefa: {str(e)}")
        return "Erro ao criar a tarefa"

def handle_task_update(details, user_id="anonymous"):
    """Atualiza uma tarefa existente"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        task_id = details.get('task_id')
        if not task_id:
            return "Erro: ID da tarefa não fornecido"
        
        task_ref = db.collection('users').document(user_id).collection('tasks').document(task_id)
        task_doc = task_ref.get()
        
        if not task_doc.exists:
            return "Tarefa não encontrada"
        
        # Preparar dados de atualização
        update_data = {'updated_at': datetime.now()}
        
        # Campos que podem ser atualizados
        if details.get('what'):
            update_data['what'] = details['what']
        if details.get('description'):
            update_data['description'] = details['description']
        if details.get('priority'):
            update_data['priority'] = details['priority']
        if details.get('category'):
            update_data['category'] = details['category']
        if details.get('tags'):
            update_data['tags'] = details['tags']
        if details.get('when'):
            update_data['due_date'] = parse_relative_date(details['when'])
        
        # Atualizar no Firestore
        task_ref.update(update_data)
        
        return f"Tarefa atualizada com sucesso!"
        
    except Exception as e:
        print(f"Erro ao atualizar tarefa: {str(e)}")
        return "Erro ao atualizar a tarefa"

def handle_task_completion(details, user_id="anonymous"):
    """Marca uma tarefa como concluída"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        task_id = details.get('task_id')
        if not task_id:
            return "Erro: ID da tarefa não fornecido"
        
        task_ref = db.collection('users').document(user_id).collection('tasks').document(task_id)
        task_doc = task_ref.get()
        
        if not task_doc.exists:
            return "Tarefa não encontrada"
        
        task_data = task_doc.to_dict()
        task_name = task_data.get('what', 'Tarefa')
        
        # Marcar como concluída
        task_ref.update({
            'completed': True,
            'completed_at': datetime.now(),
            'updated_at': datetime.now()
        })
        
        return f"Parabéns! Tarefa '{task_name}' marcada como concluída! 🎉"
        
    except Exception as e:
        print(f"Erro ao completar tarefa: {str(e)}")
        return "Erro ao completar a tarefa"

def handle_task_deletion(details, user_id="anonymous"):
    """Deleta uma tarefa"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        task_id = details.get('task_id')
        if not task_id:
            return "Erro: ID da tarefa não fornecido"
        
        task_ref = db.collection('users').document(user_id).collection('tasks').document(task_id)
        task_doc = task_ref.get()
        
        if not task_doc.exists:
            return "Tarefa não encontrada"
        
        task_data = task_doc.to_dict()
        task_name = task_data.get('what', 'Tarefa')
        
        # Deletar tarefa
        task_ref.delete()
        
        return f"Tarefa '{task_name}' removida com sucesso!"
        
    except Exception as e:
        print(f"Erro ao deletar tarefa: {str(e)}")
        return "Erro ao deletar a tarefa"

def handle_task_listing(details, user_id="anonymous"):
    """Lista tarefas com filtros"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        tasks_ref = db.collection('users').document(user_id).collection('tasks')
        
        # Aplicar filtros
        status_filter = details.get('status_filter', 'all')
        if status_filter == 'completed':
            tasks_ref = tasks_ref.where('completed', '==', True)
        elif status_filter == 'pending':
            tasks_ref = tasks_ref.where('completed', '==', False)
        
        if details.get('priority'):
            tasks_ref = tasks_ref.where('priority', '==', details['priority'])
        
        if details.get('category'):
            tasks_ref = tasks_ref.where('category', '==', details['category'])
        
        tasks = tasks_ref.order_by('created_at', direction=firestore.Query.DESCENDING).limit(10).stream()
        
        tasks_list = []
        for task in tasks:
            task_data = task.to_dict()
            task_data['id'] = task.id
            tasks_list.append(task_data)
        
        if not tasks_list:
            return "Você não tem tarefas no momento."
        
        # Formatar resposta
        response = f"Aqui estão suas tarefas ({len(tasks_list)} encontradas):\n\n"
        
        for i, task in enumerate(tasks_list, 1):
            status = "✅" if task.get('completed') else "⏳"
            priority = task.get('priority', 'média')
            priority_icon = "🔴" if priority == 'alta' else "🟡" if priority == 'média' else "🟢"
            
            response += f"{i}. {status} {priority_icon} {task.get('what', 'Sem título')}\n"
            
            if task.get('due_date'):
                due_date = task['due_date']
                if isinstance(due_date, str):
                    try:
                        due_date = parser.parse(due_date)
                    except:
                        pass
                if hasattr(due_date, 'strftime'):
                    response += f"   📅 Vence em: {due_date.strftime('%d/%m/%Y às %H:%M')}\n"
        
        return response
        
    except Exception as e:
        print(f"Erro ao listar tarefas: {str(e)}")
        return "Erro ao listar as tarefas"

def handle_reminder_listing(user_id="anonymous"):
    """Lista próximos lembretes/eventos"""
    if not calendar_service:
        return "Erro: Google Calendar não está disponível"
    
    try:
        # Buscar eventos dos próximos 7 dias
        now = datetime.now().isoformat() + 'Z'
        week_later = (datetime.now() + timedelta(days=7)).isoformat() + 'Z'
        
        events_result = calendar_service.events().list(
            calendarId='primary',
            timeMin=now,
            timeMax=week_later,
            maxResults=10,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        if not events:
            return "Você não tem lembretes ou eventos programados para os próximos 7 dias."
        
        response = f"Aqui estão seus próximos lembretes ({len(events)} encontrados):\n\n"
        
        for i, event in enumerate(events, 1):
            start = event['start'].get('dateTime', event['start'].get('date'))
            title = event.get('summary', 'Sem título')
            
            # Converter data para formato brasileiro
            try:
                if 'T' in start:
                    event_date = parser.parse(start)
                    formatted_date = event_date.strftime('%d/%m/%Y às %H:%M')
                else:
                    event_date = parser.parse(start)
                    formatted_date = event_date.strftime('%d/%m/%Y')
            except:
                formatted_date = start
            
            response += f"{i}. 📅 {title}\n   🕒 {formatted_date}\n\n"
        
        return response
        
    except Exception as e:
        print(f"Erro ao listar lembretes: {str(e)}")
        return "Erro ao listar os lembretes"

def parse_relative_date(when_text):
    """Interpreta datas e horários relativos de forma mais avançada"""
    now = datetime.now()
    when_lower = when_text.lower()
    
    # Horário padrão se não especificado
    default_hour = 9
    default_minute = 0
    
    # Extrair horário se especificado
    import re
    time_match = re.search(r'(\d{1,2})(?:h|:)(\d{0,2})', when_lower)
    if time_match:
        default_hour = int(time_match.group(1))
        default_minute = int(time_match.group(2)) if time_match.group(2) else 0
    elif re.search(r'(\d{1,2})\s*h', when_lower):
        hour_match = re.search(r'(\d{1,2})\s*h', when_lower)
        default_hour = int(hour_match.group(1))
    
    # Interpretar datas relativas
    if "agora" in when_lower or "já" in when_lower:
        return now + timedelta(minutes=5)
    elif "daqui a pouco" in when_lower:
        return now + timedelta(minutes=30)
    elif "hoje" in when_lower:
        return now.replace(hour=default_hour, minute=default_minute, second=0, microsecond=0)
    elif "amanhã" in when_lower:
        tomorrow = now + timedelta(days=1)
        return tomorrow.replace(hour=default_hour, minute=default_minute, second=0, microsecond=0)
    elif "depois de amanhã" in when_lower:
        day_after = now + timedelta(days=2)
        return day_after.replace(hour=default_hour, minute=default_minute, second=0, microsecond=0)
    elif "próxima semana" in when_lower:
        next_week = now + timedelta(days=7)
        return next_week.replace(hour=default_hour, minute=default_minute, second=0, microsecond=0)
    
    # Dias da semana
    weekdays = {
        'segunda': 0, 'terça': 1, 'quarta': 2, 'quinta': 3, 'sexta': 4, 'sábado': 5, 'domingo': 6
    }
    
    for day_name, day_num in weekdays.items():
        if day_name in when_lower:
            days_ahead = day_num - now.weekday()
            if days_ahead <= 0:  # Se já passou esta semana
                days_ahead += 7
            if "próxima" in when_lower or "próximo" in when_lower:
                days_ahead += 7
            target_date = now + timedelta(days=days_ahead)
            return target_date.replace(hour=default_hour, minute=default_minute, second=0, microsecond=0)
    
    # Padrões de tempo específicos
    if "1 hora" in when_lower or "uma hora" in when_lower:
        return now + timedelta(hours=1)
    elif "2 horas" in when_lower or "duas horas" in when_lower:
        return now + timedelta(hours=2)
    elif "30 minutos" in when_lower or "meia hora" in when_lower:
        return now + timedelta(minutes=30)
    
    # Default: 1 hora a partir de agora
    return now + timedelta(hours=1)

def handle_reminder_creation(details, user_id="anonymous"):
    """Cria um lembrete no Google Calendar com interpretação avançada de datas"""
    if not calendar_service:
        return "Erro: Google Calendar não está disponível"
    
    try:
        # Processar data/hora com função melhorada
        when = details.get("when", "")
        start_time = parse_relative_date(when) if when else datetime.now() + timedelta(hours=1)
        
        # Determinar duração baseada no tipo de lembrete
        what = details.get("what", "Lembrete da Karen")
        duration_minutes = 30  # Padrão
        
        if any(word in what.lower() for word in ['reunião', 'meeting', 'consulta']):
            duration_minutes = 60
        elif any(word in what.lower() for word in ['ligação', 'call', 'telefonema']):
            duration_minutes = 15
        elif any(word in what.lower() for word in ['almoço', 'jantar', 'café']):
            duration_minutes = 90
        
        # Criar evento no Google Calendar
        event = {
            'summary': what,
            'description': f"Lembrete criado pela assistente Karen\nCategoria: {details.get('category', 'outros')}",
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'America/Sao_Paulo',
            },
            'end': {
                'dateTime': (start_time + timedelta(minutes=duration_minutes)).isoformat(),
                'timeZone': 'America/Sao_Paulo',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'popup', 'minutes': 10},
                    {'method': 'popup', 'minutes': 60},
                ],
            },
        }
        
        created_event = calendar_service.events().insert(calendarId='primary', body=event).execute()
        
        # Também salvar no Firestore para sincronização
        if db:
            reminder_data = {
                "what": what,
                "when": start_time,
                "category": details.get("category", "outros"),
                "calendar_event_id": created_event.get('id'),
                "created_at": datetime.now(),
                "user_id": user_id
            }
            db.collection('users').document(user_id).collection('reminders').add(reminder_data)
        
        formatted_date = start_time.strftime('%d/%m/%Y às %H:%M')
        return f"Perfeito! Lembrete '{what}' criado para {formatted_date}. Você receberá notificações 10 minutos e 1 hora antes."
        
    except Exception as e:
        print(f"Erro ao criar lembrete: {str(e)}")
        return f"Desculpe, não consegui criar o lembrete. Erro: {str(e)}"

def handle_project_creation(details, user_id="anonymous"):
    """Cria um novo projeto no Firestore"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        name = details.get("name", "Projeto sem nome")
        description = details.get("description", "")
        priority = details.get("priority", "média")
        status = details.get("status", "planejamento")
        tags = details.get("tags", [])
        
        # Processar deadline se fornecida
        deadline = None
        if details.get("deadline"):
            try:
                deadline = parser.parse(details["deadline"])
            except:
                deadline = None
        
        project_data = {
            "name": name,
            "description": description,
            "status": status,
            "priority": priority,
            "tags": tags,
            "deadline": deadline,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "user_id": user_id
        }
        
        doc_ref = db.collection('users').document(user_id).collection('projects').add(project_data)
        
        return f"Projeto '{name}' criado com sucesso! Status: {status}, Prioridade: {priority}"
        
    except Exception as e:
        print(f"Erro ao criar projeto: {str(e)}")
        return f"Desculpe, não consegui criar o projeto. Erro: {str(e)}"

def handle_project_update(details, user_id="anonymous"):
    """Atualiza um projeto existente"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        project_id = details.get("project_id")
        if not project_id:
            return "ID do projeto não fornecido"
        
        project_ref = db.collection('users').document(user_id).collection('projects').document(project_id)
        project_doc = project_ref.get()
        
        if not project_doc.exists:
            return "Projeto não encontrado"
        
        update_data = {"updated_at": datetime.now()}
        
        # Atualizar campos fornecidos
        if "name" in details:
            update_data["name"] = details["name"]
        if "description" in details:
            update_data["description"] = details["description"]
        if "status" in details:
            update_data["status"] = details["status"]
        if "priority" in details:
            update_data["priority"] = details["priority"]
        if "tags" in details:
            update_data["tags"] = details["tags"]
        if "deadline" in details:
            try:
                update_data["deadline"] = parser.parse(details["deadline"])
            except:
                pass
        
        project_ref.update(update_data)
        
        project_data = project_ref.get().to_dict()
        project_name = project_data.get("name", "Projeto")
        
        return f"Projeto '{project_name}' atualizado com sucesso!"
        
    except Exception as e:
        print(f"Erro ao atualizar projeto: {str(e)}")
        return f"Desculpe, não consegui atualizar o projeto. Erro: {str(e)}"

def handle_project_completion(details, user_id="anonymous"):
    """Marca um projeto como concluído"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        project_id = details.get("project_id")
        if not project_id:
            return "ID do projeto não fornecido"
        
        project_ref = db.collection('users').document(user_id).collection('projects').document(project_id)
        project_doc = project_ref.get()
        
        if not project_doc.exists:
            return "Projeto não encontrado"
        
        project_ref.update({
            "status": "concluído",
            "updated_at": datetime.now()
        })
        
        project_data = project_ref.get().to_dict()
        project_name = project_data.get("name", "Projeto")
        
        return f"Parabéns! Projeto '{project_name}' marcado como concluído! 🎉"
        
    except Exception as e:
        print(f"Erro ao concluir projeto: {str(e)}")
        return f"Desculpe, não consegui concluir o projeto. Erro: {str(e)}"

def handle_project_deletion(details, user_id="anonymous"):
    """Deleta um projeto"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        project_id = details.get("project_id")
        if not project_id:
            return "ID do projeto não fornecido"
        
        project_ref = db.collection('users').document(user_id).collection('projects').document(project_id)
        project_doc = project_ref.get()
        
        if not project_doc.exists:
            return "Projeto não encontrado"
        
        project_data = project_doc.to_dict()
        project_name = project_data.get("name", "Projeto")
        
        # Opcional: Deletar tarefas associadas
        tasks_ref = db.collection('users').document(user_id).collection('tasks').where('project_id', '==', project_id)
        tasks = tasks_ref.stream()
        for task in tasks:
            task.reference.delete()
        
        project_ref.delete()
        
        return f"Projeto '{project_name}' deletado com sucesso!"
        
    except Exception as e:
        print(f"Erro ao deletar projeto: {str(e)}")
        return f"Desculpe, não consegui deletar o projeto. Erro: {str(e)}"

def handle_project_listing(details, user_id="anonymous"):
    """Lista projetos com filtros opcionais"""
    if not db:
        return "Erro: Firebase não está disponível"
    
    try:
        projects_ref = db.collection('users').document(user_id).collection('projects')
        
        # Aplicar filtros se fornecidos
        status_filter = details.get("status_filter")
        if status_filter:
            projects_ref = projects_ref.where('status', '==', status_filter)
        
        projects = projects_ref.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
        
        projects_list = []
        for project in projects:
            project_data = project.to_dict()
            project_data['id'] = project.id
            projects_list.append(project_data)
        
        if not projects_list:
            return "Você não tem projetos cadastrados ainda."
        
        # Formatar resposta
        response = f"Você tem {len(projects_list)} projeto(s):\n\n"
        
        for project in projects_list:
            name = project.get('name', 'Sem nome')
            status = project.get('status', 'indefinido')
            priority = project.get('priority', 'média')
            response += f"• {name} - Status: {status}, Prioridade: {priority}\n"
        
        return response
        
    except Exception as e:
        print(f"Erro ao listar projetos: {str(e)}")
        return f"Desculpe, não consegui listar os projetos. Erro: {str(e)}"

def generate_audio_response(text):
    """Gera áudio usando ElevenLabs"""
    print(f"🎵 [DEBUG] Iniciando geração de áudio para texto: '{text[:50]}...'")
    
    if not ELEVENLABS_API_KEY:
        print("❌ [DEBUG] ElevenLabs API Key não encontrada")
        return None
    
    # Verificar se a chave é um placeholder do PRD
    if ELEVENLABS_API_KEY.startswith('sk_f7d819b4d9b35b6cedae1057afb657d2d99170cf4c0f814e'):
        print("⚠️ [DEBUG] Chave da ElevenLabs é um placeholder do PRD")
        print("💡 [DEBUG] Para habilitar a voz, configure uma chave real da ElevenLabs no arquivo .env")
        print("💡 [DEBUG] Obtenha sua chave em: https://elevenlabs.io/app/settings/api-keys")
        return None
    
    try:
        print(f"🎵 [DEBUG] Chamando ElevenLabs com texto: '{text}'")
        audio = generate(
            text=text,
            voice="Bella",  # Voz feminina padrão
            model="eleven_multilingual_v2"
        )
        
        print(f"🎵 [DEBUG] Áudio gerado com sucesso. Tamanho: {len(audio)} bytes")
        
        # Converter para base64 para enviar ao frontend
        audio_base64 = base64.b64encode(audio).decode('utf-8')
        audio_url = f"data:audio/mpeg;base64,{audio_base64}"
        
        print(f"🎵 [DEBUG] Áudio convertido para base64. URL length: {len(audio_url)}")
        return audio_url
        
    except Exception as e:
        print(f"❌ [DEBUG] Erro ao gerar áudio: {str(e)}")
        print(f"❌ [DEBUG] Tipo do erro: {type(e).__name__}")
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
        
        # 1. Obter contexto da memória para personalizar a resposta
        memory_context = get_memory_context_for_prompt()
        print(f"🧠 [DEBUG] Contexto da memória obtido: {len(memory_context)} caracteres")
        
        # 2. Interpretar intenção com Groq (incluindo contexto da memória)
        intent_result = interpret_user_intent(user_text, memory_context)
        
        if intent_result.get('intent') == 'error':
            return jsonify({
                'error': intent_result.get('message', 'Erro ao processar')
            }), 500
        
        # 2. Processar memory_update se presente na resposta da Groq
        memory_update = intent_result.get('memory_update')
        if memory_update and isinstance(memory_update, dict):
            category = memory_update.get('category')
            content = memory_update.get('content')
            if category and content:
                try:
                    write_memory_entry(category, content)
                    print(f"🧠 [DEBUG] Memory update processado: {category} - {content}")
                except Exception as e:
                    print(f"❌ [DEBUG] Erro ao processar memory_update: {str(e)}")
        
        # 3. Processar com base na intenção
        intent = intent_result.get('intent')
        details = intent_result.get('details', {})
        response_text = intent_result.get('response', 'Processado com sucesso!')
        
        if intent == 'create_task':
            task_result = handle_task_creation(details, user_id)
            response_text = task_result
            
        elif intent == 'update_task':
            task_result = handle_task_update(details, user_id)
            response_text = task_result
            
        elif intent == 'delete_task':
            task_result = handle_task_deletion(details, user_id)
            response_text = task_result
            
        elif intent == 'complete_task':
            task_result = handle_task_completion(details, user_id)
            response_text = task_result
            
        elif intent == 'list_tasks':
            task_result = handle_task_listing(details, user_id)
            response_text = task_result
            
        elif intent == 'create_project':
            project_result = handle_project_creation(details, user_id)
            response_text = project_result
            
        elif intent == 'update_project':
            project_result = handle_project_update(details, user_id)
            response_text = project_result
            
        elif intent == 'delete_project':
            project_result = handle_project_deletion(details, user_id)
            response_text = project_result
            
        elif intent == 'complete_project':
            project_result = handle_project_completion(details, user_id)
            response_text = project_result
            
        elif intent == 'list_projects':
            project_result = handle_project_listing(details, user_id)
            response_text = project_result
            
        elif intent == 'create_reminder':
            reminder_result = handle_reminder_creation(details, user_id)
            response_text = reminder_result
            
        elif intent == 'list_reminders':
            reminder_result = handle_reminder_listing(user_id)
            response_text = reminder_result
        
        # 3. Gerar áudio da resposta
        print(f"🎵 [DEBUG] Iniciando geração de áudio para resposta: '{response_text[:50]}...'")
        audio_data = generate_audio_response(response_text)
        
        if audio_data:
            print(f"✅ [DEBUG] Áudio gerado com sucesso")
        else:
            print(f"❌ [DEBUG] Falha na geração do áudio")
        
        print(f"✅ Resposta: {response_text}")
        
        # 4. Salvar mensagens no histórico de chat
        if db:
            try:
                # Salvar mensagem do usuário
                user_message_data = {
                    'text': user_text,
                    'sender': 'user',
                    'timestamp': datetime.now(),
                    'user_id': user_id
                }
                db.collection('users').document(user_id).collection('chat_history').add(user_message_data)
                
                # Salvar resposta da Karen
                karen_message_data = {
                    'text': response_text,
                    'sender': 'karen',
                    'timestamp': datetime.now(),
                    'user_id': user_id,
                    'intent': intent
                }
                db.collection('users').document(user_id).collection('chat_history').add(karen_message_data)
                
                print(f"💾 [DEBUG] Mensagens salvas no histórico")
            except Exception as e:
                print(f"❌ [DEBUG] Erro ao salvar no histórico: {str(e)}")
        
        # 5. Atualizar memória de longo prazo com informações relevantes
        try:
            memory_updated = update_memory_with_context(user_text, response_text, intent_result)
            if memory_updated:
                print(f"🧠 [DEBUG] Memória atualizada com sucesso")
        except Exception as e:
            print(f"❌ [DEBUG] Erro ao atualizar memória: {str(e)}")
        
        # 6. Retornar resposta completa
        response_json = {
            'responseText': response_text,
            'audioUrl': audio_data,
            'intent': intent,
            'details': details
        }
        
        print(f"📤 [DEBUG] Enviando resposta - audioUrl presente: {audio_data is not None}")
        return jsonify(response_json)
        
    except Exception as e:
        print(f"❌ Erro no endpoint interact: {str(e)}")
        return jsonify({
            'error': f'Erro interno do servidor: {str(e)}'
        }), 500

@app.route('/api/tasks', methods=['GET', 'POST'])
def tasks():
    """Endpoint para gerenciar tarefas - GET e POST"""
    try:
        if request.method == 'GET':
            # Listar todas as tarefas do usuário com filtros opcionais
            user_id = request.args.get('userId', 'anonymous')
            status = request.args.get('status')  # 'completed', 'pending', 'all'
            priority = request.args.get('priority')  # 'alta', 'média', 'baixa'
            category = request.args.get('category')  # 'pessoal', 'trabalho', 'estudos'
            
            if not db:
                return jsonify({'error': 'Firebase não disponível'}), 500
            
            tasks_ref = db.collection('users').document(user_id).collection('tasks')
            
            # Aplicar filtros
            if status == 'completed':
                tasks_ref = tasks_ref.where('completed', '==', True)
            elif status == 'pending':
                tasks_ref = tasks_ref.where('completed', '==', False)
            
            if priority:
                tasks_ref = tasks_ref.where('priority', '==', priority)
            
            if category:
                tasks_ref = tasks_ref.where('category', '==', category)
            
            tasks = tasks_ref.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
            
            tasks_list = []
            for task in tasks:
                task_data = task.to_dict()
                task_data['id'] = task.id
                # Converter datetime para string
                if 'created_at' in task_data:
                    task_data['created_at'] = task_data['created_at'].isoformat()
                if 'due_date' in task_data and task_data['due_date']:
                    task_data['due_date'] = task_data['due_date'].isoformat()
                tasks_list.append(task_data)
            
            return jsonify({
                'tasks': tasks_list,
                'total': len(tasks_list),
                'filters_applied': {
                    'status': status,
                    'priority': priority,
                    'category': category
                }
            })
            
        elif request.method == 'POST':
            # Criar nova tarefa
            data = request.get_json()
            user_id = data.get('userId', 'anonymous')
            
            if not data or 'what' not in data:
                return jsonify({'error': 'Descrição da tarefa não fornecida'}), 400
            
            # Processar data de vencimento se fornecida
            due_date = None
            if data.get('due_date'):
                try:
                    due_date = parser.parse(data['due_date'])
                except:
                    due_date = parse_relative_date(data['due_date'])
            
            task_data = {
                'what': data['what'],
                'description': data.get('description', ''),
                'priority': data.get('priority', 'média'),
                'category': data.get('category', 'pessoal'),
                'completed': data.get('completed', False),
                'due_date': due_date,
                'tags': data.get('tags', []),
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'user_id': user_id
            }
            
            if not db:
                return jsonify({'error': 'Firebase não disponível'}), 500
            
            doc_ref = db.collection('users').document(user_id).collection('tasks').add(task_data)
            
            return jsonify({
                'message': 'Tarefa criada com sucesso',
                'taskId': doc_ref[1].id,
                'task': task_data
            })
            
    except Exception as e:
        print(f"❌ Erro no endpoint tasks: {str(e)}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/tasks/<task_id>', methods=['GET', 'PUT', 'DELETE'])
def task_detail(task_id):
    """Endpoint para operações específicas de uma tarefa - GET, PUT, DELETE"""
    try:
        user_id = request.args.get('userId') or request.get_json().get('userId', 'anonymous')
        
        if not db:
            return jsonify({'error': 'Firebase não disponível'}), 500
        
        task_ref = db.collection('users').document(user_id).collection('tasks').document(task_id)
        
        if request.method == 'GET':
            # Obter tarefa específica
            task_doc = task_ref.get()
            
            if not task_doc.exists:
                return jsonify({'error': 'Tarefa não encontrada'}), 404
            
            task_data = task_doc.to_dict()
            task_data['id'] = task_doc.id
            
            # Converter datetime para string
            if 'created_at' in task_data:
                task_data['created_at'] = task_data['created_at'].isoformat()
            if 'updated_at' in task_data:
                task_data['updated_at'] = task_data['updated_at'].isoformat()
            if 'due_date' in task_data and task_data['due_date']:
                task_data['due_date'] = task_data['due_date'].isoformat()
            
            return jsonify({'task': task_data})
        
        elif request.method == 'PUT':
            # Atualizar tarefa
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'Dados não fornecidos'}), 400
            
            # Verificar se a tarefa existe
            task_doc = task_ref.get()
            if not task_doc.exists:
                return jsonify({'error': 'Tarefa não encontrada'}), 404
            
            # Preparar dados de atualização
            update_data = {'updated_at': datetime.now()}
            
            # Campos que podem ser atualizados
            updatable_fields = ['what', 'description', 'priority', 'category', 'completed', 'tags']
            for field in updatable_fields:
                if field in data:
                    update_data[field] = data[field]
            
            # Processar data de vencimento se fornecida
            if 'due_date' in data:
                if data['due_date']:
                    try:
                        update_data['due_date'] = parser.parse(data['due_date'])
                    except:
                        update_data['due_date'] = parse_relative_date(data['due_date'])
                else:
                    update_data['due_date'] = None
            
            # Atualizar no Firestore
            task_ref.update(update_data)
            
            return jsonify({
                'message': 'Tarefa atualizada com sucesso',
                'taskId': task_id,
                'updated_fields': list(update_data.keys())
            })
        
        elif request.method == 'DELETE':
            # Deletar tarefa
            task_doc = task_ref.get()
            if not task_doc.exists:
                return jsonify({'error': 'Tarefa não encontrada'}), 404
            
            task_ref.delete()
            
            return jsonify({
                'message': 'Tarefa deletada com sucesso',
                'taskId': task_id
            })
    
    except Exception as e:
        print(f"❌ Erro no endpoint task_detail: {str(e)}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/projects', methods=['GET', 'POST'])
def projects():
    """Endpoint para gerenciar projetos - GET e POST"""
    try:
        if request.method == 'GET':
            # Listar todos os projetos do usuário com filtros opcionais
            user_id = request.args.get('userId', 'anonymous')
            status = request.args.get('status')  # 'active', 'completed', 'paused', 'cancelled', 'all'
            sort_by = request.args.get('sortBy', 'updated_at')  # 'name', 'created_at', 'updated_at', 'priority'
            
            if not db:
                return jsonify({'error': 'Firebase não disponível'}), 500
            
            projects_ref = db.collection('users').document(user_id).collection('projects')
            
            # Aplicar filtros
            if status and status != 'all':
                projects_ref = projects_ref.where('status', '==', status)
            
            # Aplicar ordenação
            if sort_by == 'name':
                projects_ref = projects_ref.order_by('name')
            elif sort_by == 'created_at':
                projects_ref = projects_ref.order_by('created_at', direction=firestore.Query.DESCENDING)
            elif sort_by == 'priority':
                projects_ref = projects_ref.order_by('priority')
            else:  # updated_at (default)
                projects_ref = projects_ref.order_by('updated_at', direction=firestore.Query.DESCENDING)
            
            projects = projects_ref.stream()
            
            projects_list = []
            for project in projects:
                project_data = project.to_dict()
                project_data['id'] = project.id
                
                # Converter datetime para string
                if 'created_at' in project_data:
                    project_data['created_at'] = project_data['created_at'].isoformat()
                if 'updated_at' in project_data:
                    project_data['updated_at'] = project_data['updated_at'].isoformat()
                if 'deadline' in project_data and project_data['deadline']:
                    project_data['deadline'] = project_data['deadline'].isoformat()
                
                # Carregar tarefas do projeto para calcular progresso
                tasks_ref = db.collection('users').document(user_id).collection('tasks').where('project_id', '==', project.id)
                tasks = list(tasks_ref.stream())
                project_data['tasks'] = [{'id': task.id, 'completed': task.to_dict().get('completed', False)} for task in tasks]
                
                projects_list.append(project_data)
            
            return jsonify({'projects': projects_list})
            
        elif request.method == 'POST':
            # Criar novo projeto
            data = request.get_json()
            user_id = data.get('userId', 'anonymous')
            
            if not data or 'name' not in data:
                return jsonify({'error': 'Nome do projeto não fornecido'}), 400
            
            # Processar deadline se fornecido
            deadline = None
            if data.get('deadline'):
                try:
                    deadline = parser.parse(data['deadline'])
                except:
                    deadline = None
            
            project_data = {
                'name': data['name'],
                'description': data.get('description', ''),
                'status': data.get('status', 'active'),
                'priority': data.get('priority', 'medium'),
                'tags': data.get('tags', []),
                'deadline': deadline,
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'user_id': user_id
            }
            
            if not db:
                return jsonify({'error': 'Firebase não disponível'}), 500
            
            doc_ref = db.collection('users').document(user_id).collection('projects').add(project_data)
            
            # Converter datetime para string na resposta
            project_data['id'] = doc_ref[1].id
            project_data['created_at'] = project_data['created_at'].isoformat()
            project_data['updated_at'] = project_data['updated_at'].isoformat()
            if project_data['deadline']:
                project_data['deadline'] = project_data['deadline'].isoformat()
            
            return jsonify({
                'message': 'Projeto criado com sucesso',
                'projectId': doc_ref[1].id,
                'project': project_data
            })
            
    except Exception as e:
        print(f"❌ Erro no endpoint projects: {str(e)}")
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/projects/<project_id>', methods=['GET', 'PUT', 'DELETE'])
def project_detail(project_id):
    """Endpoint para operações específicas de um projeto - GET, PUT, DELETE"""
    try:
        user_id = request.args.get('userId') or (request.get_json() or {}).get('userId', 'anonymous')
        
        if not db:
            return jsonify({'error': 'Firebase não disponível'}), 500
        
        project_ref = db.collection('users').document(user_id).collection('projects').document(project_id)
        
        if request.method == 'GET':
            # Obter projeto específico
            project_doc = project_ref.get()
            
            if not project_doc.exists:
                return jsonify({'error': 'Projeto não encontrado'}), 404
            
            project_data = project_doc.to_dict()
            project_data['id'] = project_doc.id
            
            # Converter datetime para string
            if 'created_at' in project_data:
                project_data['created_at'] = project_data['created_at'].isoformat()
            if 'updated_at' in project_data:
                project_data['updated_at'] = project_data['updated_at'].isoformat()
            if 'deadline' in project_data and project_data['deadline']:
                project_data['deadline'] = project_data['deadline'].isoformat()
            
            # Carregar tarefas do projeto
            tasks_ref = db.collection('users').document(user_id).collection('tasks').where('project_id', '==', project_id)
            tasks = list(tasks_ref.stream())
            project_data['tasks'] = [{'id': task.id, 'completed': task.to_dict().get('completed', False)} for task in tasks]
            
            return jsonify({'project': project_data})
        
        elif request.method == 'PUT':
            # Atualizar projeto
            data = request.get_json()
            
            project_doc = project_ref.get()
            if not project_doc.exists:
                return jsonify({'error': 'Projeto não encontrado'}), 404
            
            # Processar deadline se fornecido
            deadline = None
            if 'deadline' in data and data['deadline']:
                try:
                    deadline = parser.parse(data['deadline'])
                except:
                    deadline = None
            
            update_data = {
                'updated_at': datetime.now()
            }
            
            # Atualizar apenas os campos fornecidos
            if 'name' in data:
                update_data['name'] = data['name']
            if 'description' in data:
                update_data['description'] = data['description']
            if 'status' in data:
                update_data['status'] = data['status']
            if 'priority' in data:
                update_data['priority'] = data['priority']
            if 'tags' in data:
                update_data['tags'] = data['tags']
            if 'deadline' in data:
                update_data['deadline'] = deadline
            
            project_ref.update(update_data)
            
            # Retornar projeto atualizado
            updated_project = project_ref.get().to_dict()
            updated_project['id'] = project_id
            
            # Converter datetime para string
            if 'created_at' in updated_project:
                updated_project['created_at'] = updated_project['created_at'].isoformat()
            if 'updated_at' in updated_project:
                updated_project['updated_at'] = updated_project['updated_at'].isoformat()
            if 'deadline' in updated_project and updated_project['deadline']:
                updated_project['deadline'] = updated_project['deadline'].isoformat()
            
            return jsonify({
                'message': 'Projeto atualizado com sucesso',
                'project': updated_project
            })
        
        elif request.method == 'DELETE':
            # Deletar projeto
            project_doc = project_ref.get()
            if not project_doc.exists:
                return jsonify({'error': 'Projeto não encontrado'}), 404
            
            # Opcional: Deletar todas as tarefas associadas ao projeto
            tasks_ref = db.collection('users').document(user_id).collection('tasks').where('project_id', '==', project_id)
            tasks = tasks_ref.stream()
            for task in tasks:
                task.reference.delete()
            
            project_ref.delete()
            
            return jsonify({
                'message': 'Projeto deletado com sucesso',
                'projectId': project_id
            })
    
    except Exception as e:
        print(f"❌ Erro no endpoint project_detail: {str(e)}")
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

@app.route('/api/chat/history', methods=['GET', 'POST', 'DELETE'])
def chat_history():
    """Endpoint para gerenciar histórico de chat"""
    try:
        user_id = request.args.get('userId') or (request.get_json() or {}).get('userId', 'anonymous')
        
        if not db:
            return jsonify({'error': 'Firebase não disponível'}), 500
        
        if request.method == 'GET':
            # Buscar histórico de chat
            limit = int(request.args.get('limit', 50))
            
            messages_ref = db.collection('users').document(user_id).collection('chat_history')
            messages = messages_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit).stream()
            
            messages_list = []
            for message in messages:
                message_data = message.to_dict()
                message_data['id'] = message.id
                
                # Converter timestamp para string
                if 'timestamp' in message_data:
                    message_data['timestamp'] = message_data['timestamp'].isoformat()
                
                messages_list.append(message_data)
            
            # Reverter ordem para mostrar mensagens mais antigas primeiro
            messages_list.reverse()
            
            return jsonify({'messages': messages_list})
        
        elif request.method == 'POST':
            # Salvar nova mensagem no histórico
            data = request.get_json()
            
            if not data or 'text' not in data or 'sender' not in data:
                return jsonify({'error': 'Dados da mensagem incompletos'}), 400
            
            message_data = {
                'text': data['text'],
                'sender': data['sender'],  # 'user' ou 'karen'
                'timestamp': datetime.now(),
                'user_id': user_id
            }
            
            doc_ref = db.collection('users').document(user_id).collection('chat_history').add(message_data)
            
            return jsonify({
                'message': 'Mensagem salva com sucesso',
                'messageId': doc_ref[1].id
            })
        
        elif request.method == 'DELETE':
            # Limpar histórico de chat
            messages_ref = db.collection('users').document(user_id).collection('chat_history')
            messages = messages_ref.stream()
            
            deleted_count = 0
            for message in messages:
                message.reference.delete()
                deleted_count += 1
            
            return jsonify({
                'message': f'Histórico limpo com sucesso. {deleted_count} mensagens removidas.',
                'deletedCount': deleted_count
            })
    
    except Exception as e:
        print(f"❌ Erro no endpoint chat_history: {str(e)}")
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
    if not GROQ_API_KEY:
        print("AVISO: GROQ_API_KEY não encontrada no arquivo .env")
    if not ELEVENLABS_API_KEY:
        print("AVISO: ELEVENLABS_API_KEY não encontrada no arquivo .env")
    if not FIREBASE_CREDENTIALS_PATH:
        print("AVISO: FIREBASE_CREDENTIALS_PATH não encontrada no arquivo .env")
    
    # Inicia o servidor Flask
    app.run(debug=True, host='0.0.0.0', port=5000)