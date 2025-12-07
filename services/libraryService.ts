import { MediaItem, User, Loan, DatabaseSchema, MediaType, LoanStatus, Book } from '../types';

const DB_KEY = 'bibliotech_db_v1';

// Dados iniciais para popular o "Banco de Dados" se estiver vazio
const INITIAL_DATA: DatabaseSchema = {
  inventory: [
    { id: '1', type: MediaType.BOOK, title: 'Dom Casmurro', author: 'Machado de Assis', isbn: '9788500000', year: 1899, available: true, genre: 'Romance' } as Book,
    { id: '2', type: MediaType.BOOK, title: 'O Senhor dos Anéis', author: 'J.R.R. Tolkien', isbn: '9788500001', year: 1954, available: true, genre: 'Fantasia' } as Book,
    { id: '3', type: MediaType.BOOK, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9788500002', year: 2008, available: true, genre: 'Tecnologia' } as Book,
    { id: '4', type: MediaType.BOOK, title: '1984', author: 'George Orwell', isbn: '9788500003', year: 1949, available: false, genre: 'Ficção' } as Book,
  ],
  users: [
    { id: 'u1', name: 'João Silva', email: 'joao@example.com', registeredAt: new Date().toISOString(), hasPendingFines: false },
    { id: 'u2', name: 'Maria Souza', email: 'maria@example.com', registeredAt: new Date().toISOString(), hasPendingFines: true }, // Usuário com pendência para teste de exceção
  ],
  loans: [
    { id: 'l1', userId: 'u2', mediaId: '4', loanDate: '2023-10-01', dueDate: '2023-10-15', status: LoanStatus.OVERDUE }
  ]
};

// Classe que gerencia o sistema (Service Layer)
// Encapsula a lógica de manipulação de dados
export class LibraryManager {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.loadData();
  }

  // Encapsulamento: Carregamento privado
  private loadData(): DatabaseSchema {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : INITIAL_DATA;
  }

  // Encapsulamento: Persistência privada
  private saveData(): void {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
  }

  // Getters para UI (Read-only copies)
  public getInventory(): MediaItem[] {
    return [...this.db.inventory];
  }

  public getUsers(): User[] {
    return [...this.db.users];
  }

  public getLoans(): Loan[] {
    return [...this.db.loans];
  }

  // --- Regras de Negócio e Tratamento de Exceções ---

  public addUser(name: string, email: string): User {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      registeredAt: new Date().toISOString(),
      hasPendingFines: false
    };
    this.db.users.push(newUser);
    this.saveData();
    return newUser;
  }

  public addBook(title: string, author: string, isbn: string, year: number, genre: string): Book {
    const newBook: Book = {
      id: crypto.randomUUID(),
      type: MediaType.BOOK,
      title,
      author,
      isbn,
      year,
      available: true,
      genre
    };
    this.db.inventory.push(newBook);
    this.saveData();
    return newBook;
  }

  // Método: Emprestar
  public loanMedia(userId: string, mediaId: string): Loan {
    const user = this.db.users.find(u => u.id === userId);
    const media = this.db.inventory.find(m => m.id === mediaId);

    // Validações (Lançamento de Exceções simuladas)
    if (!user) throw new Error("Usuário não encontrado.");
    if (!media) throw new Error("Mídia não encontrada.");
    
    // Regra: Usuário com pendências não pode emprestar
    if (user.hasPendingFines) {
      throw new Error(`Ação negada: O usuário ${user.name} possui pendências financeiras ou livros atrasados.`);
    }

    // Regra: Mídia indisponível
    if (!media.available) {
      throw new Error(`Ação negada: O item "${media.title}" já está emprestado.`);
    }

    // Processamento do Empréstimo
    media.available = false; // Atualiza estado do objeto

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // +14 dias

    const newLoan: Loan = {
      id: crypto.randomUUID(),
      userId,
      mediaId,
      loanDate: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      status: LoanStatus.ACTIVE
    };

    this.db.loans.push(newLoan);
    this.saveData();
    return newLoan;
  }

  // Método: Devolver
  public returnMedia(loanId: string): void {
    const loan = this.db.loans.find(l => l.id === loanId);
    if (!loan) throw new Error("Empréstimo não encontrado.");

    if (loan.status === LoanStatus.RETURNED) {
      throw new Error("Este item já foi devolvido.");
    }

    const media = this.db.inventory.find(m => m.id === loan.mediaId);
    if (media) {
      media.available = true; // Libera a mídia
    }

    loan.status = LoanStatus.RETURNED;
    loan.returnDate = new Date().toISOString();
    
    // Lógica simples: se devolveu, assume que resolveu pendências atreladas a este empréstimo específico
    // (Em um sistema real, seria mais complexo financeiramente)
    this.checkUserStatus(loan.userId); 

    this.saveData();
  }

  // Método: Renovar
  public renewLoan(loanId: string): Loan {
    const loan = this.db.loans.find(l => l.id === loanId);
    if (!loan) throw new Error("Empréstimo não encontrado.");
    
    if (loan.status !== LoanStatus.ACTIVE && loan.status !== LoanStatus.OVERDUE) {
      throw new Error("Apenas empréstimos ativos podem ser renovados.");
    }

    // Regra: Não pode renovar se já estiver muito atrasado (exemplo arbitrário)
    // Aqui apenas estendemos a data
    const currentDueDate = new Date(loan.dueDate);
    currentDueDate.setDate(currentDueDate.getDate() + 7); // +7 dias
    
    loan.dueDate = currentDueDate.toISOString();
    loan.status = LoanStatus.ACTIVE; // Reseta status se estava overdue

    this.saveData();
    return loan;
  }

  // Método auxiliar interno para recalcular status do usuário
  private checkUserStatus(userId: string) {
    const user = this.db.users.find(u => u.id === userId);
    if (!user) return;

    // Se o usuário tiver qualquer empréstimo 'OVERDUE' ativo, mantém pendência
    const hasOverdue = this.db.loans.some(l => 
      l.userId === userId && 
      l.status === LoanStatus.OVERDUE
    );

    // Se não tiver overdue, limpamos a flag (simplificação)
    if (!hasOverdue) {
        user.hasPendingFines = false;
    }
  }

  // Método para IA: Dump do inventário
  public getInventoryContext(): string {
    return this.db.inventory.map(i => 
      `- ${i.title} (${i.type}), ID: ${i.id}, Disponível: ${i.available ? 'Sim' : 'Não'}`
    ).join('\n');
  }
}