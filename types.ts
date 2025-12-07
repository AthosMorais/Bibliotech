// Definição de Tipos e Enumerações

export enum MediaType {
  BOOK = 'LIVRO',
  MAGAZINE = 'REVISTA',
  DIGITAL = 'DIGITAL'
}

export enum LoanStatus {
  ACTIVE = 'ATIVO',
  RETURNED = 'DEVOLVIDO',
  OVERDUE = 'ATRASADO'
}

// Interface Base (Herança)
export interface BaseMedia {
  id: string;
  title: string;
  year: number;
  available: boolean;
  type: MediaType;
}

// Herança específica para Livros
export interface Book extends BaseMedia {
  type: MediaType.BOOK;
  isbn: string;
  author: string;
  genre: string;
}

// Herança para Revistas (Exemplo de polimorfismo de dados)
export interface Magazine extends BaseMedia {
  type: MediaType.MAGAZINE;
  issueNumber: number;
  publisher: string;
}

// Union Type para tratar qualquer mídia
export type MediaItem = Book | Magazine;

export interface User {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  hasPendingFines: boolean; // Flag para regra de negócio
}

export interface Loan {
  id: string;
  userId: string;
  mediaId: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  status: LoanStatus;
}

// Interface para o "Banco de Dados"
export interface DatabaseSchema {
  inventory: MediaItem[];
  users: User[];
  loans: Loan[];
}