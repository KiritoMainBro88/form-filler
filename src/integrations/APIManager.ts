import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface APIConnection {
  id: string;
  name: string;
  description?: string;
  type: 'rest' | 'graphql' | 'websocket' | 'webhook' | 'database' | 'file' | 'custom';
  provider: 'google' | 'microsoft' | 'salesforce' | 'hubspot' | 'zapier' | 'airtable' | 'notion' | 'slack' | 'discord' | 'custom';
  status: 'active' | 'inactive' | 'error' | 'testing';
  configuration: APIConfiguration;
  authentication: APIAuthentication;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastTested?: string;
    lastUsed?: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
  };
}

export interface APIConfiguration {
  baseUrl: string;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  headers: { [key: string]: string };
  queryParams: { [key: string]: string };
  requestBody?: any;
  responseFormat: 'json' | 'xml' | 'csv' | 'text' | 'binary';
  errorHandling: {
    retryOnError: boolean;
    customErrorHandler?: string;
    fallbackData?: any;
  };
}

export interface APIAuthentication {
  type: 'none' | 'api_key' | 'bearer_token' | 'basic_auth' | 'oauth2' | 'custom';
  credentials: {
    apiKey?: string;
    token?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    customHeaders?: { [key: string]: string };
  };
  tokenExpiry?: string;
  autoRefresh: boolean;
}

export interface APIEndpoint {
  id: string;
  connectionId: string;
  name: string;
  description?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  parameters: APIParameter[];
  headers: { [key: string]: string };
  requestBody?: any;
  responseMapping: ResponseMapping;
  validation: EndpointValidation;
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastUsed?: string;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
  };
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'file';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

export interface ResponseMapping {
  success: {
    statusCodes: number[];
    dataPath?: string;
    transform?: string; // JavaScript function as string
  };
  error: {
    statusCodes: number[];
    errorPath?: string;
    messagePath?: string;
  };
  fields: FieldMapping[];
}

export interface FieldMapping {
  source: string;
  target: string;
  type: 'direct' | 'transform' | 'lookup' | 'calculation';
  transform?: string; // JavaScript function as string
  defaultValue?: any;
  required: boolean;
}

export interface EndpointValidation {
  input: {
    required: string[];
    optional: string[];
    customRules?: string; // JavaScript function as string
  };
  output: {
    required: string[];
    optional: string[];
    customRules?: string; // JavaScript function as string
  };
}

export interface APICall {
  id: string;
  endpointId: string;
  connectionId: string;
  timestamp: string;
  method: string;
  url: string;
  headers: { [key: string]: string };
  parameters: { [key: string]: any };
  requestBody?: any;
  response: {
    statusCode: number;
    headers: { [key: string]: string };
    body: any;
    size: number;
  };
  duration: number; // milliseconds
  success: boolean;
  error?: string;
  metadata: {
    userAgent: string;
    ipAddress: string;
    retryCount: number;
  };
}

export interface APIIntegration {
  id: string;
  name: string;
  description?: string;
  source: {
    type: 'form_field' | 'template' | 'batch_job' | 'scheduled_task' | 'manual';
    sourceId: string;
    fieldMapping: FieldMapping[];
  };
  destination: {
    connectionId: string;
    endpointId: string;
    dataMapping: FieldMapping[];
  };
  trigger: {
    type: 'manual' | 'automatic' | 'scheduled' | 'webhook';
    conditions?: string; // JavaScript function as string
    schedule?: string; // Cron expression
  };
  status: 'active' | 'inactive' | 'error';
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastExecuted?: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
  };
}

export interface APIAnalytics {
  totalConnections: number;
  activeConnections: number;
  totalEndpoints: number;
  totalIntegrations: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: { endpointId: string; name: string; calls: number }[];
  recentCalls: APICall[];
  errorTrends: { date: string; errors: number }[];
}

export class APIManager extends EventEmitter {
  private logger: Logger;
  private connections: Map<string, APIConnection> = new Map();
  private endpoints: Map<string, APIEndpoint> = new Map();
  private integrations: Map<string, APIIntegration> = new Map();
  private apiCalls: Map<string, APICall> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();

  constructor() {
    super();
    this.logger = new Logger();
  }

  // Connection Management

