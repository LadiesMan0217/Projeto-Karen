// Configuração do Firebase para o frontend
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query, orderBy } from 'firebase/firestore';

// Configuração do Firebase (substitua pelos seus valores reais)
const firebaseConfig = {
  // IMPORTANTE: Estas são configurações públicas do cliente
  // Não incluem chaves secretas - essas ficam no backend
  apiKey: "sua-api-key-publica-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);

// Função para autenticação anônima
export const signInAnonymous = async () => {
  try {
    const result = await signInAnonymously(auth);
    console.log('✓ Usuário autenticado anonimamente:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    throw error;
  }
};

// Função para escutar mudanças nas tarefas em tempo real
export const listenToTasks = (userId, callback) => {
  if (!userId) {
    console.warn('⚠ UserId não fornecido para listenToTasks');
    return () => {}; // Retorna função vazia para cleanup
  }

  try {
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const q = query(tasksRef, orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at
        });
      });
      
      console.log(`📋 ${tasks.length} tarefas carregadas em tempo real`);
      callback(tasks);
    }, (error) => {
      console.error('❌ Erro ao escutar tarefas:', error);
      callback([]); // Callback com array vazio em caso de erro
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Erro ao configurar listener de tarefas:', error);
    return () => {}; // Retorna função vazia para cleanup
  }
};

export default app;