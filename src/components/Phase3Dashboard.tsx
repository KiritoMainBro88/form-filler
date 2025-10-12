import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  DragDropInterface,
  AdvancedSearch,
  DataTable,
  ProgressIndicator,
  StatisticsCard,
  Modal,
  Tooltip,
  LoadingSpinner,
  EmptyState
} from './AdvancedUIComponents';
import { 
  GripVertical, 
  Settings, 
  Bell, 
  Globe, 
  Palette,
  Layout,
  Eye,
  EyeOff,
  Play,
  Pause,
  Stop,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  TrendingUp,
  Activity,
  Zap,
  Target,
  Star,
  Heart,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Flag,
  Shield,
  Lock,
  Key,
  User,
  Users,
  BellRing,
  Mail,
  Phone,
  Camera,
  Mic,
  Headphones,
  Radio,
  Wifi,
  Bluetooth,
  Battery,
  Signal,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  File,
  FilePlus,
  FileCheck,
  FileDownload,
  FileUpload,
  FileShare,
  FileLock,
  HeartOff,
  ThumbsDown,
  BookmarkCheck,
  FlagOff,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  UserCog,
  UserShield,
  BellOff,
  MailOpen,
  MailCheck,
  MailX,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  CameraOff,
  MicOff,
  HeadphonesOff,
  RadioOff,
  WifiOff,
  BluetoothOff,
  BatteryCharging,
  BatteryLow,
  SignalOff,
  SignalHigh,
  SignalMedium,
  SignalLow,
  WifiHigh,
  WifiMedium,
  WifiLow,
  WifiOff2,
  BluetoothSearch,
  BluetoothConnected,
  BluetoothDisconnected,
  BatteryFull,
  BatteryEmpty,
  BatteryAlert,
  BatteryUnknown,
  Signal1,
  Signal2,
  Signal3,
  Signal4,
  Signal5,
  Wifi1,
  Wifi2,
  Wifi3,
  Wifi4,
  Wifi5,
  Bluetooth1,
  Bluetooth2,
  Bluetooth3,
  Bluetooth4,
  Bluetooth5
} from 'lucide-react';

interface Phase3DashboardProps {
  onNavigate: (screen: string) => void;
}

interface DashboardStats {
  totalForms: number;
  totalRuns: number;
  successRate: number;
  averageTime: number;
  activeJobs: number;
  scheduledTasks: number;
  notifications: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string;
  type: 'form_scan' | 'form_fill' | 'batch_job' | 'scheduled_task' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  icon: React.ReactNode;
}