  public createConnection(connection: Omit<APIConnection, 'id' | 'metadata'>): APIConnection {
    const newConnection: APIConnection = {
      ...connection,
      id: `connection-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0
      }
    };

    this.connections.set(newConnection.id, newConnection);
    
    // Initialize rate limiter
    if (newConnection.configuration.rateLimit.enabled) {
      this.rateLimiters.set(newConnection.id, new RateLimiter(newConnection.configuration.rateLimit));
    }

    this.logger.info('API connection created', { connectionId: newConnection.id, name: newConnection.name });
    this.emit('connection_created', newConnection);

    return newConnection;
  }

  public async testConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    try {
      const testUrl = `${connection.configuration.baseUrl}/health`;
      const response = await this.makeRequest(connection, 'GET', testUrl, {}, {});
      
      connection.status = response.success ? 'active' : 'error';
      connection.metadata.lastTested = new Date().toISOString();
      this.connections.set(connectionId, connection);

      this.logger.info('Connection tested', { connectionId, success: response.success });
      this.emit('connection_tested', { connectionId, success: response.success });

      return response.success;
    } catch (error: any) {
      connection.status = 'error';
      connection.metadata.lastTested = new Date().toISOString();
      this.connections.set(connectionId, connection);

      this.logger.error('Connection test failed', { connectionId, error });
      this.emit('connection_test_failed', { connectionId, error });

      return false;
    }
  }

  public updateConnection(connectionId: string, updates: Partial<APIConnection>): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    const updatedConnection = {
      ...connection,
      ...updates,
      metadata: {
        ...connection.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.connections.set(connectionId, updatedConnection);
    this.logger.info('API connection updated', { connectionId, name: updatedConnection.name });
    this.emit('connection_updated', updatedConnection);

    return true;
  }

  public deleteConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    this.connections.delete(connectionId);
    this.rateLimiters.delete(connectionId);
    this.logger.info('API connection deleted', { connectionId, name: connection.name });
    this.emit('connection_deleted', connectionId);

    return true;
  }

  public getConnection(connectionId: string): APIConnection | null {
    return this.connections.get(connectionId) || null;
  }

  public getAllConnections(): APIConnection[] {
    return Array.from(this.connections.values());
  }

  // Endpoint Management

  public createEndpoint(endpoint: Omit<APIEndpoint, 'id' | 'metadata'>): APIEndpoint {
    const newEndpoint: APIEndpoint = {
      ...endpoint,
      id: `endpoint-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0
      }
    };

    this.endpoints.set(newEndpoint.id, newEndpoint);
    this.logger.info('API endpoint created', { endpointId: newEndpoint.id, name: newEndpoint.name });
    this.emit('endpoint_created', newEndpoint);

