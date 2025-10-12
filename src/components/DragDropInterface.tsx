import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  GripVertical, 
  Move, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X,
  ArrowUp,
  ArrowDown,
  Copy,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { AdvancedQuestion } from '../scanner/AdvancedFormScanner';
import { SmartFillStrategies } from '../strategies/SmartFillStrategies';

interface DragDropInterfaceProps {
  questions: AdvancedQuestion[];
  fillStrategies: Map<string, string>;
  customValues: Map<string, any>;
  onUpdate: (questions: AdvancedQuestion[], strategies: Map<string, string>, values: Map<string, any>) => void;
  onClose: () => void;
}

interface DraggedItem {
  id: string;
  type: 'question' | 'strategy';
  index: number;
  data: any;
}

interface QuestionGroup {
  id: string;
  name: string;
  questions: AdvancedQuestion[];
  collapsed: boolean;
  color: string;
}

const DragDropInterface: React.FC<DragDropInterfaceProps> = ({
  questions,
  fillStrategies,
  customValues,
  onUpdate,
  onClose
}) => {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [questionGroups, setQuestionGroups] = useState<QuestionGroup[]>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkStrategy, setBulkStrategy] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');
  
  const strategies = new SmartFillStrategies();
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize question groups based on question types
    const groups = createQuestionGroups(questions);
    setQuestionGroups(groups);
  }, [questions]);

  const createQuestionGroups = (questions: AdvancedQuestion[]): QuestionGroup[] => {
    const groupMap = new Map<string, QuestionGroup>();
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-red-100', 'bg-yellow-100'];

    questions.forEach((question, index) => {
      const groupName = getGroupName(question.type);
      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, {
          id: `group-${groupName}`,
          name: groupName,
          questions: [],
          collapsed: false,
          color: colors[groupMap.size % colors.length]
        });
      }
      groupMap.get(groupName)!.questions.push(question);
    });

    return Array.from(groupMap.values());
  };

  const getGroupName = (type: string): string => {
    switch (type) {
      case 'text':
      case 'paragraph':
        return 'Text Input';
      case 'multiple_choice':
      case 'checkbox':
        return 'Multiple Choice';
      case 'dropdown':
        return 'Dropdown';
      case 'linear_scale':
        return 'Rating Scale';
      case 'date':
      case 'time':
        return 'Date & Time';
      case 'file_upload':
        return 'File Upload';
      default:
        return 'Other';
    }
  };

  const handleDragStart = (e: React.DragEvent, question: AdvancedQuestion, index: number) => {
    setDraggedItem({
      id: question.id,
      type: 'question',
      index,
      data: question
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', question.id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.type !== 'question') {
      setDragOverIndex(null);
      return;
    }

    const newQuestions = [...questions];
    const draggedQuestion = newQuestions.splice(draggedItem.index, 1)[0];
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    // Update question order
    const updatedQuestions = newQuestions.map((q, index) => ({
      ...q,
      position: { ...q.position, order: index }
    }));

    onUpdate(updatedQuestions, fillStrategies, customValues);
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleQuestionEdit = (questionId: string) => {
    setEditingQuestion(questionId);
  };

  const handleQuestionSave = (questionId: string, updates: Partial<AdvancedQuestion>) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    );
    onUpdate(updatedQuestions, fillStrategies, customValues);
    setEditingQuestion(null);
  };

  const handleStrategyChange = (questionId: string, strategyId: string) => {
    const newStrategies = new Map(fillStrategies);
    newStrategies.set(questionId, strategyId);
    onUpdate(questions, newStrategies, customValues);
  };

  const handleCustomValueChange = (questionId: string, value: any) => {
    const newValues = new Map(customValues);
    newValues.set(questionId, value);
    onUpdate(questions, fillStrategies, newValues);
  };

  const handleQuestionDelete = (questionId: string) => {
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    const newStrategies = new Map(fillStrategies);
    const newValues = new Map(customValues);
    newStrategies.delete(questionId);
    newValues.delete(questionId);
    onUpdate(updatedQuestions, newStrategies, newValues);
  };

  const handleQuestionDuplicate = (question: AdvancedQuestion) => {
    const duplicatedQuestion: AdvancedQuestion = {
      ...question,
      id: `${question.id}-copy-${Date.now()}`,
      position: { ...question.position, order: questions.length }
    };
    
    const updatedQuestions = [...questions, duplicatedQuestion];
    onUpdate(updatedQuestions, fillStrategies, customValues);
  };

  const handleQuestionSelect = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuestions.size === questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(questions.map(q => q.id)));
    }
  };

  const handleBulkEdit = () => {
    if (selectedQuestions.size === 0) return;

    const newStrategies = new Map(fillStrategies);
    const newValues = new Map(customValues);

    selectedQuestions.forEach(questionId => {
      if (bulkStrategy) {
        newStrategies.set(questionId, bulkStrategy);
      }
      if (bulkValue) {
        newValues.set(questionId, bulkValue);
      }
    });

    onUpdate(questions, newStrategies, newValues);
    setBulkEditMode(false);
    setSelectedQuestions(new Set());
    setBulkStrategy('');
    setBulkValue('');
  };

  const handleGroupToggle = (groupId: string) => {
    setQuestionGroups(groups => 
      groups.map(group => 
        group.id === groupId 
          ? { ...group, collapsed: !group.collapsed }
          : group
      )
    );
  };

  const handleMoveToGroup = (questionId: string, targetGroupId: string) => {
    // This would implement moving questions between groups
    // For now, we'll just log the action
    console.log(`Moving question ${questionId} to group ${targetGroupId}`);
  };

  const getQuestionIcon = (type: string) => {
    switch (type) {
      case 'text':
        return '📝';
      case 'paragraph':
        return '📄';
      case 'multiple_choice':
        return '🔘';
      case 'checkbox':
        return '☑️';
      case 'dropdown':
        return '📋';
      case 'linear_scale':
        return '📊';
      case 'date':
        return '📅';
      case 'time':
        return '⏰';
      case 'file_upload':
        return '📎';
      default:
        return '❓';
    }
  };

  const getStrategyColor = (strategyId: string) => {
    switch (strategyId) {
      case 'realistic-text':
        return 'bg-blue-100 text-blue-800';
      case 'pattern-text':
        return 'bg-green-100 text-green-800';
      case 'ai-generated-text':
        return 'bg-purple-100 text-purple-800';
      case 'smart-choice':
        return 'bg-orange-100 text-orange-800';
      case 'weighted-choice':
        return 'bg-red-100 text-red-800';
      case 'context-aware-choice':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Drag & Drop Interface</h2>
          <p className="text-gray-600 mt-1">Reorder questions and configure strategies</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGroups(!showGroups)}
          >
            {showGroups ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showGroups ? 'Hide' : 'Show'} Groups
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedQuestions.size > 0 && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedQuestions.size} question(s) selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkEditMode(!bulkEditMode)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Bulk Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedQuestions.size === questions.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedQuestions(new Set())}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {bulkEditMode && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <h4 className="font-medium mb-3">Bulk Edit Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Strategy
                  </label>
                  <select
                    value={bulkStrategy}
                    onChange={(e) => setBulkStrategy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Keep current</option>
                    {Array.from(strategies.getAvailableStrategies('text')).map(strategy => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Value
                  </label>
                  <input
                    type="text"
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    placeholder="Enter custom value"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Button size="sm" onClick={handleBulkEdit}>
                  <Save className="w-4 h-4 mr-2" />
                  Apply to Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkEditMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Question Groups */}
      {showGroups && (
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium mb-3">Question Groups</h3>
          <div className="flex flex-wrap gap-2">
            {questionGroups.map(group => (
              <Card
                key={group.id}
                className={`cursor-pointer transition-colors ${group.color} ${
                  group.collapsed ? 'opacity-60' : ''
                }`}
                onClick={() => handleGroupToggle(group.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{group.name}</span>
                    <Badge variant="secondary">{group.questions.length}</Badge>
                    {group.collapsed ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {questions.map((question, index) => {
            const isSelected = selectedQuestions.has(question.id);
            const isEditing = editingQuestion === question.id;
            const currentStrategy = fillStrategies.get(question.id) || 'realistic-text';
            const currentValue = customValues.get(question.id);

            return (
              <Card
                key={question.id}
                className={`transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                } ${
                  dragOverIndex === index ? 'border-blue-500 bg-blue-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, question, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleQuestionSelect(question.id)}
                          className="rounded border-gray-300"
                        />
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <span className="text-lg">{getQuestionIcon(question.type)}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={question.question}
                              onBlur={(e) => handleQuestionSave(question.id, { question: e.target.value })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleQuestionSave(question.id, { question: e.currentTarget.value });
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              autoFocus
                            />
                          ) : (
                            question.question || 'Untitled Question'
                          )}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {question.type.replace('_', ' ')}
                          </Badge>
                          {question.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            Confidence: {(question.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuestionEdit(question.id)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuestionDuplicate(question)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuestionDelete(question.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strategy Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fill Strategy
                      </label>
                      <div className="space-y-2">
                        <select
                          value={currentStrategy}
                          onChange={(e) => handleStrategyChange(question.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {Array.from(strategies.getAvailableStrategies(question.type)).map(strategy => (
                            <option key={strategy.id} value={strategy.id}>
                              {strategy.name}
                            </option>
                          ))}
                        </select>
                        <Badge className={getStrategyColor(currentStrategy)}>
                          {currentStrategy.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Custom Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Value
                      </label>
                      <input
                        type="text"
                        value={currentValue || ''}
                        onChange={(e) => handleCustomValueChange(question.id, e.target.value)}
                        placeholder="Enter custom value (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Question Options */}
                  {question.options && question.options.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Options
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {question.options.map((option, optionIndex) => (
                          <Badge key={optionIndex} variant="outline" className="text-xs">
                            {option}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Question Details */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Entry ID:</span>
                        <br />
                        <code className="text-xs bg-gray-100 px-1 rounded">{question.id}</code>
                      </div>
                      <div>
                        <span className="font-medium">Position:</span>
                        <br />
                        Order {question.position.order}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>
                        <br />
                        {question.type}
                      </div>
                      <div>
                        <span className="font-medium">Required:</span>
                        <br />
                        {question.required ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {questions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
            <p className="text-gray-500">
              Scan a form first to see questions that can be reordered and configured.
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {questions.length} question(s) • {selectedQuestions.size} selected
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleSelectAll}>
              {selectedQuestions.size === questions.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button onClick={onClose}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropInterface;
