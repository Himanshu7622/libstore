import { useState, useEffect } from 'react';
import { Book, Member, Issue, LibrarySettings } from '@/lib/advanced-db';
import Modal from './Modal';

interface BookManagementProps {
  books: Book[];
  members: Member[];
  issues: Issue[];
  settings: LibrarySettings;
  onBooksChange: () => void;
  onMembersChange: () => void;
  onIssuesChange: () => void;
  onSettingsChange: () => void;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function BookManagement({
  books,
  members,
  issues,
  settings,
  onBooksChange,
  onMembersChange,
  onIssuesChange,
  onSettingsChange,
  showNotification
}: BookManagementProps) {
  // State management
  const [filteredBooks, setFilteredBooks] = useState<Book[]>(books);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: 'Fiction',
    publicationYear: new Date().getFullYear(),
    isbn: '',
    totalCopies: 1,
    availableCopies: 1
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Categories
  const categories = [
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 'History',
    'Biography', 'Self-Help', 'Business', 'Children', 'Education',
    'Health', 'Art', 'Travel', 'Cooking', 'Sports', 'Other'
  ];

  // Update filtered books when filters change
  useEffect(() => {
    let result = books;

    // Apply search filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      result = result.filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(book => book.category === categoryFilter);
    }

    // Apply availability filter
    if (availabilityFilter !== 'all') {
      result = result.filter(book => {
        if (availabilityFilter === 'available') {
          return book.availableCopies > 0;
        } else if (availabilityFilter === 'unavailable') {
          return book.availableCopies === 0;
        }
        return true;
      });
    }

    setFilteredBooks(result);
  }, [books, searchQuery, categoryFilter, availabilityFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      category: 'Fiction',
      publicationYear: new Date().getFullYear(),
      isbn: '',
      totalCopies: 1,
      availableCopies: 1
    });
    setFormErrors({});
    setEditingBook(null);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 :
              type === 'checkbox' ? checked : value
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
    if (formData.publicationYear < 1000 || formData.publicationYear > currentYear) {
      errors.publicationYear = `Year must be between 1000 and ${currentYear}`;
    }

    if (formData.totalCopies < 1) {
      errors.totalCopies = 'Total copies must be at least 1';
    }

    if (formData.availableCopies < 0) {
      errors.availableCopies = 'Available copies cannot be negative';
    }

