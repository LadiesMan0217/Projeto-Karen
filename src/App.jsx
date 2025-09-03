import React, { useState, useCallback, useEffect } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, onAuthStateChange, listenToTasks } from './firebase.js';

// Configuração da URL base do backend
const API_BASE_URL = 'https://karen-backend-fhs4.onrender.com';

// Componente de Login
function LoginScreen({ onGoogleLogin, onEmailLogin, onEmailSignUp, isLoading }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (isSignUp) {
      if (!formData.displayName) {
        newErrors.displayName = 'Nome é obrigatório';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Senhas não coincidem';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      if (isSignUp) {
        await onEmailSignUp(formData.email, formData.password, formData.displayName);
      } else {
        await onEmailLogin(formData.email, formData.password);
      }
    } catch (error) {
      console.error('Erro na autenticação:', error);
      // Tratar erros específicos do Firebase
      if (error.code === 'auth/user-not-found') {
        setErrors({ email: 'Usuário não encontrado' });
      } else if (error.code === 'auth/wrong-password') {
        setErrors({ password: 'Senha incorreta' });
      } else if (error.code === 'auth/email-already-in-use') {
        setErrors({ email: 'Este email já está em uso' });
      } else {
        setErrors({ general: 'Erro na autenticação. Tente novamente.' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
      <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Karen</h1>
          <p className="text-gray-400">Sua assistente pessoal inteligente</p>
        </div>

        {/* Formulário de Login/Registro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {errors.general}
            </div>
          )}

          {isSignUp && (
            <div>
              <input
                type="text"
                name="displayName"
                placeholder="Nome completo"
                value={formData.displayName}
                onChange={handleInputChange}
                className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.displayName ? 'border-red-500' : 'border-gray-700/50'
                }`}
              />
              {errors.displayName && (
                <p className="text-red-400 text-sm mt-1">{errors.displayName}</p>
              )}
            </div>
          )}

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-700/50'
              }`}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Senha"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-700/50'
              }`}
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {isSignUp && (
            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirmar senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-700/50'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              isSignUp ? 'Criar Conta' : 'Entrar'
            )}
          </button>
        </form>

        {/* Divisor */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-700"></div>
          <span className="px-3 text-gray-400 text-sm">ou</span>
          <div className="flex-1 border-t border-gray-700"></div>
        </div>

        {/* Botão Google */}
        <button
          onClick={onGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Entrar com Google</span>
            </>
          )}
        </button>

        {/* Toggle Login/Registro */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setFormData({ email: '', password: '', displayName: '', confirmPassword: '' });
              setErrors({});
            }}
            className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
          >
            {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Registre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente do Menu Lateral
function SideMenu({ activeSection, onSectionChange, user, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const menuItems = [
    { id: 'chat', label: 'Chat IA', icon: '💬', enabled: true },
    { id: 'tasks', label: 'Tarefas', icon: '✓', enabled: true },
    { id: 'reminders', label: 'Agenda', icon: '📅', enabled: true },
    { id: 'projects', label: 'Projetos', icon: '📁', enabled: false },
    { id: 'finances', label: 'Finanças', icon: '💰', enabled: false },
  ];

  const handleMenuItemClick = (itemId) => {
    onSectionChange(itemId);
    setIsMenuOpen(false); // Fechar menu no mobile após seleção
  };

  return (
    <>
      {/* Botão do Menu Mobile */}
      <div className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/80 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Karen</h2>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="text-white p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
        >
          <span className="text-xl">{isMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Overlay para Mobile */}
      {isMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Menu Lateral */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-64 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800/80 
        flex flex-col transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header do Menu */}
        <div className="p-4 sm:p-6 border-b border-gray-800/80">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Karen</h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Assistente Pessoal</p>
        </div>

        {/* Itens do Menu */}
        <nav className="flex-1 p-3 sm:p-4">
          <ul className="space-y-1 sm:space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => item.enabled && handleMenuItemClick(item.id)}
                  disabled={!item.enabled}
                  className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 flex items-center space-x-2 sm:space-x-3 ${
                    activeSection === item.id
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-lg'
                      : item.enabled
                      ? 'text-gray-300 hover:bg-gray-800/80 hover:text-white hover:border-gray-700/50 border border-transparent'
                      : 'text-gray-600 cursor-not-allowed border border-transparent'
                  }`}
                >
                  <span className="text-base sm:text-lg flex-shrink-0">{item.icon}</span>
                  <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
                  {!item.enabled && <span className="text-xs text-gray-500 ml-auto flex-shrink-0">Em breve</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Perfil do Usuário */}
        <div className="p-3 sm:p-4 border-t border-gray-800/80">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
            <img
              src={user?.photoURL || 'https://via.placeholder.com/40'}
              alt="Avatar"
              className="w-8 sm:w-10 h-8 sm:h-10 rounded-full border-2 border-gray-700/50"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs sm:text-sm font-medium truncate">
                {user?.displayName || 'Usuário'}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {user?.email || 'email@exemplo.com'}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full text-gray-400 hover:text-white text-xs sm:text-sm py-2 px-3 rounded-lg hover:bg-gray-800/80 transition-colors border border-transparent hover:border-gray-700/50"
          >
            Sair
          </button>
        </div>
      </div>
    </>
  );
}

// Componente de Lista de Tarefas
function TaskList({ tasks, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-white mb-2">Nenhuma tarefa ainda</h3>
        <p className="text-gray-400">Use o microfone para adicionar suas primeiras tarefas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={task.status === 'completed'}
              className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              readOnly
            />
            <div className="flex-1">
              <p className={`font-medium ${
                task.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'
              }`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-gray-400 text-sm mt-1">{task.description}</p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-900/30 text-red-400' :
                  task.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-green-900/30 text-green-400'
                }`}>
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </span>
                {task.createdAt && (
                  <span className="text-gray-500 text-xs">
                    {new Date(task.createdAt.seconds * 1000).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Componente de Projetos
function ProjectsList({ user }) {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'list'
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'completed', 'paused'
  const [sortBy, setSortBy] = useState('updated_at'); // 'name', 'created_at', 'updated_at', 'priority'

  // Carregar projetos
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/projects?userId=${user.uid}&status=${filterStatus}&sortBy=${sortBy}`);
      const data = await response.json();
      
      if (response.ok) {
        setProjects(data.projects || []);
      } else {
        console.error('Erro ao carregar projetos:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Criar projeto
  const createProject = async (projectData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          ...projectData
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProjects(prev => [data.project, ...prev]);
        setShowCreateForm(false);
      } else {
        console.error('Erro ao criar projeto:', data.error);
      }
    } catch (error) {
      console.error('Erro ao criar projeto:', error);
    }
  };

  // Atualizar projeto
  const updateProject = async (projectId, updates) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProjects(prev => prev.map(p => p.id === projectId ? data.project : p));
        setEditingProject(null);
      } else {
        console.error('Erro ao atualizar projeto:', data.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
    }
  };

  // Deletar projeto
  const deleteProject = async (projectId) => {
    if (!confirm('Tem certeza que deseja deletar este projeto?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      } else {
        const data = await response.json();
        console.error('Erro ao deletar projeto:', data.error);
      }
    } catch (error) {
      console.error('Erro ao deletar projeto:', error);
    }
  };

  // Obter cor do status
  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-900/30 text-green-400 border-green-500/30',
      completed: 'bg-blue-900/30 text-blue-400 border-blue-500/30',
      paused: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30',
      cancelled: 'bg-red-900/30 text-red-400 border-red-500/30'
    };
    return colors[status] || colors.active;
  };

  // Obter cor da prioridade
  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-400',
      medium: 'text-yellow-400',
      low: 'text-green-400'
    };
    return colors[priority] || colors.medium;
  };

  // Calcular progresso
  const calculateProgress = (project) => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    const completedTasks = project.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / project.tasks.length) * 100);
  };

  // Filtrar projetos
  const filteredProjects = projects.filter(project => {
    if (filterStatus === 'all') return true;
    return project.status === filterStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Projetos</h2>
          
          {/* Toggle de visualização */}
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Filtros */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="completed">Concluídos</option>
            <option value="paused">Pausados</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="updated_at">Última atualização</option>
            <option value="created_at">Data de criação</option>
            <option value="name">Nome</option>
            <option value="priority">Prioridade</option>
          </select>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>+</span>
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Formulário de criação/edição */}
      {(showCreateForm || editingProject) && (
        <ProjectForm
          project={editingProject}
          onSave={editingProject ? 
            (data) => updateProject(editingProject.id, data) : 
            createProject
          }
          onCancel={() => {
            setShowCreateForm(false);
            setEditingProject(null);
          }}
        />
      )}

      {/* Lista de projetos */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-white mb-2">Nenhum projeto encontrado</h3>
          <p className="text-gray-400 mb-4">
            {filterStatus === 'all' 
              ? 'Crie seu primeiro projeto para começar'
              : `Nenhum projeto ${filterStatus === 'active' ? 'ativo' : filterStatus === 'completed' ? 'concluído' : 'pausado'} encontrado`
            }
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Criar Primeiro Projeto
          </button>
        </div>
      ) : (
        <div className={viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredProjects.map((project) => (
            viewMode === 'cards' ? (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={setEditingProject}
                onDelete={deleteProject}
                getStatusColor={getStatusColor}
                getPriorityColor={getPriorityColor}
                calculateProgress={calculateProgress}
              />
            ) : (
              <ProjectListItem
                key={project.id}
                project={project}
                onEdit={setEditingProject}
                onDelete={deleteProject}
                getStatusColor={getStatusColor}
                getPriorityColor={getPriorityColor}
                calculateProgress={calculateProgress}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de Card do Projeto
function ProjectCard({ project, onEdit, onDelete, getStatusColor, getPriorityColor, calculateProgress }) {
  const progress = calculateProgress(project);
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 hover:bg-gray-800/70 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-lg mb-2">{project.name}</h3>
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{project.description}</p>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(project)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Editar projeto"
          >
            <span className="text-gray-400 hover:text-white">✏️</span>
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Deletar projeto"
          >
            <span className="text-gray-400 hover:text-red-400">🗑️</span>
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Status e Prioridade */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
            {project.status === 'active' ? 'Ativo' : 
             project.status === 'completed' ? 'Concluído' : 
             project.status === 'paused' ? 'Pausado' : 'Cancelado'}
          </span>
          <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
            {project.priority === 'high' ? '🔴 Alta' : 
             project.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
          </span>
        </div>
        
        {/* Progresso */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-400">Progresso</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        {/* Estatísticas */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>📋 {project.tasks?.length || 0} tarefas</span>
          <span>📅 {new Date(project.updated_at).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
}

// Componente de Item da Lista
function ProjectListItem({ project, onEdit, onDelete, getStatusColor, getPriorityColor, calculateProgress }) {
  const progress = calculateProgress(project);
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <h3 className="font-semibold text-white">{project.name}</h3>
            <p className="text-gray-400 text-sm truncate">{project.description}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
              {project.status === 'active' ? 'Ativo' : 
               project.status === 'completed' ? 'Concluído' : 
               project.status === 'paused' ? 'Pausado' : 'Cancelado'}
            </span>
            <span className={`text-sm ${getPriorityColor(project.priority)}`}>
              {project.priority === 'high' ? '🔴' : 
               project.priority === 'medium' ? '🟡' : '🟢'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-700/50 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-white text-sm font-medium w-12">{progress}%</span>
          </div>
          
          <div className="text-sm text-gray-400">
            📋 {project.tasks?.length || 0} • 📅 {new Date(project.updated_at).toLocaleDateString('pt-BR')}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => onEdit(project)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Editar projeto"
          >
            <span className="text-gray-400 hover:text-white">✏️</span>
          </button>
          <button
            onClick={() => onDelete(project.id)}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Deletar projeto"
          >
            <span className="text-gray-400 hover:text-red-400">🗑️</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de Formulário do Projeto
function ProjectForm({ project, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'active',
    priority: project?.priority || 'medium',
    tags: project?.tags?.join(', ') || '',
    deadline: project?.deadline ? new Date(project.deadline).toISOString().split('T')[0] : ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const projectData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      deadline: formData.deadline || null
    };
    
    onSave(projectData);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">
        {project ? 'Editar Projeto' : 'Novo Projeto'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Projeto *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o nome do projeto"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Ativo</option>
              <option value="completed">Concluído</option>
              <option value="paused">Pausado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descreva o projeto"
            rows={3}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prioridade
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Prazo
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="web, mobile, urgente (separadas por vírgula)"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {project ? 'Atualizar' : 'Criar'} Projeto
          </button>
        </div>
      </form>
    </div>
  );
}

// Componente de Lembretes/Agenda
function RemindersList({ user }) {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);

  // Carregar lembretes
  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  const loadReminders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/reminders?userId=${user.uid}`);
      const data = await response.json();
      
      if (response.ok) {
        setReminders(data.reminders || []);
      } else {
        console.error('Erro ao carregar lembretes:', data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar lembretes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayReminders = reminders.filter(reminder => {
        const reminderDate = new Date(reminder.start);
        return reminderDate.toDateString() === date.toDateString();
      });
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        reminders: dayReminders
      });
    }
    
    return days;
  };

  // Navegar meses
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // Filtrar lembretes por data
  const getRemindersForDate = (date) => {
    return reminders.filter(reminder => {
      const reminderDate = new Date(reminder.start);
      return reminderDate.toDateString() === date.toDateString();
    });
  };

  // Formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-white">Agenda</h2>
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Calendário
            </button>
          </div>
        </div>
        
        <button
          onClick={loadReminders}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Atualizar</span>
        </button>
      </div>

      {/* Visualização em Lista */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum evento agendado</h3>
              <p className="text-gray-400">Use o chat para criar lembretes e eventos</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-1">
                        {reminder.summary}
                      </h4>
                      {reminder.description && (
                        <p className="text-gray-400 text-sm mb-2">
                          {reminder.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-blue-400">📅</span>
                        <span className="text-gray-300">
                          {formatDate(reminder.start)}
                        </span>
                        {reminder.created_by_karen && (
                          <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded-full text-xs">
                            Criado pela Karen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visualização em Calendário */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Controles do calendário */}
          <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <span className="text-white text-xl">‹</span>
            </button>
            
            <h3 className="text-xl font-semibold text-white">
              {currentDate.toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
              }).replace(/^\w/, c => c.toUpperCase())}
            </h3>
            
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <span className="text-white text-xl">›</span>
            </button>
          </div>

          {/* Grade do calendário */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-gray-400 text-sm font-medium py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Dias do calendário */}
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedDate(day.date)}
                  className={`min-h-[80px] p-2 rounded-lg cursor-pointer transition-colors ${
                    day.isCurrentMonth
                      ? 'bg-gray-700/30 hover:bg-gray-700/50'
                      : 'bg-gray-800/20 text-gray-600'
                  } ${
                    day.isToday ? 'ring-2 ring-blue-500' : ''
                  } ${
                    selectedDate && selectedDate.toDateString() === day.date.toDateString()
                      ? 'bg-blue-600/20 border border-blue-500/50'
                      : ''
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    day.isCurrentMonth ? 'text-white' : 'text-gray-600'
                  } ${
                    day.isToday ? 'text-blue-400' : ''
                  }`}>
                    {day.date.getDate()}
                  </div>
                  
                  {/* Indicadores de eventos */}
                  {day.reminders.length > 0 && (
                    <div className="space-y-1">
                      {day.reminders.slice(0, 2).map((reminder, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-blue-600/20 text-blue-400 px-1 py-0.5 rounded truncate"
                          title={reminder.summary}
                        >
                          {reminder.summary}
                        </div>
                      ))}
                      {day.reminders.length > 2 && (
                        <div className="text-xs text-gray-400">
                          +{day.reminders.length - 2} mais
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Detalhes da data selecionada */}
          {selectedDate && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-3">
                Eventos para {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                }).replace(/^\w/, c => c.toUpperCase())}
              </h4>
              
              {getRemindersForDate(selectedDate).length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum evento neste dia</p>
              ) : (
                <div className="space-y-2">
                  {getRemindersForDate(selectedDate).map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center space-x-3 p-2 bg-gray-700/30 rounded"
                    >
                      <span className="text-blue-400">📅</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">{reminder.summary}</p>
                        <p className="text-gray-400 text-sm">
                          {new Date(reminder.start).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



// Componente de Chat
function ChatView({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Carregar histórico de chat ao montar o componente
  useEffect(() => {
    loadChatHistory();
  }, [user]);

  // Função para adicionar pontuação automática à transcrição
  const addAutomaticPunctuation = (text) => {
    if (!text || text.trim().length === 0) return text;
    
    let processedText = text.trim();
    
    // Converter para minúsculas para análise, mas manter o texto original
    const lowerText = processedText.toLowerCase();
    
    // Padrões para perguntas (adicionar ? no final)
    const questionPatterns = [
      /^(como|quando|onde|por que|porque|qual|quais|quem|o que|que|quantos|quantas)/,
      /^(você|voce|tu|karen)/,
      /\b(pode|consegue|sabe|tem|há|ha|existe|é|e)\b.*$/
    ];
    
    // Padrões para exclamações
     const exclamationPatterns = [
       /\b(nossa|uau|caramba|incrível|incrivel|ótimo|otimo|excelente|perfeito|obrigado|obrigada|parabéns|parabens|maravilhoso|fantástico|fantastico|demais)\b/,
       /^(que|como)\b.*\b(legal|bom|ruim|terrível|terrivel|maravilhoso|incrível|incrivel|ótimo|otimo)\b/,
       /\b(você|voce)\s+(é|e)\s+(ótimo|otimo|incrível|incrivel|perfeito|maravilhoso|fantástico|fantastico)\b/
     ];
    
    // Verificar se é uma exclamação (prioridade sobre pergunta)
     const isExclamation = exclamationPatterns.some(pattern => pattern.test(lowerText));
     
     // Verificar se é uma pergunta (apenas se não for exclamação)
     const isQuestion = !isExclamation && questionPatterns.some(pattern => pattern.test(lowerText));
    
    // Adicionar vírgulas em padrões comuns
    processedText = processedText
      // Vírgula após conectivos
      .replace(/\b(então|entao|mas|porém|porem|contudo|todavia|entretanto|no entanto|além disso|alem disso|por exemplo|ou seja)\b/gi, '$1,')
      // Vírgula antes de "que" em contextos específicos
      .replace(/\b(acho|penso|creio|acredito|imagino|suponho)\s+(que)\b/gi, '$1, $2')
      // Vírgula após saudações
      .replace(/^(oi|olá|ola|bom dia|boa tarde|boa noite|tchau|até logo|ate logo)\b/gi, '$1,')
      // Vírgula em enumerações (detectar "e" entre palavras)
      .replace(/\b(\w+)\s+e\s+(\w+)\s+e\s+(\w+)/gi, '$1, $2 e $3');
    
    // Capitalizar primeira letra
    processedText = processedText.charAt(0).toUpperCase() + processedText.slice(1);
    
    // Adicionar pontuação final
    if (!processedText.match(/[.!?]$/)) {
      if (isQuestion) {
        processedText += '?';
      } else if (isExclamation) {
        processedText += '!';
      } else {
        processedText += '.';
      }
    }
    
    return processedText;
  };

  // Inicializar reconhecimento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'pt-BR';
      
      recognitionInstance.onresult = (event) => {
        const rawTranscript = event.results[0][0].transcript;
        const transcript = addAutomaticPunctuation(rawTranscript);
        console.log(`🎤 [DEBUG] Transcrição original: "${rawTranscript}"`);
        console.log(`✏️ [DEBUG] Transcrição com pontuação: "${transcript}"`);
        setInputText(transcript);
        handleSendMessage(transcript);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Erro no reconhecimento de voz:', event.error);
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  // Função para carregar histórico de chat
  const loadChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`${API_BASE_URL}/api/chat-history?userId=${user?.uid || 'anonymous'}&limit=50`);
      const data = await response.json();
      
      if (data.messages) {
        const formattedMessages = data.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        console.log(`📚 [DEBUG] Histórico carregado: ${formattedMessages.length} mensagens`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Função para limpar histórico de chat
  const clearChatHistory = async () => {
    if (!confirm('Tem certeza que deseja limpar todo o histórico de chat? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat-history?userId=${user?.uid || 'anonymous'}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessages([]);
        console.log(`🗑️ [DEBUG] Histórico limpo: ${data.deletedCount} mensagens removidas`);
        alert(`Histórico limpo com sucesso! ${data.deletedCount} mensagens removidas.`);
      } else {
        throw new Error(data.error || 'Erro ao limpar histórico');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar histórico:', error);
      alert('Erro ao limpar histórico. Tente novamente.');
    }
  };

  // Função para enviar mensagem
  const handleSendMessage = async (text = inputText) => {
    if (!text.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          userId: user?.uid || 'anonymous'
        })
      });
      
      const data = await response.json();
      
      console.log('🎵 [DEBUG] Resposta recebida do backend:', {
        responseText: data.responseText?.substring(0, 50) + '...',
        audioUrl: data.audioUrl ? 'Presente' : 'Ausente',
        audioUrlLength: data.audioUrl?.length || 0,
        voiceEnabled: voiceEnabled
      });
      
      const karenMessage = {
        id: Date.now() + 1,
        text: data.responseText,
        sender: 'karen',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, karenMessage]);
      
      // Reproduzir áudio se disponível e voz estiver habilitada
      if (data.audioUrl && voiceEnabled) {
        console.log('🎵 [DEBUG] Tentando reproduzir áudio...');
        try {
          // Verificar se é um fallback para Web Speech API
          if (data.audioUrl.startsWith('web-speech:')) {
            const textToSpeak = data.audioUrl.replace('web-speech:', '');
            console.log('🎤 [DEBUG] Usando Web Speech API para:', textToSpeak.substring(0, 50) + '...');
            
            // Usar Web Speech API
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              utterance.lang = 'pt-BR';
              utterance.rate = 0.9;
              utterance.pitch = 1.1;
              
              // Tentar encontrar uma voz feminina em português
              const voices = speechSynthesis.getVoices();
              const femaleVoice = voices.find(voice => 
                voice.lang.includes('pt') && 
                (voice.name.toLowerCase().includes('female') || 
                 voice.name.toLowerCase().includes('feminina') ||
                 voice.name.toLowerCase().includes('maria') ||
                 voice.name.toLowerCase().includes('luciana'))
              );
              
              if (femaleVoice) {
                utterance.voice = femaleVoice;
                console.log('🎤 [DEBUG] Usando voz:', femaleVoice.name);
              } else {
                // Usar a primeira voz em português disponível
                const ptVoice = voices.find(voice => voice.lang.includes('pt'));
                if (ptVoice) {
                  utterance.voice = ptVoice;
                  console.log('🎤 [DEBUG] Usando voz PT:', ptVoice.name);
                }
              }
              
              utterance.onstart = () => console.log('🎤 [DEBUG] Web Speech: reprodução iniciada');
              utterance.onend = () => console.log('🎤 [DEBUG] Web Speech: reprodução finalizada');
              utterance.onerror = (e) => console.error('🎤 [ERROR] Web Speech erro:', e);
              
              speechSynthesis.speak(utterance);
              console.log('🎤 [DEBUG] Web Speech iniciado com sucesso');
            } else {
              console.error('🎤 [ERROR] Web Speech API não suportada neste navegador');
            }
          } else {
            // Áudio tradicional (ElevenLabs)
            const audio = new Audio(data.audioUrl);
            
            audio.onloadstart = () => console.log('🎵 [DEBUG] Áudio: loadstart');
            audio.oncanplay = () => console.log('🎵 [DEBUG] Áudio: canplay');
            audio.onplay = () => console.log('🎵 [DEBUG] Áudio: play iniciado');
            audio.onended = () => console.log('🎵 [DEBUG] Áudio: reprodução finalizada');
            audio.onerror = (e) => console.error('❌ [DEBUG] Erro no áudio:', e);
            
            await audio.play();
            console.log('✅ [DEBUG] Áudio reproduzido com sucesso');
          }
        } catch (error) {
          console.error('❌ [DEBUG] Erro ao reproduzir áudio:', error);
        }
      } else {
        console.log('🎵 [DEBUG] Áudio não reproduzido:', {
          audioUrl: !!data.audioUrl,
          voiceEnabled: voiceEnabled
        });
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Desculpe, ocorreu um erro. Tente novamente.',
        sender: 'karen',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Função para iniciar/parar reconhecimento de voz
  const toggleVoiceRecognition = () => {
    if (!recognition) {
      alert('Reconhecimento de voz não suportado neste navegador');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  // Função para enviar com Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Cabeçalho do Chat com Toggle de Voz e Limpar Histórico */}
      <div className="border-b border-gray-800/80 p-3 sm:p-4 bg-gray-900/95 backdrop-blur-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="text-xl sm:text-2xl flex-shrink-0">💬</div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">Chat com Karen</h2>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                {isLoadingHistory ? 'Carregando histórico...' : 'Assistente IA Inteligente'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Botão Limpar Histórico */}
            <button
              onClick={clearChatHistory}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 bg-red-600/30 border border-red-500/40 text-red-300 hover:bg-red-600/40 hover:border-red-400/60"
              title="Limpar histórico de chat"
              disabled={messages.length === 0}
            >
              <span className="text-sm sm:text-lg">🗑️</span>
              <span className="text-xs sm:text-sm font-medium hidden md:inline">Limpar</span>
            </button>
            
            {/* Botão Toggle de Voz */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-all duration-200 ${
                voiceEnabled
                  ? 'bg-green-600/30 border border-green-500/40 text-green-300 hover:bg-green-600/40 hover:border-green-400/60'
                  : 'bg-gray-800/80 border border-gray-700/80 text-gray-300 hover:bg-gray-700/80 hover:border-gray-600/80'
              }`}
              title={voiceEnabled ? 'Desativar respostas por voz' : 'Ativar respostas por voz'}
            >
              <span className="text-sm sm:text-lg">{voiceEnabled ? '🔊' : '🔇'}</span>
              <span className="text-xs sm:text-sm font-medium hidden md:inline">
                {voiceEnabled ? 'Voz Ativa' : 'Voz Inativa'}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 bg-black">
        {messages.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">💬</div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Olá! Eu sou a Karen</h3>
            <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto leading-relaxed">
              Como posso ajudar você hoje? Digite uma mensagem ou use o microfone.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} px-1 sm:px-0`}
            >
              <div
                className={`max-w-[85%] sm:max-w-xs lg:max-w-md xl:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500/30'
                    : 'bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-sm border border-gray-700/80 text-gray-100'
                }`}
              >
                <p className="text-sm sm:text-base leading-relaxed break-words">{message.text}</p>
                <p className="text-xs opacity-70 mt-1 sm:mt-2">
                  {message.timestamp.toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        
        {/* Indicador de digitação */}
        {isTyping && (
          <div className="flex justify-start px-1 sm:px-0">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-sm border border-gray-700/80 text-gray-100 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <p className="text-xs opacity-70 mt-1">Karen está digitando...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Área de Input */}
      <div className="border-t border-gray-800/80 p-3 sm:p-4 bg-gray-900/95 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="w-full bg-black/80 backdrop-blur-sm border border-gray-700/80 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 resize-none transition-all duration-200"
              rows="1"
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          
          <div className="flex space-x-2 sm:space-x-3 justify-end sm:justify-start">
            {/* Botão de Voz */}
            <button
              onClick={toggleVoiceRecognition}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-200 flex-shrink-0 ${
                isListening
                  ? 'bg-red-600/90 hover:bg-red-600 text-white border border-red-500/60'
                  : 'bg-black/80 backdrop-blur-sm border border-gray-700/80 text-gray-300 hover:text-white hover:bg-gray-800/80 hover:border-gray-600/80'
              }`}
              title={isListening ? 'Parar gravação' : 'Iniciar gravação de voz'}
            >
              <span className="text-sm sm:text-base">{isListening ? '🔴' : '🎤'}</span>
            </button>
            
            {/* Botão de Enviar */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-medium border border-blue-500/30 disabled:border-gray-600/30 flex-shrink-0"
            >
              <span className="text-sm sm:text-base">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente Principal
function App() {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeSection, setActiveSection] = useState('chat');
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);


  // Observar mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Escutar tarefas quando o usuário estiver autenticado
  useEffect(() => {
    if (user) {
      setIsLoadingTasks(true);
      const unsubscribe = listenToTasks(user.uid, (tasksData) => {
        setTasks(tasksData);
        setIsLoadingTasks(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      setIsLoadingAuth(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro no login com Google:', error);
      setIsLoadingAuth(false);
    }
  };

  const handleEmailLogin = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      await signInWithEmail(email, password);
    } catch (error) {
      console.error('Erro no login com email:', error);
      setIsLoadingAuth(false);
      throw error; // Re-throw para o componente LoginScreen tratar
    }
  };

  const handleEmailSignUp = async (email, password, displayName) => {
    try {
      setIsLoadingAuth(true);
      await signUpWithEmail(email, password, displayName);
    } catch (error) {
      console.error('Erro no registro:', error);
      setIsLoadingAuth(false);
      throw error; // Re-throw para o componente LoginScreen tratar
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setTasks([]);
      setActiveSection('chat');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };



  // Mostrar tela de loading durante autenticação inicial
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Mostrar tela de login se não estiver autenticado
  if (!user) {
    return (
      <LoginScreen 
        onGoogleLogin={handleGoogleLogin}
        onEmailLogin={handleEmailLogin}
        onEmailSignUp={handleEmailSignUp}
        isLoading={isLoadingAuth} 
      />
    );
  }

  // Interface principal
  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      {/* Menu Lateral */}
      <SideMenu
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        user={user}
        onLogout={handleLogout}
      />

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/80 p-4 sm:p-6 flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
            {activeSection === 'chat' ? 'Chat IA' :
             activeSection === 'tasks' ? 'Tarefas' :
             activeSection === 'reminders' ? 'Agenda' :
             activeSection === 'projects' ? 'Projetos' :
             activeSection === 'finances' ? 'Finanças' : 'Karen'}
          </h1>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-hidden bg-black">
          {activeSection === 'chat' && (
            <ChatView user={user} />
          )}
          {activeSection !== 'chat' && (
            <div className="p-4 sm:p-6 overflow-y-auto h-full bg-black">
              <div className="max-w-4xl mx-auto">
                {activeSection === 'tasks' && (
                  <TaskList tasks={tasks} isLoading={isLoadingTasks} />
                )}
                {activeSection === 'reminders' && <RemindersList user={user} />}
                {activeSection === 'projects' && <ProjectsList user={user} />}
                {activeSection === 'finances' && (
                  <div className="text-center py-8 sm:py-12">
                    <div className="text-4xl sm:text-6xl mb-4">💰</div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Finanças</h3>
                    <p className="text-sm sm:text-base text-gray-400">Em desenvolvimento</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;