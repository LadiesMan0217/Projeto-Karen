// Configuração do Firebase para o frontend
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
  // IMPORTANTE: Estas são configurações públicas do cliente
  // Não incluem chaves secretas - essas ficam no backend
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCVUleGAs2B7iTgeDo3SVd-gb7qFP0PKiU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "karen-assistente-3f9d8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "karen-assistente-3f9d8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "karen-assistente-3f9d8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "504085882035",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:504085882035:web:62db34dc36587aa59ffcc6",
  measurementId: "G-WRD6MMMGKY"
};

// Debug: Log da configuração (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId ? '***' : 'MISSING'
  });
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Função para autenticação anônima (mantida para compatibilidade)
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

// Função para login com Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Usuário autenticado com Google:', result.user.displayName);
    return result.user;
  } catch (error) {
    console.error('Erro no login com Google:', error);
    throw error;
  }
};

// Função para registro com email e senha
export const signUpWithEmail = async (email, password, displayName) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Atualizar o perfil com o nome do usuário
    if (displayName) {
      await updateProfile(result.user, {
        displayName: displayName
      });
    }
    
    console.log('✓ Usuário registrado com sucesso:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Erro no registro:', error);
    throw error;
  }
};

// Função para login com email e senha
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('✓ Usuário autenticado com email:', result.user.email);
    return result.user;
  } catch (error) {
    console.error('❌ Erro no login:', error);
    throw error;
  }
};

// Função para logout
export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log('Usuário deslogado com sucesso');
  } catch (error) {
    console.error('Erro no logout:', error);
    throw error;
  }
};

// Função para observar mudanças no estado de autenticação
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Função para obter o token de autenticação do usuário atual
export const getCurrentUserToken = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ Erro ao obter token:', error);
    return null;
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