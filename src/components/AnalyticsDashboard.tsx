import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  Users,
  FileText,
  Activity
} from 'lucide-react';
import { BatchProcessor, BatchJob, FormResult } from '../batch/BatchProcessor';

interface AnalyticsDashboardProps {
  batchProcessor: BatchProcessor;
  onClose: () => void;
}

interface AnalyticsData {
  overview: {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalRuns: number;
    successfulRuns: number;
    averageSuccessRate: number;
    totalTime: number;
  };
  performance: {
    averageJobTime: number;
    averageRunTime: number;
    fastestRun: number;
    slowestRun: number;
    successRateTrend: number[];
    timeTrend: number[];
  };
  forms: {
    mostProcessed: Array<{ formUrl: string; formName: string; count: number }>;
    mostSuccessful: Array<{ formUrl: string; formName: string; successRate: number }>;
    mostFailed: Array<{ formUrl: string; formName: string; failureRate: number }>;
  };
  errors: {
    mostCommon: Array<{ type: string; count: number; percentage: number }>;
    recent: Array<{ message: string; timestamp: string; formUrl?: string }>;
  };
  trends: {
    dailyJobs: Array<{ date: string; count: number; successRate: number }>;
    hourlyActivity: Array<{ hour: number; count: number }>;
  };
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  batchProcessor, 
  onClose 
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);

  useEffect(() => {
    loadAnalyticsData();
    
    // Set up real-time updates
    const interval = setInterval(loadAnalyticsData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await calculateAnalytics(batchProcessor, timeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = async (
    processor: BatchProcessor, 
    range: string
  ): Promise<AnalyticsData> => {
    const jobs = processor.getAllJobs();
    const stats = processor.getJobStatistics();
    
    // Filter jobs by time range
    const filteredJobs = filterJobsByTimeRange(jobs, range);
    
    // Calculate overview
    const overview = {
      totalJobs: filteredJobs.length,
      activeJobs: filteredJobs.filter(j => j.status === 'running' || j.status === 'paused').length,
      completedJobs: filteredJobs.filter(j => j.status === 'completed').length,
      failedJobs: filteredJobs.filter(j => j.status === 'failed').length,
      totalRuns: filteredJobs.reduce((sum, j) => sum + j.progress.totalRuns, 0),
      successfulRuns: filteredJobs.reduce((sum, j) => sum + j.progress.completedRuns, 0),
      averageSuccessRate: stats.averageSuccessRate,
      totalTime: filteredJobs.reduce((sum, j) => sum + j.results.totalTime, 0)
    };

    // Calculate performance metrics
    const performance = calculatePerformanceMetrics(filteredJobs);
    
    // Calculate form statistics
    const forms = calculateFormStatistics(filteredJobs);
    
    // Calculate error statistics
    const errors = calculateErrorStatistics(filteredJobs);
    
    // Calculate trends
    const trends = calculateTrends(filteredJobs);

    return {
      overview,
      performance,
      forms,
      errors,
      trends
    };
  };

  const filterJobsByTimeRange = (jobs: BatchJob[], range: string): BatchJob[] => {
    const now = new Date();
    let cutoffDate: Date;

    switch (range) {
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return jobs;
    }

    return jobs.filter(job => new Date(job.createdAt) >= cutoffDate);
  };

  const calculatePerformanceMetrics = (jobs: BatchJob[]) => {
    const completedJobs = jobs.filter(j => j.status === 'completed');
    
    const averageJobTime = completedJobs.length > 0 
      ? completedJobs.reduce((sum, j) => sum + j.results.totalTime, 0) / completedJobs.length 
      : 0;

    const allRuns = completedJobs.flatMap(job => 
      Array.from(job.results.formResults.values()).flatMap(form => form.details)
    );

    const successfulRuns = allRuns.filter(run => run.status === 'success' && run.duration);
    const averageRunTime = successfulRuns.length > 0
      ? successfulRuns.reduce((sum, run) => sum + (run.duration || 0), 0) / successfulRuns.length
      : 0;

    const fastestRun = successfulRuns.length > 0
      ? Math.min(...successfulRuns.map(run => run.duration || 0))
      : 0;

    const slowestRun = successfulRuns.length > 0
      ? Math.max(...successfulRuns.map(run => run.duration || 0))
      : 0;

    // Calculate trends (simplified)
    const successRateTrend = completedJobs.map(job => job.results.successRate);
    const timeTrend = completedJobs.map(job => job.results.totalTime);

    return {
      averageJobTime,
      averageRunTime,
      fastestRun,
      slowestRun,
      successRateTrend,
      timeTrend
    };
  };

  const calculateFormStatistics = (jobs: BatchJob[]) => {
    const formStats = new Map<string, { 
      formUrl: string; 
      formName: string; 
      count: number; 
      successful: number; 
      failed: number; 
    }>();

    jobs.forEach(job => {
      job.results.formResults.forEach((formResult, formUrl) => {
        const existing = formStats.get(formUrl) || {
          formUrl,
          formName: formResult.formName,
          count: 0,
          successful: 0,
          failed: 0
        };

        existing.count += formResult.runs.total;
        existing.successful += formResult.runs.successful;
        existing.failed += formResult.runs.failed;

        formStats.set(formUrl, existing);
      });
    });

    const formArray = Array.from(formStats.values());

    const mostProcessed = formArray
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostSuccessful = formArray
      .filter(f => f.count > 0)
      .map(f => ({
        formUrl: f.formUrl,
        formName: f.formName,
        successRate: (f.successful / f.count) * 100
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    const mostFailed = formArray
      .filter(f => f.count > 0)
      .map(f => ({
        formUrl: f.formUrl,
        formName: f.formName,
        failureRate: (f.failed / f.count) * 100
      }))
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 5);

    return {
      mostProcessed,
      mostSuccessful,
      mostFailed
    };
  };

  const calculateErrorStatistics = (jobs: BatchJob[]) => {
    const errorCounts = new Map<string, number>();
    const recentErrors: Array<{ message: string; timestamp: string; formUrl?: string }> = [];

    jobs.forEach(job => {
      job.results.errors.forEach(error => {
        const count = errorCounts.get(error.type) || 0;
        errorCounts.set(error.type, count + 1);

        recentErrors.push({
          message: error.message,
          timestamp: error.timestamp,
          formUrl: error.formUrl
        });
      });
    });

    const totalErrors = Array.from(errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const mostCommon = Array.from(errorCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recent = recentErrors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      mostCommon,
      recent
    };
  };

  const calculateTrends = (jobs: BatchJob[]) => {
    // Group jobs by date
    const dailyJobs = new Map<string, { count: number; successful: number }>();
    
    jobs.forEach(job => {
      const date = new Date(job.createdAt).toISOString().split('T')[0];
      const existing = dailyJobs.get(date) || { count: 0, successful: 0 };
      existing.count++;
      if (job.status === 'completed') {
        existing.successful++;
      }
      dailyJobs.set(date, existing);
    });

    const dailyJobsArray = Array.from(dailyJobs.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        successRate: data.count > 0 ? (data.successful / data.count) * 100 : 0
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by hour (simplified)
    const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Math.floor(Math.random() * 10) // Placeholder - would need actual data
    }));

    return {
      dailyJobs: dailyJobsArray,
      hourlyActivity
    };
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
          <p className="text-gray-500">No batch jobs found to analyze.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadAnalyticsData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Jobs</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {analyticsData.overview.totalJobs}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPercentage(analyticsData.overview.averageSuccessRate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Runs</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {analyticsData.overview.totalRuns}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Time</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatDuration(analyticsData.overview.totalTime)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Job Time</span>
                    <span className="font-medium">{formatDuration(analyticsData.performance.averageJobTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Run Time</span>
                    <span className="font-medium">{formatDuration(analyticsData.performance.averageRunTime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fastest Run</span>
                    <span className="font-medium text-green-600">{formatDuration(analyticsData.performance.fastestRun)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Slowest Run</span>
                    <span className="font-medium text-red-600">{formatDuration(analyticsData.performance.slowestRun)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5" />
                  <span>Form Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Most Processed Forms</h4>
                    <div className="space-y-2">
                      {analyticsData.forms.mostProcessed.slice(0, 3).map((form, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="truncate">{form.formName}</span>
                          <Badge variant="secondary">{form.count} runs</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Error Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.errors.mostCommon.map((error, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{error.type}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{error.count}</span>
                        <span className="text-xs text-gray-500">({formatPercentage(error.percentage)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Recent Errors</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analyticsData.errors.recent.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-sm">
                      <p className="text-gray-900 truncate">{error.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Recent Jobs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {batchProcessor.getAllJobs().slice(0, 10).map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900">{job.name}</h4>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {job.progress.completedRuns}/{job.progress.totalRuns} runs completed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {formatPercentage(job.results.successRate)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDuration(job.results.totalTime)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedJob.name}</h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedJob.status)}>
                    {selectedJob.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="font-medium">{formatPercentage(selectedJob.results.successRate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Time</p>
                  <p className="font-medium">{formatDuration(selectedJob.results.totalTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">{new Date(selectedJob.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Form Results</h4>
                <div className="space-y-2">
                  {Array.from(selectedJob.results.formResults.values()).map((formResult, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{formResult.formName}</span>
                        <Badge className={getStatusColor(formResult.status)}>
                          {formResult.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formResult.runs.successful}/{formResult.runs.total} successful runs
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
