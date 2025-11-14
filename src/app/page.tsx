'use client';

import { useState, useEffect, Suspense } from 'react';
import { advancedLibraryDB, Book, Member, Issue, LibrarySettings, DashboardStats } from '@/lib/advanced-db';

// Component imports
import Sidebar from '@/components/Sidebar';
import Dashboard from '@/components/Dashboard';
import BookManagement from '@/components/BookManagement';
import MemberManagement from '@/components/MemberManagement';
import IssueManagement from '@/components/IssueManagement';
import Settings from '@/components/Settings';
import LoadingSpinner from '@/components/LoadingSpinner';
import Notification from '@/components/Notification';

export default function AdvancedLibraryManagementApp() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Application state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  } | null>(null);

  // Data state
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    totalMembers: 0,
    booksAvailable: 0,
    booksIssued: 0,
    overdueCount: 0,
    totalIssues: 0,
    totalReturns: 0
  });
  const [settings, setSettings] = useState<LibrarySettings>({
    id: 'default',
    defaultLoanDuration: 14,
    theme: 'light',
    autoNotifications: false,
    finePerDay: 1,
    maxBooksPerMember: 3,
    updatedAt: new Date()
  });

  // Initialize application
  useEffect(() => {
    initializeApp();

    // Update overdue status periodically
    const interval = setInterval(async () => {
      try {
        await advancedLibraryDB.updateOverdueStatus();
        await loadIssues();
      } catch (error) {
        console.error('Error updating overdue status:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Show notification helper
  const showNotification = (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    duration = 3000
  ) => {
    setNotification({ type, message, duration });
  };

  // Initialize application data
  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize database
      await advancedLibraryDB.init();

      // Load all data
      await Promise.all([
        loadBooks(),
        loadMembers(),
        loadIssues(),
        loadSettings(),
        loadStats()
      ]);

    } catch (err) {
      setError('Failed to initialize library management system');
      console.error('Error initializing app:', err);
      showNotification('error', 'Failed to initialize the application');
    } finally {
      setLoading(false);
    }
  };

  // Data loading functions
  const loadBooks = async () => {
    try {
      const allBooks = await advancedLibraryDB.getAllBooks();
      setBooks(allBooks);
    } catch (err) {
      console.error('Error loading books:', err);
      showNotification('error', 'Failed to load books');
    }
  };

  const loadMembers = async () => {
    try {
      const allMembers = await advancedLibraryDB.getAllMembers();
      setMembers(allMembers);
    } catch (err) {
      console.error('Error loading members:', err);
      showNotification('error', 'Failed to load members');
    }
  };

  const loadIssues = async () => {
    try {
      const allIssues = await advancedLibraryDB.getAllIssues();
      setIssues(allIssues);
    } catch (err) {
      console.error('Error loading issues:', err);
      showNotification('error', 'Failed to load issues');
    }
  };

  const loadSettings = async () => {
    try {
      const appSettings = await advancedLibraryDB.getSettings();
      if (appSettings) {
        setSettings(appSettings);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      showNotification('error', 'Failed to load settings');
    }
  };

  const loadStats = async () => {
    try {
      const dashboardStats = await advancedLibraryDB.getDashboardStats();
      setStats(dashboardStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([
      loadBooks(),
      loadMembers(),
      loadIssues(),
      loadStats()
    ]);
    showNotification('success', 'Data refreshed successfully');
  };

  // Handle tab navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    // Update stats when switching tabs
    if (tab === 'dashboard') {
      loadStats();
    }
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      );
    }

    const commonProps = {
      books,
      members,
      issues,
      settings,
      onBooksChange: loadBooks,
      onMembersChange: loadMembers,
      onIssuesChange: loadIssues,
      onSettingsChange: loadSettings,
      showNotification
    };

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            recentIssues={issues.slice(-10)}
            onRefresh={refreshData}
            {...commonProps}
          />
        );
      case 'books':
        return (
          <BookManagement
            {...commonProps}
          />
        );
      case 'members':
        return (
          <MemberManagement
            {...commonProps}
          />
        );
      case 'issues':
        return (
          <IssueManagement
            {...commonProps}
          />
        );
      case 'settings':
        return (
          <Settings
            settings={settings}
            onSettingsChange={(newSettings) => {
              setSettings(newSettings);
              loadSettings();
            }}
            onExportData={async () => {
              try {
                const data = await advancedLibraryDB.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `library-data-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showNotification('success', 'Data exported successfully');
              } catch (error) {
                showNotification('error', 'Failed to export data');
              }
            }}
            onImportData={async (file) => {
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                await advancedLibraryDB.importData(data);
                await refreshData();
                showNotification('success', 'Data imported successfully');
              } catch (error) {
                showNotification('error', 'Failed to import data');
              }
            }}
            {...commonProps}
          />
        );
      default:
        return (
          <Dashboard
            stats={stats}
            recentIssues={issues.slice(-10)}
            onRefresh={refreshData}
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        stats={stats}
      />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'books' && 'Book Management'}
                {activeTab === 'members' && 'Member Management'}
                {activeTab === 'issues' && 'Issue Management'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={refreshData}
                className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
                title="Refresh data"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <Suspense fallback={<LoadingSpinner />}>
            {renderMainContent()}
          </Suspense>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          duration={notification.duration}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}