    if (formData.availableCopies > formData.totalCopies) {
      errors.availableCopies = 'Available copies cannot exceed total copies';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle add book
  const handleAddBook = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const { advancedLibraryDB } = await import('@/lib/advanced-db');

      await advancedLibraryDB.addBook({
        title: formData.title.trim(),
        author: formData.author.trim(),
        category: formData.category,
        publicationYear: formData.publicationYear,
        isbn: formData.isbn.trim() || undefined,
        totalCopies: formData.totalCopies,
        availableCopies: formData.availableCopies
      });

      showNotification('success', 'Book added successfully');
      setShowAddModal(false);
      resetForm();
      onBooksChange();
    } catch (error) {
      console.error('Error adding book:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit book
  const handleEditBook = async () => {
    if (!validateForm() || !editingBook) {
      return;
    }

    try {
      setLoading(true);
      const { advancedLibraryDB } = await import('@/lib/advanced-db');

      await advancedLibraryDB.updateBook(editingBook.id, {
        title: formData.title.trim(),
        author: formData.author.trim(),
        category: formData.category,
        publicationYear: formData.publicationYear,
        isbn: formData.isbn.trim() || undefined,
        totalCopies: formData.totalCopies,
        availableCopies: formData.availableCopies
      });

      showNotification('success', 'Book updated successfully');
      setShowEditModal(false);
      resetForm();
      onBooksChange();
    } catch (error) {
      console.error('Error updating book:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to update book');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete book
  const handleDeleteBook = async (bookId: string) => {
    try {
      setLoading(true);
      const { advancedLibraryDB } = await import('@/lib/advanced-db');

      await advancedLibraryDB.deleteBook(bookId);
      showNotification('success', 'Book deleted successfully');
      setShowDeleteConfirm(null);
      onBooksChange();
    } catch (error) {
      console.error('Error deleting book:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to delete book');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      category: book.category,
      publicationYear: book.publicationYear,
      isbn: book.isbn || '',
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setAvailabilityFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Management</h1>
          <p className="text-gray-600 mt-1">Manage your library's book inventory</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Book</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Books</label>
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Books</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {filteredBooks.length} of {books.length} books
          </div>
          <button
            onClick={resetFilters}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-500">
              {books.length === 0 ? 'No books in the library yet. Add your first book!' : 'No books match your search criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      {book.publicationYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {book.isbn || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>{book.availableCopies}/{book.totalCopies}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              book.availableCopies === 0 ? 'bg-red-500' :
                              book.availableCopies < book.totalCopies ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(book.availableCopies / book.totalCopies) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        book.availableCopies === 0 ? 'bg-red-100 text-red-800' :
                        book.availableCopies < book.totalCopies ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {book.availableCopies === 0 ? 'Unavailable' :
                         book.availableCopies < book.totalCopies ? 'Partially Available' :
                         'Available'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openEditModal(book)}
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

      {/* Add Book Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Book"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter book title"
            />
            {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.author ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter author name"
            />
            {formErrors.author && <p className="text-red-500 text-sm mt-1">{formErrors.author}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
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
              {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publication Year *</label>
              <input
                type="number"
                name="publicationYear"
                value={formData.publicationYear}
                onChange={handleInputChange}
                min="1000"
                max={new Date().getFullYear()}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.publicationYear ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.publicationYear && <p className="text-red-500 text-sm mt-1">{formErrors.publicationYear}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
            <input
              type="text"
              name="isbn"
              value={formData.isbn}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter ISBN (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies *</label>
              <input
                type="number"
                name="totalCopies"
                value={formData.totalCopies}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.totalCopies ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.totalCopies && <p className="text-red-500 text-sm mt-1">{formErrors.totalCopies}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Copies *</label>
              <input
                type="number"
                name="availableCopies"
                value={formData.availableCopies}
                onChange={handleInputChange}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.availableCopies ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.availableCopies && <p className="text-red-500 text-sm mt-1">{formErrors.availableCopies}</p>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={() => setShowAddModal(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddBook}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Book'}
          </button>
        </div>
      </Modal>

      {/* Edit Book Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Book"
      >
        <div className="space-y-4">
          {/* Same form fields as Add modal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter book title"
            />
            {formErrors.title && <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.author ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter author name"
            />
            {formErrors.author && <p className="text-red-500 text-sm mt-1">{formErrors.author}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
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
              {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publication Year *</label>
              <input
                type="number"
                name="publicationYear"
                value={formData.publicationYear}
                onChange={handleInputChange}
                min="1000"
                max={new Date().getFullYear()}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.publicationYear ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.publicationYear && <p className="text-red-500 text-sm mt-1">{formErrors.publicationYear}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
            <input
              type="text"
              name="isbn"
              value={formData.isbn}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter ISBN (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies *</label>
              <input
                type="number"
                name="totalCopies"
                value={formData.totalCopies}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.totalCopies ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.totalCopies && <p className="text-red-500 text-sm mt-1">{formErrors.totalCopies}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Available Copies *</label>
              <input
                type="number"
                name="availableCopies"
                value={formData.availableCopies}
                onChange={handleInputChange}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.availableCopies ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.availableCopies && <p className="text-red-500 text-sm mt-1">{formErrors.availableCopies}</p>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={() => setShowEditModal(false)}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleEditBook}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Book'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Confirm Delete"
      >
        <p className="text-gray-600 mb-6">
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
            onClick={() => showDeleteConfirm && handleDeleteBook(showDeleteConfirm)}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Book'}
          </button>
        </div>
      </Modal>
    </div>
  );
}