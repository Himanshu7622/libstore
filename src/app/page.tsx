'use client';

import { useState, useEffect } from 'react';
import { libraryDB, Book, DashboardStats } from '@/lib/db';

export default function LibraryManagementApp() {
  // State management
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ totalBooks: 0, availableBooks: 0, issuedBooks: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'Fiction',
    year: new Date().getFullYear(),
    status: 'available' as 'available' | 'issued'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Categories for dropdown
  const categories = ['Fiction', 'Non-Fiction', 'Science', 'History', 'Biography', 'Technology', 'Other'];

  // Load books on component mount
  useEffect(() => {
    loadBooks();
  }, []);

  // Update filtered books when books, search, or filters change
  useEffect(() => {
    let result = books;

    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      result = result.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(book => book.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(book => book.status === statusFilter);
    }

    setFilteredBooks(result);
  }, [books, searchQuery, categoryFilter, statusFilter]);

  // Calculate stats when books change
  useEffect(() => {
    calculateStats();
  }, [books]);

  // Load all books from database
  const loadBooks = async () => {
    try {
      setLoading(true);
      const allBooks = await libraryDB.getAllBooks();
      setBooks(allBooks);
      setError(null);
    } catch (err) {
      setError('Failed to load books from database');
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate dashboard statistics
  const calculateStats = async () => {
    try {
      const dashboardStats = await libraryDB.getDashboardStats();
      setStats(dashboardStats);
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  };

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || new Date().getFullYear() : value
    }));

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.author.trim()) {
      errors.author = 'Author is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    const currentYear = new Date().getFullYear();
    if (formData.year < 1000 || formData.year > currentYear) {
      errors.year = `Year must be between 1000 and ${currentYear}`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save book (add or update)
  const handleSaveBook = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (editingBook) {
        // Update existing book
        await libraryDB.updateBook(editingBook.id, formData);
      } else {
        // Add new book
        await libraryDB.addBook(formData);
      }

      await loadBooks();
      handleCloseModal();
    } catch (err) {
      setError(editingBook ? 'Failed to update book' : 'Failed to add book');
      console.error('Error saving book:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete book
  const handleDeleteBook = async (id: string) => {
    try {
      setLoading(true);
      await libraryDB.deleteBook(id);
      await loadBooks();
      setShowDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete book');
      console.error('Error deleting book:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open modal for adding/editing book
  const handleAddBook = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      category: 'Fiction',
      year: new Date().getFullYear(),
      status: 'available'
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      category: book.category,
      year: book.year,
      status: book.status
    });
    setFormErrors({});
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBook(null);
    setFormErrors({});
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Library Management System</h1>
          <p className="text-gray-600">Manage your book collection locally in your browser</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Books</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBooks}</p>
              </div>
              <div className="text-blue-500 text-3xl">📚</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-gray-900">{stats.availableBooks}</p>
              </div>
              <div className="text-green-500 text-3xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Issued</p>
                <p className="text-2xl font-bold text-gray-900">{stats.issuedBooks}</p>
              </div>
              <div className="text-orange-500 text-3xl">📤</div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="issued">Issued</option>
            </select>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddBook}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Book
            </button>
            <button
              onClick={resetFilters}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Books Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading && books.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading books...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                {books.length === 0 ? 'No books in the library yet. Add your first book!' : 'No books match your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{book.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{book.author}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {book.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {book.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          book.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditBook(book)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(book.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Book Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.title && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Author *
                    </label>
                    <input
                      type="text"
                      name="author"
                      value={formData.author}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.author ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.author && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.author}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.category ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    {formErrors.category && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year *
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      min="1000"
                      max={new Date().getFullYear()}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.year ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.year && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.year}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="available"
                          checked={formData.status === 'available'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Available
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="issued"
                          checked={formData.status === 'issued'}
                          onChange={handleInputChange}
                          className="mr-2"
                        />
                        Issued
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBook}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Confirm Delete
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete this book? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteBook(showDeleteConfirm)}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
