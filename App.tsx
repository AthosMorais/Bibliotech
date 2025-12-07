import React, { useState, useEffect, useMemo } from 'react';
import { 
  Library, 
  Users, 
  BookOpen, 
  History, 
  Plus, 
  Search, 
  LogOut, 
  RefreshCw, 
  AlertTriangle,
  Bot,
  Sparkles,
  Send
} from 'lucide-react';
import { LibraryManager } from './services/libraryService';
import { askLibrarian } from './services/geminiService';
import { MediaType, MediaItem, User, Loan, LoanStatus, Book } from './types';
import { Button, Input, Card, Badge, Modal } from './components/UIComponents';

// Instantiate the service once
const libraryManager = new LibraryManager();

// --- Types for App State ---
type View = 'DASHBOARD' | 'BOOKS' | 'USERS' | 'LOANS' | 'AI';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  
  // App State reflecting the "Database"
  const [inventory, setInventory] = useState<MediaItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // To force re-reads from service

  // Load data on mount and refresh
  useEffect(() => {
    setInventory(libraryManager.getInventory());
    setUsers(libraryManager.getUsers());
    setLoans(libraryManager.getLoans());
  }, [refreshTrigger]);

  const forceRefresh = () => setRefreshTrigger(prev => prev + 1);

  // --- UI State ---
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Render Views ---

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
            <Library size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">BiblioTech</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={<Library />} label="Dashboard" active={currentView === 'DASHBOARD'} onClick={() => setCurrentView('DASHBOARD')} />
          <NavItem icon={<BookOpen />} label="Acervo (Livros)" active={currentView === 'BOOKS'} onClick={() => setCurrentView('BOOKS')} />
          <NavItem icon={<Users />} label="Usuários" active={currentView === 'USERS'} onClick={() => setCurrentView('USERS')} />
          <NavItem icon={<History />} label="Empréstimos" active={currentView === 'LOANS'} onClick={() => setCurrentView('LOANS')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
            <button 
                onClick={() => setCurrentView('AI')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${currentView === 'AI' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
                <Sparkles size={20} />
                <span className="font-medium">IA Bibliotecária</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toast Notification */}
        {notification && (
          <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 animate-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100' : 'bg-red-900/90 border-red-700 text-red-100'}`}>
            {notification.type === 'error' && <AlertTriangle size={18} />}
            {notification.message}
          </div>
        )}

        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/30 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white">
            {currentView === 'DASHBOARD' && 'Visão Geral'}
            {currentView === 'BOOKS' && 'Gerenciar Acervo'}
            {currentView === 'USERS' && 'Membros'}
            {currentView === 'LOANS' && 'Controle de Empréstimos'}
            {currentView === 'AI' && 'Assistente Virtual'}
          </h2>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>Sistema Online</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
            {currentView === 'DASHBOARD' && (
                <DashboardView inventory={inventory} users={users} loans={loans} onChangeView={setCurrentView} />
            )}
            {currentView === 'BOOKS' && (
                <BooksView inventory={inventory} users={users} onUpdate={forceRefresh} showToast={showToast} />
            )}
            {currentView === 'USERS' && (
                <UsersView users={users} onUpdate={forceRefresh} showToast={showToast} />
            )}
            {currentView === 'LOANS' && (
                <LoansView loans={loans} inventory={inventory} users={users} onUpdate={forceRefresh} showToast={showToast} />
            )}
            {currentView === 'AI' && (
                <AiAssistantView inventory={inventory} />
            )}
        </div>
      </main>
    </div>
  );
}

// --- Navigation Component ---
const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-emerald-600/10 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    <span className="font-medium">{label}</span>
  </button>
);

// --- Sub-Views ---

