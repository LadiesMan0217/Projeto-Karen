import React, { useState, useCallback, useEffect } from 'react';
import { signInAnonymous, listenToTasks } from './firebase.js';

// Componente principal da aplicação Karen
function App() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Estados do Firebase e tarefas
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [unsubscribeTasks, setUnsubscribeTasks] = useState(null);

  // Verifica compatibilidade e inicializa o Web Speech API
  useEffect(() => {
    const checkSpeechRecognitionSupport = () => {
      // Verifica se está em HTTPS ou localhost (necessário para Web Speech API)
      const isSecureContext = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1';
      
      if (!isSecureContext) {
        setError('Reconhecimento de voz requer HTTPS ou localhost. Acesse via https:// ou localhost.');
        return false;
      }
      
      // Verifica suporte do navegador
      const SpeechRecognition = window.SpeechRecognition || 
                               window.webkitSpeechRecognition || 
                               window.mozSpeechRecognition || 
                               window.msSpeechRecognition;
      
      if (!SpeechRecognition) {
        const userAgent = navigator.userAgent;
        let browserInfo = 'navegador desconhecido';
        
        if (userAgent.includes('Chrome')) browserInfo = 'Chrome';
        else if (userAgent.includes('Firefox')) browserInfo = 'Firefox';
        else if (userAgent.includes('Safari')) browserInfo = 'Safari';
        else if (userAgent.includes('Edge')) browserInfo = 'Edge';
        
        setError(`Reconhecimento de voz não disponível no ${browserInfo}. Recomendamos usar Chrome ou Edge mais recentes.`);
        return false;
      }
      
      return SpeechRecognition;
    };
    
    const SpeechRecognition = checkSpeechRecognitionSupport();
    
    if (SpeechRecognition) {
      try {
        const recognitionInstance = new SpeechRecognition();
        
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'pt-BR';
        recognitionInstance.maxAlternatives = 1;
        
        recognitionInstance.onstart = () => {
          setIsListening(true);
          setError('');
          console.log('Reconhecimento de voz iniciado');
        };
        
        recognitionInstance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log('Texto reconhecido:', transcript);
          handleUserMessage(transcript);
        };
        
        recognitionInstance.onerror = (event) => {
          setIsListening(false);
          console.error('Erro no reconhecimento:', event.error);
          
          let errorMessage = 'Erro no reconhecimento de voz';
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'Nenhuma fala detectada. Tente falar mais alto ou verificar o microfone.';
              break;
            case 'audio-capture':
              errorMessage = 'Microfone não encontrado ou sem permissão. Verifique as configurações do navegador.';
              break;
            case 'not-allowed':
              errorMessage = 'Permissão de microfone negada. Clique no ícone de microfone na barra de endereços e permita o acesso.';
              break;
            case 'network':
              errorMessage = 'Erro de rede. Verifique sua conexão com a internet.';
              break;
            default:
              errorMessage = `Erro no reconhecimento de voz: ${event.error}`;
          }
          
          setError(errorMessage);
        };
        
        recognitionInstance.onend = () => {
          setIsListening(false);
          console.log('Reconhecimento de voz finalizado');
        };
        
        setRecognition(recognitionInstance);
      } catch (error) {
        console.error('Erro ao inicializar reconhecimento de voz:', error);
        setError('Erro ao inicializar reconhecimento de voz. Tente recarregar a página.');
      }
    }
  }, []);

  // Inicialização do Firebase e autenticação
  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        console.log('🔥 Inicializando Firebase...');
        const authenticatedUser = await signInAnonymous();
        setUser(authenticatedUser);
        console.log('✓ Usuário autenticado:', authenticatedUser.uid);
      } catch (error) {
        console.error('❌ Erro na inicialização do Firebase:', error);
        setError('Erro ao conectar com o Firebase. Algumas funcionalidades podem não funcionar.');
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initializeFirebase();
  }, []);

  // Configurar listener de tarefas quando usuário estiver autenticado
  useEffect(() => {
    if (user && user.uid) {
      console.log('📋 Configurando listener de tarefas para:', user.uid);
      
      const unsubscribe = listenToTasks(user.uid, (updatedTasks) => {
        console.log('📋 Tarefas atualizadas:', updatedTasks.length);
        setTasks(updatedTasks);
      });
      
      setUnsubscribeTasks(() => unsubscribe);
      
      // Cleanup function
      return () => {
        if (unsubscribe) {
          console.log('🧹 Limpando listener de tarefas');
          unsubscribe();
        }
      };
    }
  }, [user]);

  // Função para adicionar mensagem do usuário e processar resposta
  const handleUserMessage = useCallback(async (userText) => {
    // Adiciona mensagem do usuário ao chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Envia texto para o backend com userId se disponível
      const requestBody = { text: userText };
      if (user && user.uid) {
        requestBody.userId = user.uid;
      }
      
      const response = await fetch('http://localhost:5000/api/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Adiciona resposta da Karen ao chat
      const karenMessage = {
        id: Date.now() + 1,
        type: 'karen',
        text: data.responseText,
        audioUrl: data.audioUrl,
        timestamp: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      
      setMessages(prev => [...prev, karenMessage]);
      
      // Reproduz áudio automaticamente se disponível
      if (data.audioUrl) {
        try {
          console.log('🔊 Reproduzindo áudio da Karen:', data.audioUrl);
          
          // Se o audioUrl é base64, criar um blob
          if (data.audioUrl.startsWith('data:audio')) {
            const audio = new Audio(data.audioUrl);
            audio.play().catch(error => {
              console.warn('⚠ Erro ao reproduzir áudio:', error);
              console.log('💡 Dica: Interaja com a página primeiro para permitir reprodução automática');
            });
          } else {
            // Se é uma URL normal
            const audio = new Audio(data.audioUrl);
            audio.play().catch(error => {
              console.warn('⚠ Erro ao reproduzir áudio:', error);
            });
          }
        } catch (error) {
          console.error('❌ Erro ao processar áudio:', error);
        }
      } else {
        console.log('ℹ Nenhum áudio recebido da Karen');
      }
      
    } catch (error) {
      console.error('Erro ao comunicar com o backend:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'karen',
        text: 'Desculpe, não consegui processar sua solicitação. Verifique se o servidor está funcionando.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Função para iniciar/parar o reconhecimento de voz
  const toggleListening = useCallback(() => {
    if (!recognition) {
      setShowTextInput(true);
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [recognition, isListening]);

  // Função para enviar texto digitado
  const handleTextSubmit = useCallback((e) => {
    e.preventDefault();
    if (textInput.trim() && !isProcessing) {
      handleUserMessage(textInput.trim());
      setTextInput('');
      setShowTextInput(false);
    }
  }, [textInput, isProcessing, handleUserMessage]);

  // Função para alternar entre voz e texto
  const toggleInputMode = useCallback(() => {
    setShowTextInput(!showTextInput);
    setError('');
  }, [showTextInput]);

  // Componente de mensagem individual
  const Message = ({ message }) => {
    const isUser = message.type === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-700 text-gray-100'
        }`}>
          <p className="text-sm">{message.text}</p>
          <p className="text-xs opacity-70 mt-1">{message.timestamp}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-blue-400">
            Karen
          </h1>
          <p className="text-center text-gray-400 mt-2">
            Sua assistente pessoal inteligente
          </p>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl h-96 overflow-y-auto p-4 mb-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-center">
                Olá! Sou a Karen, sua assistente pessoal.<br />
                Clique no microfone e comece a falar comigo!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              {isProcessing && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-700 text-gray-100 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                      <p className="text-sm">Karen está pensando...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Input Controls */}
        <div className="space-y-4">
          {/* Text Input (when voice is not available or user chooses text) */}
          {showTextInput && (
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Digite sua mensagem para a Karen..."
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                autoFocus
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isProcessing ? '⏳' : '📤'}
              </button>
            </form>
          )}

          {/* Voice/Text Toggle and Microphone */}
          <div className="flex justify-center items-center gap-4">
            {/* Toggle Input Mode Button */}
            <button
              onClick={toggleInputMode}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
            >
              {showTextInput ? '🎤 Usar Voz' : '⌨️ Usar Texto'}
            </button>

            {/* Microphone Button (only show when not in text mode) */}
            {!showTextInput && (
              <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-200 ${
                  isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : isProcessing
                    ? 'bg-gray-600 cursor-not-allowed'
                    : recognition
                    ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                    : 'bg-gray-600 cursor-not-allowed'
                } shadow-lg`}