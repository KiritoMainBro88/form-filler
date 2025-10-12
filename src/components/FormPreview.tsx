import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Eye, 
  EyeOff, 
  Download, 
  Share2, 
  Settings, 
  Clock, 
  Users, 
  FileText,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { AdvancedQuestion, AdvancedScanResult } from '../scanner/AdvancedFormScanner';

interface FormPreviewProps {
  scanResult: AdvancedScanResult | null;
  onClose: () => void;
  onConfigure: () => void;
}

interface QuestionPreviewProps {
  question: AdvancedQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const QuestionPreview: React.FC<QuestionPreviewProps> = ({ 
  question, 
  index, 
  isExpanded, 
  onToggle 
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'paragraph':
        return <FileText className="w-4 h-4" />;
      case 'multiple_choice':
        return <CheckCircle className="w-4 h-4" />;
      case 'checkbox':
        return <CheckCircle className="w-4 h-4" />;
      case 'dropdown':
        return <Settings className="w-4 h-4" />;
      case 'linear_scale':
        return <Settings className="w-4 h-4" />;
      case 'date':
        return <Clock className="w-4 h-4" />;
      case 'time':
        return <Clock className="w-4 h-4" />;
      case 'file_upload':
        return <Download className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'text':
      case 'paragraph':
        return 'bg-blue-100 text-blue-800';
      case 'multiple_choice':
      case 'checkbox':
        return 'bg-green-100 text-green-800';
      case 'dropdown':
      case 'linear_scale':
        return 'bg-purple-100 text-purple-800';
      case 'date':
      case 'time':
        return 'bg-orange-100 text-orange-800';
      case 'file_upload':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="mb-4">
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
              <span className="text-sm font-medium text-gray-600">{index + 1}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getTypeIcon(question.type)}
              <div>
                <h3 className="font-medium text-gray-900">
                  {question.question || 'Untitled Question'}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getTypeColor(question.type)}>
                    {question.type.replace('_', ' ')}
                  </Badge>
                  {question.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                  <span className={`text-xs font-medium ${getConfidenceColor(question.confidence)}`}>
                    {getConfidenceText(question.confidence)} Confidence
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {question.description && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                {question.description}
              </div>
            )}
            
            {question.options && question.options.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Options:</h4>
                <div className="grid grid-cols-1 gap-2">
                  {question.options.map((option, optionIndex) => (
                    <div 
                      key={optionIndex}
                      className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded"
                    >
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {question.validation && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Validation Rules:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  {question.validation.min && (
                    <div>Minimum: {question.validation.min}</div>
                  )}
                  {question.validation.max && (
                    <div>Maximum: {question.validation.max}</div>
                  )}
                  {question.validation.pattern && (
                    <div>Pattern: {question.validation.pattern}</div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Entry ID: {question.id}</span>
              <span>Confidence: {(question.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const FormPreview: React.FC<FormPreviewProps> = ({ 
  scanResult, 
  onClose, 
  onConfigure 
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'timeline'>('list');
  const [showMetadata, setShowMetadata] = useState(true);

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedQuestions(newExpanded);
  };

  const expandAll = () => {
    if (scanResult) {
      setExpandedQuestions(new Set(scanResult.questions.map((_, index) => index)));
    }
  };

  const collapseAll = () => {
    setExpandedQuestions(new Set());
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScanQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!scanResult) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Form Data</h3>
          <p className="text-gray-500">Please scan a form first to see the preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form Preview</h2>
          <p className="text-gray-600 mt-1">{scanResult.formTitle}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowMetadata(!showMetadata)}>
            {showMetadata ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showMetadata ? 'Hide' : 'Show'} Metadata
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Metadata Panel */}
      {showMetadata && (
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Total Questions</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {scanResult.formMetadata.totalQuestions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Required</p>
                    <p className="text-2xl font-bold text-red-600">
                      {scanResult.formMetadata.requiredQuestions}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Est. Time</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {Math.ceil(scanResult.formMetadata.estimatedTime / 60)}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Difficulty</p>
                    <Badge className={getDifficultyColor(scanResult.formMetadata.difficulty)}>
                      {scanResult.formMetadata.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Scan Quality</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span className={getScanQualityColor(scanResult.scanQuality.accuracy)}>
                    {(scanResult.scanQuality.accuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completeness</span>
                  <span className={getScanQualityColor(scanResult.scanQuality.completeness)}>
                    {(scanResult.scanQuality.completeness * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Confidence</span>
                  <span className={getScanQualityColor(scanResult.scanQuality.confidence)}>
                    {(scanResult.scanQuality.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Question Types</h4>
              <div className="flex flex-wrap gap-1">
                {scanResult.formMetadata.categories.map((category, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {category.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Scan Info</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Method: {scanResult.scanMethod}</div>
                <div>Scanned: {new Date(scanResult.timestamp).toLocaleString()}</div>
                <div>URL: {scanResult.formUrl}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <Button 
                variant={viewMode === 'list' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
              <Button 
                variant={viewMode === 'grid' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button 
                variant={viewMode === 'timeline' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                Timeline
              </Button>
            </div>
          </div>
          <Button onClick={onConfigure} className="bg-blue-600 hover:bg-blue-700">
            Configure Auto-Fill
          </Button>
        </div>
      </div>

      {/* Questions List */}
      <ScrollArea className="flex-1 p-6">
        <div className={`space-y-4 ${
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''
        }`}>
          {scanResult.questions.map((question, index) => (
            <QuestionPreview
              key={question.id}
              question={question}
              index={index}
              isExpanded={expandedQuestions.has(index)}
              onToggle={() => toggleQuestion(index)}
            />
          ))}
        </div>

        {scanResult.questions.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
            <p className="text-gray-500">
              The form scan didn't detect any questions. This might be due to:
            </p>
            <ul className="text-sm text-gray-500 mt-2 space-y-1">
              <li>• Form requires authentication</li>
              <li>• Form is not publicly accessible</li>
              <li>• Form structure is not recognized</li>
              <li>• Network connectivity issues</li>
            </ul>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default FormPreview;