const DashboardView = ({ inventory, users, loans, onChangeView }: any) => {
    const activeLoans = loans.filter((l: Loan) => l.status === LoanStatus.ACTIVE).length;
    const overdueLoans = loans.filter((l: Loan) => l.status === LoanStatus.OVERDUE).length;
    const availableBooks = inventory.filter((i: MediaItem) => i.available).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Acervo Total" value={inventory.length} icon={<BookOpen className="text-blue-400" />} />
                <StatCard label="Disponíveis" value={availableBooks} icon={<Library className="text-emerald-400" />} />
                <StatCard label="Empréstimos Ativos" value={activeLoans} icon={<History className="text-amber-400" />} />
                <StatCard label="Atrasados" value={overdueLoans} icon={<AlertTriangle className="text-red-400" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Ações Rápidas">
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="secondary" onClick={() => onChangeView('BOOKS')} className="h-24 flex-col gap-2">
                            <Plus size={24} />
                            Novo Livro
                        </Button>
                        <Button variant="secondary" onClick={() => onChangeView('USERS')} className="h-24 flex-col gap-2">
                            <Users size={24} />
                            Novo Membro
                        </Button>
                    </div>
                </Card>
                <Card title="Status do Sistema">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-300">Database</span>
                            <Badge color="green">Conectado (Local)</Badge>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-300">Gemini AI</span>
                             <Badge color={process.env.API_KEY ? 'green' : 'red'}>
                                {process.env.API_KEY ? 'Ativo' : 'Sem Chave'}
                            </Badge>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

const StatCard = ({ label, value, icon }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-slate-400">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
            {icon}
        </div>
    </div>
);

const BooksView = ({ inventory, users, onUpdate, showToast }: any) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form states
    const [newBook, setNewBook] = useState({ title: '', author: '', isbn: '', genre: '', year: new Date().getFullYear() });
    const [loanUserId, setLoanUserId] = useState('');

    const handleAddBook = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            libraryManager.addBook(newBook.title, newBook.author, newBook.isbn, Number(newBook.year), newBook.genre);
            showToast('Livro adicionado com sucesso!', 'success');
            setIsAddModalOpen(false);
            setNewBook({ title: '', author: '', isbn: '', genre: '', year: new Date().getFullYear() });
            onUpdate();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleLoan = () => {
        try {
            if (!selectedBookId) return;
            libraryManager.loanMedia(loanUserId, selectedBookId);
            showToast('Empréstimo realizado!', 'success');
            setIsLoanModalOpen(false);
            setLoanUserId('');
            onUpdate();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const filteredInventory = inventory.filter((item: MediaItem) => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item as Book).author?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <Input 
                        placeholder="Buscar por título ou autor..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={18} className="mr-2" />
                    Adicionar Livro
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredInventory.map((item: any) => (
                    <Card key={item.id} className="group hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <Badge color={item.available ? 'green' : 'red'}>
                                {item.available ? 'Disponível' : 'Emprestado'}
                            </Badge>
                            <span className="text-xs text-slate-500 font-mono">{item.isbn}</span>
                        </div>
                        <h3 className="font-bold text-lg text-white mb-1 line-clamp-1">{item.title}</h3>
                        <p className="text-slate-400 text-sm mb-4">{item.author}</p>
                        
                        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.available && (
                                <Button 
                                    className="w-full" 
                                    onClick={() => {
                                        setSelectedBookId(item.id);
                                        setIsLoanModalOpen(true);
                                    }}
                                >
                                    Emprestar
                                </Button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Modal Add Book */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Novo Livro">
                <form onSubmit={handleAddBook} className="space-y-4">
                    <Input label="Título" required value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} />
                    <Input label="Autor" required value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="ISBN" required value={newBook.isbn} onChange={e => setNewBook({...newBook, isbn: e.target.value})} />
                        <Input label="Ano" type="number" required value={newBook.year} onChange={e => setNewBook({...newBook, year: Number(e.target.value)})} />
                    </div>
                    <Input label="Gênero" value={newBook.genre} onChange={e => setNewBook({...newBook, genre: e.target.value})} />
                    <Button type="submit" className="w-full mt-4">Salvar Livro</Button>
                </form>
            </Modal>

            {/* Modal Loan */}
            <Modal isOpen={isLoanModalOpen} onClose={() => setIsLoanModalOpen(false)} title="Realizar Empréstimo">
                 <div className="space-y-4">
                    <p className="text-slate-400 text-sm">Selecione o usuário para emprestar o livro.</p>
                    <select 
                        className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2"
                        value={loanUserId}
                        onChange={(e) => setLoanUserId(e.target.value)}
                    >
                        <option value="">Selecione um usuário...</option>
                        {users.map((u: User) => (
                            <option key={u.id} value={u.id}>
                                {u.name} {u.hasPendingFines ? '(Com Pendências)' : ''}
                            </option>
                        ))}
                    </select>
                    <Button onClick={handleLoan} className="w-full" disabled={!loanUserId}>Confirmar Empréstimo</Button>
                 </div>
            </Modal>
        </div>
    );
};

const UsersView = ({ users, onUpdate, showToast }: any) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '' });

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            libraryManager.addUser(newUser.name, newUser.email);
            showToast('Usuário cadastrado!', 'success');
            setIsModalOpen(false);
            setNewUser({ name: '', email: '' });
            onUpdate();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} className="mr-2" />
                    Novo Usuário
                </Button>
            </div>
            
            <Card className="p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Nome</th>
                            <th className="px-6 py-4 font-semibold">Email</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {users.map((user: User) => (
                            <tr key={user.id} className="hover:bg-slate-900/50">
                                <td className="px-6 py-4 font-medium">{user.name}</td>
                                <td className="px-6 py-4 text-slate-400">{user.email}</td>
                                <td className="px-6 py-4">
                                    {user.hasPendingFines ? (
                                        <Badge color="red">Pendências</Badge>
                                    ) : (
                                        <Badge color="green">Regular</Badge>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{user.id}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Usuário">
                <form onSubmit={handleAddUser} className="space-y-4">
                    <Input label="Nome Completo" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    <Input label="Email" type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    <Button type="submit" className="w-full mt-4">Cadastrar</Button>
                </form>
            </Modal>
        </div>
    );
};

const LoansView = ({ loans, inventory, users, onUpdate, showToast }: any) => {
    
    const handleReturn = (id: string) => {
        try {
            libraryManager.returnMedia(id);
            showToast('Item devolvido com sucesso.', 'success');
            onUpdate();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleRenew = (id: string) => {
        try {
            libraryManager.renewLoan(id);
            showToast('Empréstimo renovado por 7 dias.', 'success');
            onUpdate();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // Helper to join data
    const richLoans = loans.map((loan: Loan) => {
        const book = inventory.find((i: any) => i.id === loan.mediaId);
        const user = users.find((u: any) => u.id === loan.userId);
        return { ...loan, bookTitle: book?.title || 'Desconhecido', userName: user?.name || 'Desconhecido' };
    }).sort((a: any, b: any) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());

    return (
        <div className="space-y-6">
            <Card className="p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Livro</th>
                            <th className="px-6 py-4 font-semibold">Usuário</th>
                            <th className="px-6 py-4 font-semibold">Devolução Prevista</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {richLoans.map((loan: any) => (
                            <tr key={loan.id} className="hover:bg-slate-900/50">
                                <td className="px-6 py-4 font-medium">{loan.bookTitle}</td>
                                <td className="px-6 py-4 text-slate-400">{loan.userName}</td>
                                <td className="px-6 py-4 text-slate-400">
                                    {new Date(loan.dueDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge color={
                                        loan.status === LoanStatus.ACTIVE ? 'blue' :
                                        loan.status === LoanStatus.RETURNED ? 'gray' : 'red'
                                    }>
                                        {loan.status}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {loan.status !== LoanStatus.RETURNED && (
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleRenew(loan.id)}
                                                className="p-1 hover:bg-slate-700 rounded text-amber-400" 
                                                title="Renovar"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleReturn(loan.id)}
                                                className="p-1 hover:bg-slate-700 rounded text-emerald-400" 
                                                title="Devolver"
                                            >
                                                <LogOut size={16} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

const AiAssistantView = ({ inventory }: { inventory: MediaItem[] }) => {
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        {role: 'model', text: 'Olá! Sou a IA Bibliotecária. Como posso ajudar você a encontrar um livro hoje?'}
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        // Prepare context
        const context = libraryManager.getInventoryContext();
        
        const response = await askLibrarian(userMsg, context);
        
        setMessages(prev => [...prev, { role: 'model', text: response || 'Erro ao processar resposta.' }]);
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <Card className="flex-1 flex flex-col overflow-hidden !p-0">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none'}`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <div className="flex gap-2">
                        <Input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Pergunte sobre livros, autores ou recomendações..."
                            className="flex-1"
                        />
                        <Button onClick={handleSend} disabled={loading || !input.trim()}>
                            <Send size={18} />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};