// Advanced Library Management System - IndexedDB Wrapper
// This file handles all database operations for books, members, issues, and returns

// Core data types
export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  publicationYear: number;
  isbn?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  memberId: string; // Unique member ID
  name: string;
  phone: string;
  email: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Issue {
  id: string;
  bookId: string;
  memberId: string;
  bookTitle: string;
  memberName: string;
  issueDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: 'issued' | 'returned' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface LibrarySettings {
  id: string;
  defaultLoanDuration: number; // days
  theme: 'light' | 'dark';
  autoNotifications: boolean;
  finePerDay: number;
  maxBooksPerMember: number;
  updatedAt: Date;
}

export interface DashboardStats {
  totalBooks: number;
  totalMembers: number;
  booksAvailable: number;
  booksIssued: number;
  overdueCount: number;
  totalIssues: number;
  totalReturns: number;
}

// Database configuration
const DB_NAME = 'AdvancedLibraryDB';
const DB_VERSION = 2;
const STORES = {
  books: 'books',
  members: 'members',
  issues: 'issues',
  settings: 'settings'
} as const;

// Advanced IndexedDB wrapper class
class AdvancedLibraryDB {
  private db: IDBDatabase | null = null;
  private settings: LibrarySettings = {
    id: 'default',
    defaultLoanDuration: 14,
    theme: 'light',
    autoNotifications: false,
    finePerDay: 1,
    maxBooksPerMember: 3,
    updatedAt: new Date()
  };

  // Initialize database connection
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        // Load default settings
        this.loadSettings();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        // Create books store
        if (!db.objectStoreNames.contains(STORES.books)) {
          const booksStore = db.createObjectStore(STORES.books, { keyPath: 'id' });
          booksStore.createIndex('title', 'title', { unique: false });
          booksStore.createIndex('author', 'author', { unique: false });
          booksStore.createIndex('category', 'category', { unique: false });
          booksStore.createIndex('isbn', 'isbn', { unique: false });
          booksStore.createIndex('availableCopies', 'availableCopies', { unique: false });
          booksStore.createIndex('title_author', ['title', 'author'], { unique: false });
        }

        // Create members store
        if (!db.objectStoreNames.contains(STORES.members)) {
          const membersStore = db.createObjectStore(STORES.members, { keyPath: 'id' });
          membersStore.createIndex('memberId', 'memberId', { unique: true });
          membersStore.createIndex('name', 'name', { unique: false });
          membersStore.createIndex('email', 'email', { unique: false });
          membersStore.createIndex('phone', 'phone', { unique: false });
        }

        // Create issues store
        if (!db.objectStoreNames.contains(STORES.issues)) {
          const issuesStore = db.createObjectStore(STORES.issues, { keyPath: 'id' });
          issuesStore.createIndex('bookId', 'bookId', { unique: false });
          issuesStore.createIndex('memberId', 'memberId', { unique: false });
          issuesStore.createIndex('status', 'status', { unique: false });
          issuesStore.createIndex('issueDate', 'issueDate', { unique: false });
          issuesStore.createIndex('dueDate', 'dueDate', { unique: false });
          issuesStore.createIndex('book_member', ['bookId', 'memberId'], { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'id' });
        }
      };
    });
  }

  // Get database instance (ensures initialization)
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Load settings from database
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (settings) {
        this.settings = settings;
      } else {
        await this.saveSettings(this.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Generate unique IDs
  private generateId(): string {
    return crypto.randomUUID();
  }

  private generateMemberId(): string {
    const prefix = 'LIB';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  // ========== BOOK OPERATIONS ==========

  // Add a new book
  async addBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    const db = await this.getDB();

    const book: Book = {
      ...bookData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      availableCopies: bookData.totalCopies // Initially all copies are available
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.books], 'readwrite');
      const store = transaction.objectStore(STORES.books);
      const request = store.add(book);

      request.onsuccess = () => resolve(book);
      request.onerror = () => reject(new Error('Failed to add book'));
    });
  }

  // Get all books
  async getAllBooks(): Promise<Book[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.books], 'readonly');
      const store = transaction.objectStore(STORES.books);
      const request = store.getAll();

      request.onsuccess = () => {
        const books = request.result.map((book: Book & { createdAt: string; updatedAt: string }) => ({
          ...book,
          createdAt: new Date(book.createdAt),
          updatedAt: new Date(book.updatedAt)
        }));
        resolve(books);
      };
      request.onerror = () => reject(new Error('Failed to retrieve books'));
    });
  }

  // Get book by ID
  async getBookById(id: string): Promise<Book | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.books], 'readonly');
      const store = transaction.objectStore(STORES.books);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          resolve({
            ...book,
            createdAt: new Date(book.createdAt),
            updatedAt: new Date(book.updatedAt)
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(new Error('Failed to retrieve book'));
    });
  }

  // Update book
  async updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'createdAt'>>): Promise<Book> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.books], 'readwrite');
      const store = transaction.objectStore(STORES.books);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingBook = getRequest.result;
        if (!existingBook) {
          reject(new Error('Book not found'));
          return;
        }

        const updatedBook: Book = {
          ...existingBook,
          ...updates,
          updatedAt: new Date()
        };

        const putRequest = store.put(updatedBook);

        putRequest.onsuccess = () => resolve(updatedBook);
        putRequest.onerror = () => reject(new Error('Failed to update book'));
      };

      getRequest.onerror = () => reject(new Error('Failed to retrieve book for update'));
    });
  }

  // Delete book
  async deleteBook(id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.books], 'readwrite');
      const store = transaction.objectStore(STORES.books);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete book'));
    });
  }

  // Search books
  async searchBooks(query: string): Promise<Book[]> {
    const allBooks = await this.getAllBooks();

    if (!query.trim()) {
      return allBooks;
    }

    const searchTerm = query.toLowerCase();
    return allBooks.filter(book =>
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      book.category.toLowerCase().includes(searchTerm) ||
      (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
    );
  }

  // Get available books only
  async getAvailableBooks(): Promise<Book[]> {
    const allBooks = await this.getAllBooks();
    return allBooks.filter(book => book.availableCopies > 0);
  }

  // Update book availability
  async updateBookAvailability(bookId: string, change: number): Promise<void> {
    const book = await this.getBookById(bookId);
    if (!book) {
      throw new Error('Book not found');
    }

    const newAvailableCopies = Math.max(0, Math.min(book.totalCopies, book.availableCopies + change));
    await this.updateBook(bookId, { availableCopies: newAvailableCopies });
  }

  // ========== MEMBER OPERATIONS ==========

  // Add a new member
  async addMember(memberData: Omit<Member, 'id' | 'memberId' | 'createdAt' | 'updatedAt'>): Promise<Member> {
    const db = await this.getDB();

    // Check if email or phone already exists
    const existingMembers = await this.getAllMembers();
    const emailExists = existingMembers.some(m => m.email === memberData.email);
    const phoneExists = existingMembers.some(m => m.phone === memberData.phone);

    if (emailExists) {
      throw new Error('Email already exists');
    }

    if (phoneExists) {
      throw new Error('Phone number already exists');
    }

    const member: Member = {
      ...memberData,
      id: this.generateId(),
      memberId: this.generateMemberId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.members], 'readwrite');
      const store = transaction.objectStore(STORES.members);
      const request = store.add(member);

      request.onsuccess = () => resolve(member);
      request.onerror = () => reject(new Error('Failed to add member'));
    });
  }

  // Get all members
  async getAllMembers(): Promise<Member[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.members], 'readonly');
      const store = transaction.objectStore(STORES.members);
      const request = store.getAll();

      request.onsuccess = () => {
        const members = request.result.map((member: Member & { createdAt: string; updatedAt: string }) => ({
          ...member,
          createdAt: new Date(member.createdAt),
          updatedAt: new Date(member.updatedAt)
        }));
        resolve(members);
      };
      request.onerror = () => reject(new Error('Failed to retrieve members'));
    });
  }

  // Get member by ID
  async getMemberById(id: string): Promise<Member | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.members], 'readonly');
      const store = transaction.objectStore(STORES.members);
      const request = store.get(id);

      request.onsuccess = () => {
        const member = request.result;
        if (member) {
          resolve({
            ...member,
            createdAt: new Date(member.createdAt),
            updatedAt: new Date(member.updatedAt)
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(new Error('Failed to retrieve member'));
    });
  }

  // Update member
  async updateMember(id: string, updates: Partial<Omit<Member, 'id' | 'memberId' | 'createdAt'>>): Promise<Member> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.members], 'readwrite');
      const store = transaction.objectStore(STORES.members);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingMember = getRequest.result;
        if (!existingMember) {
          reject(new Error('Member not found'));
          return;
        }

        const updatedMember: Member = {
          ...existingMember,
          ...updates,
          updatedAt: new Date()
        };

        const putRequest = store.put(updatedMember);

        putRequest.onsuccess = () => resolve(updatedMember);
        putRequest.onerror = () => reject(new Error('Failed to update member'));
      };

      getRequest.onerror = () => reject(new Error('Failed to retrieve member for update'));
    });
  }

  // Delete member
  async deleteMember(id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.members], 'readwrite');
      const store = transaction.objectStore(STORES.members);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete member'));
    });
  }

  // Search members
  async searchMembers(query: string): Promise<Member[]> {
    const allMembers = await this.getAllMembers();

    if (!query.trim()) {
      return allMembers;
    }

    const searchTerm = query.toLowerCase();
    return allMembers.filter(member =>
      member.name.toLowerCase().includes(searchTerm) ||
      member.memberId.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm) ||
      member.phone.includes(searchTerm)
    );
  }

  // ========== ISSUE OPERATIONS ==========

  // Issue a book
  async issueBook(issueData: {
    bookId: string;
    memberId: string;
    dueDate?: Date;
  }): Promise<Issue> {
    const db = await this.getDB();
    const settings = await this.getSettings();

    // Validate book and member exist
    const book = await this.getBookById(issueData.bookId);
    const member = await this.getMemberById(issueData.memberId);

    if (!book) {
      throw new Error('Book not found');
    }

    if (!member) {
      throw new Error('Member not found');
    }

    if (book.availableCopies <= 0) {
      throw new Error('No copies available for this book');
    }

    // Check member's current issued books
    const currentIssues = await this.getMemberIssues(issueData.memberId);
    if (currentIssues.length >= settings.maxBooksPerMember) {
      throw new Error(`Member has reached maximum book limit (${settings.maxBooksPerMember})`);
    }

    const issueDate = new Date();
    const dueDate = issueData.dueDate || new Date(issueDate.getTime() + (settings.defaultLoanDuration * 24 * 60 * 60 * 1000));

    const issue: Issue = {
      id: this.generateId(),
      bookId: issueData.bookId,
      memberId: issueData.memberId,
      bookTitle: book.title,
      memberName: member.name,
      issueDate,
      dueDate,
      status: 'issued',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.issues], 'readwrite');
      const store = transaction.objectStore(STORES.issues);
      const request = store.add(issue);

      request.onsuccess = async () => {
        // Update book availability
        await this.updateBookAvailability(issueData.bookId, -1);
        resolve(issue);
      };

      request.onerror = () => reject(new Error('Failed to issue book'));
    });
  }

  // Return a book
  async returnBook(issueId: string): Promise<Issue> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.issues], 'readwrite');
      const store = transaction.objectStore(STORES.issues);

      const getRequest = store.get(issueId);

      getRequest.onsuccess = async () => {
        const existingIssue = getRequest.result;
        if (!existingIssue) {
          reject(new Error('Issue record not found'));
          return;
        }

        if (existingIssue.status === 'returned') {
          reject(new Error('Book already returned'));
          return;
        }

        const returnDate = new Date();
        const isOverdue = returnDate > existingIssue.dueDate;

        const updatedIssue: Issue = {
          ...existingIssue,
          returnDate,
          status: isOverdue ? 'overdue' : 'returned',
          updatedAt: new Date()
        };

        const putRequest = store.put(updatedIssue);

        putRequest.onsuccess = async () => {
          // Update book availability
          await this.updateBookAvailability(existingIssue.bookId, 1);
          resolve(updatedIssue);
        };

        putRequest.onerror = () => reject(new Error('Failed to return book'));
      };

      getRequest.onerror = () => reject(new Error('Failed to retrieve issue for return'));
    });
  }

  // Get all issues
  async getAllIssues(): Promise<Issue[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.issues], 'readonly');
      const store = transaction.objectStore(STORES.issues);
      const request = store.getAll();

      request.onsuccess = () => {
        const issues = request.result.map((issue: Issue & {
          createdAt: string;
          updatedAt: string;
          issueDate: string;
          dueDate: string;
          returnDate?: string;
        }) => ({
          ...issue,
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt),
          issueDate: new Date(issue.issueDate),
          dueDate: new Date(issue.dueDate),
          returnDate: issue.returnDate ? new Date(issue.returnDate) : undefined
        }));
        resolve(issues);
      };
      request.onerror = () => reject(new Error('Failed to retrieve issues'));
    });
  }

  // Get member's issues
  async getMemberIssues(memberId: string): Promise<Issue[]> {
    const allIssues = await this.getAllIssues();
    return allIssues.filter(issue => issue.memberId === memberId && issue.status === 'issued');
  }

  // Get book's issues
  async getBookIssues(bookId: string): Promise<Issue[]> {
    const allIssues = await this.getAllIssues();
    return allIssues.filter(issue => issue.bookId === bookId);
  }

  // Get overdue books
  async getOverdueBooks(): Promise<Issue[]> {
    const allIssues = await this.getAllIssues();
    const now = new Date();
    return allIssues.filter(issue =>
      issue.status === 'issued' && issue.dueDate < now
    );
  }

  // Update overdue status
  async updateOverdueStatus(): Promise<void> {
    const allIssues = await this.getAllIssues();
    const now = new Date();

    const overdueIssues = allIssues.filter(issue =>
      issue.status === 'issued' && issue.dueDate < now
    );

    for (const issue of overdueIssues) {
      await this.updateIssue(issue.id, { status: 'overdue' });
    }
  }

  // Update issue
  private async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.issues], 'readwrite');
      const store = transaction.objectStore(STORES.issues);

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingIssue = getRequest.result;
        if (!existingIssue) {
          reject(new Error('Issue not found'));
          return;
        }

        const updatedIssue: Issue = {
          ...existingIssue,
          ...updates,
          updatedAt: new Date()
        };

        const putRequest = store.put(updatedIssue);

        putRequest.onsuccess = () => resolve(updatedIssue);
        putRequest.onerror = () => reject(new Error('Failed to update issue'));
      };

      getRequest.onerror = () => reject(new Error('Failed to retrieve issue for update'));
    });
  }

  // ========== DASHBOARD STATS ==========

  async getDashboardStats(): Promise<DashboardStats> {
    const books = await this.getAllBooks();
    const members = await this.getAllMembers();
    const issues = await this.getAllIssues();
    const overdueBooks = await this.getOverdueBooks();

    return {
      totalBooks: books.length,
      totalMembers: members.length,
      booksAvailable: books.reduce((sum, book) => sum + book.availableCopies, 0),
      booksIssued: issues.filter(issue => issue.status === 'issued').length,
      overdueCount: overdueBooks.length,
      totalIssues: issues.length,
      totalReturns: issues.filter(issue => issue.status === 'returned' || issue.status === 'overdue').length
    };
  }

  // ========== SETTINGS OPERATIONS ==========

  async getSettings(): Promise<LibrarySettings | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.settings], 'readonly');
      const store = transaction.objectStore(STORES.settings);
      const request = store.get('default');

      request.onsuccess = () => {
        const settings = request.result;
        if (settings) {
          resolve({
            ...settings,
            updatedAt: new Date(settings.updatedAt)
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(new Error('Failed to retrieve settings'));
    });
  }

  async saveSettings(settings: Partial<LibrarySettings>): Promise<LibrarySettings> {
    const db = await this.getDB();

    const updatedSettings: LibrarySettings = {
      ...this.settings,
      ...settings,
      id: 'default',
      updatedAt: new Date()
    };

    this.settings = updatedSettings;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.settings], 'readwrite');
      const store = transaction.objectStore(STORES.settings);
      const request = store.put(updatedSettings);

      request.onsuccess = () => resolve(updatedSettings);
      request.onerror = () => reject(new Error('Failed to save settings'));
    });
  }

  // ========== EXPORT/IMPORT OPERATIONS ==========

  async exportData(): Promise<{
    books: Book[];
    members: Member[];
    issues: Issue[];
    settings: LibrarySettings;
  }> {
    const books = await this.getAllBooks();
    const members = await this.getAllMembers();
    const issues = await this.getAllIssues();
    const settings = await this.getSettings() || this.settings;

    return { books, members, issues, settings };
  }

  async importData(data: {
    books?: Book[];
    members?: Member[];
    issues?: Issue[];
    settings?: LibrarySettings;
  }): Promise<void> {
    const db = await this.getDB();

    // Clear existing data
    await this.clearAllData();

    // Import books
    if (data.books && data.books.length > 0) {
      for (const book of data.books) {
        await this.addBook({
          title: book.title,
          author: book.author,
          category: book.category,
          publicationYear: book.publicationYear,
          isbn: book.isbn,
          totalCopies: book.totalCopies,
          availableCopies: book.availableCopies
        });
      }
    }

    // Import members
    if (data.members && data.members.length > 0) {
      for (const member of data.members) {
        try {
          await this.addMember({
            name: member.name,
            phone: member.phone,
            email: member.email,
            address: member.address
          });
        } catch (error) {
          console.warn('Failed to import member:', member.name, error);
        }
      }
    }

    // Import settings
    if (data.settings) {
      await this.saveSettings(data.settings);
    }
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.books, STORES.members, STORES.issues], 'readwrite');

      transaction.objectStore(STORES.books).clear();
      transaction.objectStore(STORES.members).clear();
      transaction.objectStore(STORES.issues).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Failed to clear data'));
    });
  }
}

// Export singleton instance
export const advancedLibraryDB = new AdvancedLibraryDB();