const Phase3Dashboard: React.FC<Phase3DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    totalRuns: 0,
    successRate: 0,
    averageTime: 0,
    activeJobs: 0,
    scheduledTasks: 0,
    notifications: 0,
    unreadNotifications: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDragDrop, setShowDragDrop] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setStats({
        totalForms: 156,
        totalRuns: 2847,
        successRate: 94.2,
        averageTime: 12.5,
        activeJobs: 3,
        scheduledTasks: 8,
        notifications: 23,
        unreadNotifications: 7
      });

      setRecentActivity([
        {
          id: '1',
          type: 'form_scan',
          title: 'Form Scan Completed',
          description: 'Survey Form - 15 questions found',
          timestamp: '2 minutes ago',
          status: 'success',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />
        },
        {
          id: '2',
          type: 'form_fill',
          title: 'Form Fill Completed',
          description: 'Contact Form - Run 5/10 completed',
          timestamp: '5 minutes ago',
          status: 'success',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />
        },
        {
          id: '3',
          type: 'batch_job',
          title: 'Batch Job Started',
          description: 'Marketing Survey Batch - 50 forms',
          timestamp: '10 minutes ago',
          status: 'info',
          icon: <Info className="w-5 h-5 text-blue-500" />
        },
        {
          id: '4',
          type: 'scheduled_task',
          title: 'Scheduled Task Failed',
          description: 'Daily Report Task - Network error',
          timestamp: '1 hour ago',
          status: 'error',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />
        },
        {
          id: '5',
          type: 'system',
          title: 'System Update',
          description: 'New features available in Phase 3',
          timestamp: '2 hours ago',
          status: 'info',
          icon: <Info className="w-5 h-5 text-blue-500" />
        }
      ]);

      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (query: string, filters: any) => {
    console.log('Search:', query, filters);
    // Implement search functionality
  };

  const handleRowClick = (row: any) => {
    console.log('Row clicked:', row);
    // Navigate to detail view
  };

  const handleRowSelect = (selectedRows: any[]) => {
    console.log('Rows selected:', selectedRows);
    // Handle bulk actions
  };

  const handleStepClick = (step: number) => {
    console.log('Step clicked:', step);
    // Navigate to step
  };

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    // Implement language change
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    // Implement theme change
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Phase 3 Dashboard</h1>
            <p className="text-gray-600 mt-1">Enhanced User Experience & Advanced Features</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <Tooltip content="Change Language" position="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Globe className="w-4 h-4 mr-2" />
                {currentLanguage.toUpperCase()}
              </Button>
            </Tooltip>

            {/* Theme Selector */}
            <Tooltip content="Change Theme" position="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
              >
                {currentTheme === 'light' ? (
                  <Eye className="w-4 h-4 mr-2" />
                ) : (
                  <EyeOff className="w-4 h-4 mr-2" />
                )}
                {currentTheme === 'light' ? 'Light' : 'Dark'}
              </Button>
            </Tooltip>

            {/* Notifications */}
            <Tooltip content="Notifications" position="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(true)}
                className="relative"
              >
                <Bell className="w-4 h-4 mr-2" />
                {stats.unreadNotifications > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                    {stats.unreadNotifications}
                  </Badge>
                )}
              </Button>
            </Tooltip>

            {/* Settings */}
            <Tooltip content="Settings" position="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Search Bar */}
        <div className="mb-6">
          <AdvancedSearch
            placeholder="Search forms, templates, jobs, and more..."
            onSearch={handleSearch}
            suggestions={[
              'Survey forms',
              'Contact forms',
              'Application forms',
              'Feedback forms',
              'Registration forms'
            ]}
            className="max-w-2xl"
          />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatisticsCard
            title="Total Forms"
            value={stats.totalForms}
            change={{ value: 12, type: 'increase' }}
            icon={<FileText className="w-6 h-6" />}
            color="blue"
          />
          <StatisticsCard
            title="Total Runs"
            value={stats.totalRuns.toLocaleString()}
            change={{ value: 8, type: 'increase' }}
            icon={<Activity className="w-6 h-6" />}
            color="green"
          />
          <StatisticsCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            change={{ value: 2, type: 'increase' }}
            icon={<TrendingUp className="w-6 h-6" />}
            color="purple"
          />
          <StatisticsCard
            title="Average Time"
            value={`${stats.averageTime}s`}
            change={{ value: 5, type: 'decrease' }}
            icon={<Clock className="w-6 h-6" />}
            color="yellow"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => onNavigate('form-scanner')}
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-sm">Scan Form</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => onNavigate('form-filler')}
                >
                  <Zap className="w-6 h-6" />
                  <span className="text-sm">Fill Form</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => onNavigate('templates')}
                >
                  <Layout className="w-6 h-6" />
                  <span className="text-sm">Templates</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => onNavigate('batch')}
                >
                  <Target className="w-6 h-6" />
                  <span className="text-sm">Batch Jobs</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => onNavigate('scheduler')}
                >
                  <Calendar className="w-6 h-6" />
                  <span className="text-sm">Scheduler</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setShowDragDrop(true)}
                >
                  <GripVertical className="w-6 h-6" />
                  <span className="text-sm">Drag & Drop</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex-shrink-0">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-gray-400">
                      {activity.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Indicator Example */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Current Process</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressIndicator
                steps={[
                  {
                    title: 'Scan Form',
                    description: 'Extract questions and structure',
                    status: 'completed',
                    icon: <CheckCircle className="w-5 h-5" />
                  },
                  {
                    title: 'Configure',
                    description: 'Set up fill strategies',
                    status: 'completed',
                    icon: <CheckCircle className="w-5 h-5" />
                  },
                  {
                    title: 'Execute',
                    description: 'Run form filling process',
                    status: 'current',
                    icon: <Play className="w-5 h-5" />
                  },
                  {
                    title: 'Complete',
                    description: 'Review results and cleanup',
                    status: 'pending'
                  }
                ]}
                currentStep={2}
                onStepClick={handleStepClick}
              />
            </CardContent>
          </Card>
        </div>

        {/* Data Table Example */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                data={[
                  {
                    id: '1',
                    name: 'Customer Survey',
                    type: 'Survey',
                    questions: 15,
                    runs: 45,
                    successRate: '94%',
                    lastRun: '2 hours ago',
                    status: 'Active'
                  },
                  {
                    id: '2',
                    name: 'Contact Form',
                    type: 'Contact',
                    questions: 8,
                    runs: 23,
                    successRate: '98%',
                    lastRun: '1 day ago',
                    status: 'Active'
                  },
                  {
                    id: '3',
                    name: 'Job Application',
                    type: 'Application',
                    questions: 25,
                    runs: 12,
                    successRate: '87%',
                    lastRun: '3 days ago',
                    status: 'Paused'
                  }
                ]}
                columns={[
                  {
                    key: 'name',
                    title: 'Form Name',
                    sortable: true,
                    render: (value, row) => (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{value}</span>
                      </div>
                    )
                  },
                  {
                    key: 'type',
                    title: 'Type',
                    sortable: true,
                    render: (value) => (
                      <Badge variant="secondary">{value}</Badge>
                    )
                  },
                  {
                    key: 'questions',
                    title: 'Questions',
                    sortable: true,
                    align: 'center'
                  },
                  {
                    key: 'runs',
                    title: 'Runs',
                    sortable: true,
                    align: 'center'
                  },
                  {
                    key: 'successRate',
                    title: 'Success Rate',
                    sortable: true,
                    align: 'center',
                    render: (value) => (
                      <span className="text-green-600 font-medium">{value}</span>
                    )
                  },
                  {
                    key: 'lastRun',
                    title: 'Last Run',
                    sortable: true,
                    render: (value) => (
                      <span className="text-gray-500 text-sm">{value}</span>
                    )
                  },
                  {
                    key: 'status',
                    title: 'Status',
                    sortable: true,
                    render: (value) => (
                      <Badge 
                        variant={value === 'Active' ? 'default' : 'secondary'}
                        className={value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                      >
                        {value}
                      </Badge>
                    )
                  }
                ]}
                onRowClick={handleRowClick}
                onRowSelect={handleRowSelect}
                pagination={true}
                pageSize={5}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showDragDrop && (
        <Modal
          isOpen={showDragDrop}
          onClose={() => setShowDragDrop(false)}
          title="Drag & Drop Interface"
          size="full"
        >
          <DragDropInterface
            questions={[]}
            fillStrategies={new Map()}
            customValues={new Map()}
            onUpdate={() => {}}
            onClose={() => setShowDragDrop(false)}
          />
        </Modal>
      )}

      {showNotifications && (
        <Modal
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          title="Notifications"
          size="lg"
        >
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-shrink-0">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activity.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-400">
                  {activity.timestamp}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          title="Settings"
          size="lg"
        >
          <div className="space-y-6">
            {/* Language Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Language</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { code: 'en', name: 'English', flag: '🇺🇸' },
                  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
                  { code: 'es', name: 'Español', flag: '🇪🇸' },
                  { code: 'fr', name: 'Français', flag: '🇫🇷' }
                ].map((lang) => (
                  <Button
                    key={lang.code}
                    variant={currentLanguage === lang.code ? 'default' : 'outline'}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="justify-start"
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Theme Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'light', name: 'Light', icon: <Sun className="w-5 h-5" /> },
                  { id: 'dark', name: 'Dark', icon: <Moon className="w-5 h-5" /> },
                  { id: 'auto', name: 'Auto', icon: <Palette className="w-5 h-5" /> }
                ].map((theme) => (
                  <Button
                    key={theme.id}
                    variant={currentTheme === theme.id ? 'default' : 'outline'}
                    onClick={() => handleThemeChange(theme.id)}
                    className="flex flex-col items-center space-y-2 h-20"
                  >
                    {theme.icon}
                    <span className="text-sm">{theme.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Notification Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Desktop Notifications</p>
                    <p className="text-sm text-gray-500">Show desktop notifications</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Bell className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sound Notifications</p>
                    <p className="text-sm text-gray-500">Play sound for notifications</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Send email notifications</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Phase3Dashboard;
