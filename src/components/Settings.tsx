import { LibrarySettings } from '@/lib/advanced-db';

interface SettingsProps {
  settings: LibrarySettings;
  onSettingsChange: (settings: LibrarySettings) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  books: any[];
  members: any[];
  issues: any[];
  onBooksChange: () => void;
  onMembersChange: () => void;
  onIssuesChange: () => void;
  onSettingsChange: () => void;
  showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function Settings({
  settings,
  onSettingsChange,
  onExportData,
  onImportData,
  books,
  members,
  issues,
  onBooksChange,
  onMembersChange,
  onIssuesChange,
  showNotification
}: SettingsProps) {
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImportData(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your library management system</p>
      </div>

      {/* Export/Import Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Export Data</h3>
            <p className="text-sm text-gray-500 mb-3">Download all library data as JSON</p>
            <button
              onClick={onExportData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Export All Data
            </button>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Import Data</h3>
            <p className="text-sm text-gray-500 mb-3">Import library data from JSON file</p>
            <label className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors inline-block">
              Import Data
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Current Statistics */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{books.length}</div>
            <div className="text-sm text-gray-600">Books</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{members.length}</div>
            <div className="text-sm text-gray-600">Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{issues.filter(i => i.status === 'issued').length}</div>
            <div className="text-sm text-gray-600">Active Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{issues.filter(i => i.status === 'overdue').length}</div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
        </div>
      </div>

      {/* Settings Info */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Settings</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Default Loan Duration:</span>
            <span className="font-medium">{settings.defaultLoanDuration} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Theme:</span>
            <span className="font-medium">{settings.theme}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Max Books per Member:</span>
            <span className="font-medium">{settings.maxBooksPerMember}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fine per Day:</span>
            <span className="font-medium">${settings.finePerDay}</span>
          </div>
        </div>
      </div>
    </div>
  );
}