    return newEndpoint;
  }

  public async testEndpoint(endpointId: string, testData?: any): Promise<APICall> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const connection = this.connections.get(endpoint.connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const url = `${connection.configuration.baseUrl}${endpoint.path}`;
    const parameters = testData || {};

    const apiCall = await this.makeEndpointCall(endpoint, connection, parameters);
    
    this.logger.info('Endpoint tested', { endpointId, success: apiCall.success });
    this.emit('endpoint_tested', { endpointId, apiCall });

    return apiCall;
  }

  public updateEndpoint(endpointId: string, updates: Partial<APIEndpoint>): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return false;
    }

    const updatedEndpoint = {
      ...endpoint,
      ...updates,
      metadata: {
        ...endpoint.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.endpoints.set(endpointId, updatedEndpoint);
    this.logger.info('API endpoint updated', { endpointId, name: updatedEndpoint.name });
    this.emit('endpoint_updated', updatedEndpoint);

    return true;
  }

  public deleteEndpoint(endpointId: string): boolean {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return false;
    }

    this.endpoints.delete(endpointId);
    this.logger.info('API endpoint deleted', { endpointId, name: endpoint.name });
    this.emit('endpoint_deleted', endpointId);

    return true;
  }

  public getEndpoint(endpointId: string): APIEndpoint | null {
    return this.endpoints.get(endpointId) || null;
  }

  public getAllEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  public getEndpointsByConnection(connectionId: string): APIEndpoint[] {
    return Array.from(this.endpoints.values()).filter(endpoint => 
      endpoint.connectionId === connectionId
    );
  }

  // Integration Management

  public createIntegration(integration: Omit<APIIntegration, 'id' | 'metadata'>): APIIntegration {
    const newIntegration: APIIntegration = {
      ...integration,
      id: `integration-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user',
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0
      }
    };

    this.integrations.set(newIntegration.id, newIntegration);
    this.logger.info('API integration created', { integrationId: newIntegration.id, name: newIntegration.name });
    this.emit('integration_created', newIntegration);

    return newIntegration;
  }

  public async executeIntegration(integrationId: string, data?: any): Promise<APICall[]> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const endpoint = this.endpoints.get(integration.destination.endpointId);
    const connection = this.connections.get(integration.destination.connectionId);
    
    if (!endpoint || !connection) {
      throw new Error('Endpoint or connection not found');
    }

    // Check trigger conditions
    if (integration.trigger.type === 'automatic' && integration.trigger.conditions) {
      const shouldExecute = this.evaluateConditions(integration.trigger.conditions, data);
      if (!shouldExecute) {
        this.logger.info('Integration conditions not met', { integrationId });
        return [];
      }
    }

    const apiCalls: APICall[] = [];
    const sourceData = data || await this.getSourceData(integration.source);

    try {
      // Transform data according to field mappings
      const transformedData = this.transformData(sourceData, integration.destination.dataMapping);
      
      // Make API call
      const apiCall = await this.makeEndpointCall(endpoint, connection, transformedData);
      apiCalls.push(apiCall);

      // Update integration statistics
      integration.metadata.totalExecutions++;
      integration.metadata.lastExecuted = new Date().toISOString();
      
      if (apiCall.success) {
        integration.metadata.successfulExecutions++;
      } else {
        integration.metadata.failedExecutions++;
      }

      this.integrations.set(integrationId, integration);

      this.logger.info('Integration executed', { 
        integrationId, 
        success: apiCall.success,
        totalExecutions: integration.metadata.totalExecutions
      });
      
      this.emit('integration_executed', { integrationId, apiCall });

    } catch (error: any) {
      integration.metadata.totalExecutions++;
      integration.metadata.failedExecutions++;
      integration.metadata.lastExecuted = new Date().toISOString();
      this.integrations.set(integrationId, integration);

      this.logger.error('Integration execution failed', { integrationId, error });
      this.emit('integration_failed', { integrationId, error });
    }

    return apiCalls;
  }

  public updateIntegration(integrationId: string, updates: Partial<APIIntegration>): boolean {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      return false;
    }

    const updatedIntegration = {
      ...integration,
      ...updates,
      metadata: {
        ...integration.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.integrations.set(integrationId, updatedIntegration);
    this.logger.info('API integration updated', { integrationId, name: updatedIntegration.name });
    this.emit('integration_updated', updatedIntegration);

    return true;
  }

  public deleteIntegration(integrationId: string): boolean {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      return false;
    }

    this.integrations.delete(integrationId);
    this.logger.info('API integration deleted', { integrationId, name: integration.name });
    this.emit('integration_deleted', integrationId);

    return true;
  }

  public getIntegration(integrationId: string): APIIntegration | null {
    return this.integrations.get(integrationId) || null;
  }

  public getAllIntegrations(): APIIntegration[] {
    return Array.from(this.integrations.values());
  }

  // API Call Execution

  private async makeEndpointCall(endpoint: APIEndpoint, connection: APIConnection, parameters: any): Promise<APICall> {
    const startTime = Date.now();
    const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Check rate limits
    if (connection.configuration.rateLimit.enabled) {
      const rateLimiter = this.rateLimiters.get(connection.id);
      if (rateLimiter && !rateLimiter.canMakeRequest()) {
        throw new Error('Rate limit exceeded');
      }
    }

    // Build URL with parameters
    const url = this.buildUrl(connection.configuration.baseUrl, endpoint.path, parameters);
    
    // Prepare headers
    const headers = {
      ...connection.configuration.headers,
      ...endpoint.headers,
      ...this.getAuthHeaders(connection.authentication)
    };

    // Prepare request body
    const requestBody = endpoint.requestBody || parameters;

    try {
      const response = await this.makeRequest(connection, endpoint.method, url, headers, requestBody);
      
      const apiCall: APICall = {
        id: callId,
        endpointId: endpoint.id,
        connectionId: connection.id,
        timestamp: new Date().toISOString(),
        method: endpoint.method,
        url,
        headers,
        parameters,
        requestBody,
        response: {
          statusCode: response.statusCode,
          headers: response.headers,
          body: response.body,
          size: JSON.stringify(response.body).length
        },
        duration: Date.now() - startTime,
        success: response.success,
        error: response.error,
        metadata: {
          userAgent: 'GoogleFormAutoFillTool/1.0',
          ipAddress: '127.0.0.1',
          retryCount: 0
        }
      };

      // Store API call
      this.apiCalls.set(callId, apiCall);

      // Update statistics
      this.updateStatistics(endpoint, connection, apiCall);

      return apiCall;

    } catch (error: any) {
      const apiCall: APICall = {
        id: callId,
        endpointId: endpoint.id,
        connectionId: connection.id,
        timestamp: new Date().toISOString(),
        method: endpoint.method,
        url,
        headers,
        parameters,
        requestBody,
        response: {
          statusCode: 0,
          headers: {},
          body: null,
          size: 0
        },
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        metadata: {
          userAgent: 'GoogleFormAutoFillTool/1.0',
          ipAddress: '127.0.0.1',
          retryCount: 0
        }
      };

      this.apiCalls.set(callId, apiCall);
      this.updateStatistics(endpoint, connection, apiCall);

      return apiCall;
    }
  }

  private async makeRequest(connection: APIConnection, method: string, url: string, headers: any, body?: any): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), connection.configuration.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseBody = await response.json();

      return {
        success: response.ok,
        statusCode: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        error: response.ok ? undefined : responseBody.message || 'Request failed'
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  private buildUrl(baseUrl: string, path: string, parameters: any): string {
    const url = new URL(path, baseUrl);
    
    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    return url.toString();
  }

  private getAuthHeaders(authentication: APIAuthentication): { [key: string]: string } {
    const headers: { [key: string]: string } = {};

    switch (authentication.type) {
      case 'api_key':
        if (authentication.credentials.apiKey) {
          headers['X-API-Key'] = authentication.credentials.apiKey;
        }
        break;
      case 'bearer_token':
        if (authentication.credentials.token) {
          headers['Authorization'] = `Bearer ${authentication.credentials.token}`;
        }
        break;
      case 'basic_auth':
        if (authentication.credentials.username && authentication.credentials.password) {
          const credentials = btoa(`${authentication.credentials.username}:${authentication.credentials.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'custom':
        if (authentication.credentials.customHeaders) {
          Object.assign(headers, authentication.credentials.customHeaders);
        }
        break;
    }

    return headers;
  }

  private transformData(data: any, fieldMappings: FieldMapping[]): any {
    const transformed: any = {};

    fieldMappings.forEach(mapping => {
      let value = this.getValueFromPath(data, mapping.source);
      
      if (mapping.type === 'transform' && mapping.transform) {
        try {
          // Use safer evaluation with restricted context
          const transformFunction = new Function('value', 'data', `
            "use strict";
            try {
              return (${mapping.transform})(value, data);
            } catch (e) {
              throw new Error('Transform execution failed: ' + e.message);
            }
          `);
          value = transformFunction(value, data);
        } catch (error) {
          this.logger.warn('Transform function failed', { mapping, error });
        }
      }

      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      this.setValueAtPath(transformed, mapping.target, value);
    });

    return transformed;
  }

  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private async getSourceData(source: APIIntegration['source']): Promise<any> {
    // This would fetch data from the source system
    // For now, return empty object
    return {};
  }

  private evaluateConditions(conditions: string, data: any): boolean {
    try {
      // Use safer evaluation with restricted context
      const conditionFunction = new Function('data', `
        "use strict";
        try {
          return (${conditions})(data);
        } catch (e) {
          throw new Error('Condition evaluation failed: ' + e.message);
        }
      `);
      return conditionFunction(data);
    } catch (error) {
      this.logger.warn('Condition evaluation failed', { conditions, error });
      return false;
    }
  }

  private updateStatistics(endpoint: APIEndpoint, connection: APIConnection, apiCall: APICall): void {
    // Update endpoint statistics
    endpoint.metadata.totalCalls++;
    endpoint.metadata.lastUsed = apiCall.timestamp;
    
    if (apiCall.success) {
      endpoint.metadata.successfulCalls++;
    } else {
      endpoint.metadata.failedCalls++;
    }

    // Update average response time
    const totalTime = endpoint.metadata.averageResponseTime * (endpoint.metadata.totalCalls - 1) + apiCall.duration;
    endpoint.metadata.averageResponseTime = totalTime / endpoint.metadata.totalCalls;

    this.endpoints.set(endpoint.id, endpoint);

    // Update connection statistics
    connection.metadata.totalRequests++;
    connection.metadata.lastUsed = apiCall.timestamp;
    
    if (apiCall.success) {
      connection.metadata.successfulRequests++;
    } else {
      connection.metadata.failedRequests++;
    }

    this.connections.set(connection.id, connection);
  }

  // Analytics

  public getAnalytics(): APIAnalytics {
    const connections = Array.from(this.connections.values());
    const endpoints = Array.from(this.endpoints.values());
    const integrations = Array.from(this.integrations.values());
    const apiCalls = Array.from(this.apiCalls.values());

    const totalCalls = apiCalls.length;
    const successfulCalls = apiCalls.filter(call => call.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const averageResponseTime = apiCalls.reduce((sum, call) => sum + call.duration, 0) / totalCalls || 0;

    const topEndpoints = endpoints
      .map(endpoint => ({
        endpointId: endpoint.id,
        name: endpoint.name,
        calls: endpoint.metadata.totalCalls
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    const recentCalls = apiCalls
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.status === 'active').length,
      totalEndpoints: endpoints.length,
      totalIntegrations: integrations.length,
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      errorRate: totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0,
      topEndpoints,
      recentCalls,
      errorTrends: this.calculateErrorTrends(apiCalls)
    };
  }

  private calculateErrorTrends(apiCalls: APICall[]): { date: string; errors: number }[] {
    const trends: { [date: string]: number } = {};
    
    apiCalls.forEach(call => {
      if (!call.success) {
        const date = new Date(call.timestamp).toISOString().split('T')[0];
        trends[date] = (trends[date] || 0) + 1;
      }
    });

    return Object.entries(trends)
      .map(([date, errors]) => ({ date, errors }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Utility Methods

  public getAPICall(callId: string): APICall | null {
    return this.apiCalls.get(callId) || null;
  }

  public getAPICallsByEndpoint(endpointId: string, limit: number = 100): APICall[] {
    return Array.from(this.apiCalls.values())
      .filter(call => call.endpointId === endpointId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public getAPICallsByConnection(connectionId: string, limit: number = 100): APICall[] {
    return Array.from(this.apiCalls.values())
      .filter(call => call.connectionId === connectionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Export/Import

  public exportAPIData(): string {
    const data = {
      connections: Array.from(this.connections.values()),
      endpoints: Array.from(this.endpoints.values()),
      integrations: Array.from(this.integrations.values()),
      apiCalls: Array.from(this.apiCalls.values()).slice(-1000) // Last 1000 calls
    };

    return JSON.stringify(data, null, 2);
  }

  public importAPIData(data: string): boolean {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.connections) {
        for (const connection of parsedData.connections) {
          this.connections.set(connection.id, connection);
        }
      }

      if (parsedData.endpoints) {
        for (const endpoint of parsedData.endpoints) {
          this.endpoints.set(endpoint.id, endpoint);
        }
      }

      if (parsedData.integrations) {
        for (const integration of parsedData.integrations) {
          this.integrations.set(integration.id, integration);
        }
      }

      if (parsedData.apiCalls) {
        for (const apiCall of parsedData.apiCalls) {
          this.apiCalls.set(apiCall.id, apiCall);
        }
      }

      this.logger.info('API data imported successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import API data', error);
      return false;
    }
  }
}

// Rate Limiter Helper Class
class RateLimiter {
  private requests: number[] = [];
  private requestsPerMinute: number;
  private requestsPerHour: number;
  private requestsPerDay: number;

  constructor(rateLimit: { requestsPerMinute: number; requestsPerHour: number; requestsPerDay: number }) {
    this.requestsPerMinute = rateLimit.requestsPerMinute;
    this.requestsPerHour = rateLimit.requestsPerHour;
    this.requestsPerDay = rateLimit.requestsPerDay;
  }

  public canMakeRequest(): boolean {
    const now = Date.now();
    
    // Clean old requests
    this.requests = this.requests.filter(time => now - time < 24 * 60 * 60 * 1000); // Keep last 24 hours
    
    // Check limits
    const lastMinute = this.requests.filter(time => now - time < 60 * 1000).length;
    const lastHour = this.requests.filter(time => now - time < 60 * 60 * 1000).length;
    const lastDay = this.requests.length;

    if (lastMinute >= this.requestsPerMinute || 
        lastHour >= this.requestsPerHour || 
        lastDay >= this.requestsPerDay) {
      return false;
    }

    // Record this request
    this.requests.push(now);
    return true;
  }
}
