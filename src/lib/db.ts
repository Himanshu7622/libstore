// Library Management System - IndexedDB Wrapper
// This file handles all database operations for storing books locally in the browser

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
  status: 'available' | 'issued';
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  issuedBooks: number;
}

// Database configuration
const DB_NAME = 'LibraryDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

// IndexedDB wrapper class
class LibraryDB {
  private db: IDBDatabase | null = null;

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
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create books object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Create indexes for efficient searching and filtering
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('author', 'author', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('title_author', ['title', 'author'], { unique: false });
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

  // Add a new book to the database
  async addBook(bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    const db = await this.getDB();

    const book: Book = {
      ...bookData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(book);

      request.onsuccess = () => {
        resolve(book);
      };

      request.onerror = () => {
        reject(new Error('Failed to add book'));
      };
    });
  }

  // Get all books from the database
  async getAllBooks(): Promise<Book[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const books = request.result.map((book: Book & { createdAt: string; updatedAt: string }) => ({
          ...book,
          createdAt: new Date(book.createdAt),
          updatedAt: new Date(book.updatedAt),
        }));
        resolve(books);
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve books'));
      };
    });
  }

  // Update an existing book
  async updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'createdAt'>>): Promise<Book> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // First get the existing book
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingBook = getRequest.result;
        if (!existingBook) {
          reject(new Error('Book not found'));
          return;
        }

        // Update the book with new data
        const updatedBook: Book = {
          ...existingBook,
          ...updates,
          updatedAt: new Date(),
        };

        // Put the updated book back
        const putRequest = store.put(updatedBook);

        putRequest.onsuccess = () => {
          resolve(updatedBook);
        };

        putRequest.onerror = () => {
          reject(new Error('Failed to update book'));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to retrieve book for update'));
      };
    });
  }

  // Delete a book from the database
  async deleteBook(id: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete book'));
      };
    });
  }

  // Search books by title or author
  async searchBooks(query: string): Promise<Book[]> {
    const allBooks = await this.getAllBooks();

    if (!query.trim()) {
      return allBooks;
    }

    const searchTerm = query.toLowerCase();
    return allBooks.filter(book =>
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm)
    );
  }

  // Filter books by category or status
  async filterBooks(field: 'category' | 'status', value: string): Promise<Book[]> {
    const allBooks = await this.getAllBooks();

    if (value === 'all') {
      return allBooks;
    }

    return allBooks.filter(book => book[field] === value);
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const allBooks = await this.getAllBooks();

    const stats: DashboardStats = {
      totalBooks: allBooks.length,
      availableBooks: allBooks.filter(book => book.status === 'available').length,
      issuedBooks: allBooks.filter(book => book.status === 'issued').length,
    };

    return stats;
  }

  // Get a single book by ID
  async getBookById(id: string): Promise<Book | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          resolve({
            ...book,
            createdAt: new Date(book.createdAt),
            updatedAt: new Date(book.updatedAt),
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to retrieve book'));
      };
    });
  }

  // Clear all books (for testing/debugging)
  async clearAllBooks(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear books'));
      };
    });
  }
}

// Export a singleton instance
export const libraryDB = new LibraryDB();