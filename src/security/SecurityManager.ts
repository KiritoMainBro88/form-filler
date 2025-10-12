import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface SecurityConfig {
  antiDetection: {
    enabled: boolean;
    stealthMode: boolean;
    userAgentRotation: boolean;
    proxyRotation: boolean;
    fingerprintMasking: boolean;
    behaviorSimulation: boolean;
  };
  delays: {
    minDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    randomizeDelays: boolean;
    humanLikeTiming: boolean;
  };
  headers: {
    rotateHeaders: boolean;
    customHeaders: { [key: string]: string };
    removeTrackingHeaders: boolean;
  };
  network: {
    useProxies: boolean;
    proxyList: string[];
    rotateProxies: boolean;
    dnsOverHttps: boolean;
    tlsFingerprinting: boolean;
  };
  browser: {
    disableImages: boolean;
    disableJavaScript: boolean;
    disablePlugins: boolean;
    disableWebGL: boolean;
    disableCanvas: boolean;
    disableWebRTC: boolean;
    disableGeolocation: boolean;
    disableNotifications: boolean;
  };
  monitoring: {
    enableMonitoring: boolean;
    alertThreshold: number;
    blockThreshold: number;
    cooldownPeriod: number; // minutes
  };
}

export interface SecurityEvent {
  id: string;
  type: 'detection' | 'block' | 'suspicious' | 'error' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  source: string;
  description: string;
  details: any;
  resolved: boolean;
  resolvedAt?: number;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    formUrl?: string;
    sessionId?: string;
  };
}

export interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  detectedRequests: number;
  suspiciousRequests: number;
  errorRequests: number;
  successRate: number;
  averageResponseTime: number;
  lastIncident: string;
  uptime: number;
  securityScore: number; // 0-100
}

export interface ThreatIntelligence {
  id: string;
  type: 'ip' | 'domain' | 'user_agent' | 'fingerprint' | 'pattern';
  value: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
  description: string;
  mitigation: string;
  metadata: {
    country?: string;
    isp?: string;
    organization?: string;
    tags: string[];
  };
}

export interface SecurityProfile {
  id: string;
  name: string;
  description: string;
  config: SecurityConfig;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  successRate: number;
  metadata: {
    createdBy: string;
    lastUsed?: string;
    tags: string[];
  };
}

export interface SecurityAudit {
  id: string;
  timestamp: number;
  type: 'full' | 'quick' | 'targeted';
  status: 'running' | 'completed' | 'failed';
  results: {
    vulnerabilities: number;
    threats: number;
    recommendations: number;
    score: number;
  };
  details: {
    vulnerabilities: SecurityVulnerability[];
    threats: ThreatIntelligence[];
    recommendations: SecurityRecommendation[];
  };
  metadata: {
    duration: number;
    scannedItems: number;
    errors: number;
  };
}

export interface SecurityVulnerability {
  id: string;
  type: 'configuration' | 'network' | 'browser' | 'behavioral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  remediation: string;
  references: string[];
  metadata: {
    cve?: string;
    cvss?: number;
    discovered: number;
    lastUpdated: number;
  };
}

export interface SecurityRecommendation {
  id: string;
  type: 'configuration' | 'monitoring' | 'response' | 'prevention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  implementation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedImprovement: number; // percentage
  metadata: {
    createdAt: string;
    appliedAt?: string;
    appliedBy?: string;
    status: 'pending' | 'applied' | 'rejected' | 'expired';
  };
}

export class SecurityManager extends EventEmitter {
  private logger: Logger;
  private config: SecurityConfig;
  private profiles: Map<string, SecurityProfile> = new Map();
  private events: Map<string, SecurityEvent> = new Map();
  private threats: Map<string, ThreatIntelligence> = new Map();
  private audits: Map<string, SecurityAudit> = new Map();
  private recommendations: Map<string, SecurityRecommendation> = new Map();
  private metrics: SecurityMetrics;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private blockedIPs: Set<string> = new Set();
  private suspiciousPatterns: Map<string, number> = new Map();

  constructor() {
    super();
    this.logger = new Logger();
    this.config = this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
    this.initializeBuiltInProfiles();
    this.startMonitoring();
  }

  private getDefaultConfig(): SecurityConfig {
    return {
      antiDetection: {
        enabled: true,
        stealthMode: true,
        userAgentRotation: true,
        proxyRotation: false,
        fingerprintMasking: true,
        behaviorSimulation: true
      },
      delays: {
        minDelay: 1000,
        maxDelay: 5000,
        randomizeDelays: true,
        humanLikeTiming: true
      },
      headers: {
        rotateHeaders: true,
        customHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        removeTrackingHeaders: true
      },
      network: {
        useProxies: false,
        proxyList: [],
        rotateProxies: false,
        dnsOverHttps: true,
        tlsFingerprinting: true
      },
      browser: {
        disableImages: false,
        disableJavaScript: false,
        disablePlugins: true,
        disableWebGL: true,
        disableCanvas: true,
        disableWebRTC: true,
        disableGeolocation: true,
        disableNotifications: true
      },
      monitoring: {
        enableMonitoring: true,
        alertThreshold: 5,
        blockThreshold: 10,
        cooldownPeriod: 30
      }
    };
  }

  private initializeMetrics(): SecurityMetrics {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      detectedRequests: 0,
      suspiciousRequests: 0,
      errorRequests: 0,
      successRate: 100,
      averageResponseTime: 0,
      lastIncident: '',
      uptime: Date.now(),
      securityScore: 100
    };
  }

  private initializeBuiltInProfiles(): void {
    // High Security Profile
    const highSecurityProfile: SecurityProfile = {
      id: 'high-security',
      name: 'High Security',
      description: 'Maximum security with strict anti-detection measures',
      config: {
        ...this.config,
        antiDetection: {
          enabled: true,
          stealthMode: true,
          userAgentRotation: true,
          proxyRotation: true,
          fingerprintMasking: true,
          behaviorSimulation: true
        },
        delays: {
          minDelay: 2000,
          maxDelay: 8000,
          randomizeDelays: true,
          humanLikeTiming: true
        },
        browser: {
          disableImages: true,
          disableJavaScript: false,
          disablePlugins: true,
          disableWebGL: true,
          disableCanvas: true,
          disableWebRTC: true,
          disableGeolocation: true,
          disableNotifications: true
        }
      },
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 100,
      metadata: {
        createdBy: 'system',
        tags: ['security', 'high', 'stealth']
      }
    };

    // Balanced Profile
    const balancedProfile: SecurityProfile = {
      id: 'balanced',
      name: 'Balanced',
      description: 'Balanced security and performance',
      config: this.config,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 100,
      metadata: {
        createdBy: 'system',
        tags: ['security', 'balanced', 'performance']
      }
    };

    // Performance Profile
    const performanceProfile: SecurityProfile = {
      id: 'performance',
      name: 'Performance',
      description: 'Optimized for speed with basic security',
      config: {
        ...this.config,
        antiDetection: {
          enabled: true,
          stealthMode: false,
          userAgentRotation: false,
          proxyRotation: false,
          fingerprintMasking: false,
          behaviorSimulation: false
        },
        delays: {
          minDelay: 500,
          maxDelay: 2000,
          randomizeDelays: false,
          humanLikeTiming: false
        }
      },
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 100,
      metadata: {
        createdBy: 'system',
        tags: ['performance', 'speed', 'basic']
      }
    };

    this.profiles.set(highSecurityProfile.id, highSecurityProfile);
    this.profiles.set(balancedProfile.id, balancedProfile);
    this.profiles.set(performanceProfile.id, performanceProfile);
  }

  // Security Monitoring

  public startMonitoring(): void {
    if (this.isMonitoring || !this.config.monitoring.enableMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateSecurityMetrics();
      this.checkThreats();
      this.analyzePatterns();
    }, 60000); // Check every minute

    this.logger.info('Security monitoring started');
    this.emit('monitoring_started');
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info('Security monitoring stopped');
    this.emit('monitoring_stopped');
  }

  private updateSecurityMetrics(): void {
    // Update security score based on recent events
    const recentEvents = Array.from(this.events.values())
      .filter(event => Date.now() - event.timestamp < 3600000); // Last hour

    const criticalEvents = recentEvents.filter(event => event.severity === 'critical').length;
    const highEvents = recentEvents.filter(event => event.severity === 'high').length;
    const mediumEvents = recentEvents.filter(event => event.severity === 'medium').length;

    // Calculate security score (0-100)
    this.metrics.securityScore = Math.max(0, 100 - (criticalEvents * 20) - (highEvents * 10) - (mediumEvents * 5));
    this.metrics.lastIncident = recentEvents.length > 0 ? new Date(Math.max(...recentEvents.map(e => e.timestamp))).toISOString() : '';

    this.emit('metrics_updated', this.metrics);
  }

  private checkThreats(): void {
    // Check for known threats
    const recentEvents = Array.from(this.events.values())
      .filter(event => Date.now() - event.timestamp < 300000); // Last 5 minutes

    // Group events by IP address
    const ipEvents = new Map<string, SecurityEvent[]>();
    recentEvents.forEach(event => {
      if (event.metadata.ipAddress) {
        const ip = event.metadata.ipAddress;
        if (!ipEvents.has(ip)) {
          ipEvents.set(ip, []);
        }
        ipEvents.get(ip)!.push(event);
      }
    });

    // Check for suspicious patterns
    ipEvents.forEach((events, ip) => {
      if (events.length >= this.config.monitoring.alertThreshold) {
        this.createSecurityEvent('suspicious', 'medium', 'Suspicious Activity Detected', 
          `Multiple security events from IP ${ip}`, { ip, eventCount: events.length });
      }

      if (events.length >= this.config.monitoring.blockThreshold) {
        this.blockIP(ip);
        this.createSecurityEvent('block', 'high', 'IP Blocked', 
          `IP ${ip} blocked due to excessive security events`, { ip, eventCount: events.length });
      }
    });
  }

  private analyzePatterns(): void {
    // Analyze patterns in security events
    const recentEvents = Array.from(this.events.values())
      .filter(event => Date.now() - event.timestamp < 3600000); // Last hour

    // Check for repeated patterns
    const patterns = new Map<string, number>();
    recentEvents.forEach(event => {
      const pattern = `${event.type}:${event.source}`;
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    // Update suspicious patterns
    patterns.forEach((count, pattern) => {
      if (count > 5) {
        this.suspiciousPatterns.set(pattern, count);
        this.createSecurityEvent('suspicious', 'medium', 'Suspicious Pattern Detected', 
          `Pattern ${pattern} occurred ${count} times`, { pattern, count });
      }
    });
  }

  // Security Event Management

  public createSecurityEvent(type: string, severity: string, description: string, details: any, metadata?: any): string {
    const eventId = `security-event-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const event: SecurityEvent = {
      id: eventId,
      type: type as any,
      severity: severity as any,
      timestamp: Date.now(),
      source: 'security-manager',
      description,
      details,
      resolved: false,
      metadata: metadata || {}
    };

    this.events.set(eventId, event);
    this.logger.warn('Security event created', { eventId, type, severity, description });
    this.emit('security_event', event);

    return eventId;
  }

  public resolveSecurityEvent(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (!event) {
      return false;
    }

    event.resolved = true;
    event.resolvedAt = Date.now();
    this.events.set(eventId, event);

    this.logger.info('Security event resolved', { eventId });
    this.emit('security_event_resolved', event);

    return true;
  }

  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  public getSecurityEvent(eventId: string): SecurityEvent | null {
    return this.events.get(eventId) || null;
  }

  // Threat Intelligence

  public addThreatIntelligence(threat: Omit<ThreatIntelligence, 'id' | 'firstSeen' | 'lastSeen' | 'occurrences'>): string {
    const threatId = `threat-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const newThreat: ThreatIntelligence = {
      ...threat,
      id: threatId,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      occurrences: 1
    };

    this.threats.set(threatId, newThreat);
    this.logger.info('Threat intelligence added', { threatId, type: threat.type, value: threat.value });
    this.emit('threat_added', newThreat);

    return threatId;
  }

  public updateThreatIntelligence(threatId: string): boolean {
    const threat = this.threats.get(threatId);
    if (!threat) {
      return false;
    }

    threat.lastSeen = Date.now();
    threat.occurrences++;
    this.threats.set(threatId, threat);

    this.logger.info('Threat intelligence updated', { threatId, occurrences: threat.occurrences });
    this.emit('threat_updated', threat);

    return true;
  }

  public checkThreatIntelligence(value: string, type: string): ThreatIntelligence | null {
    const threat = Array.from(this.threats.values()).find(t => 
      t.value === value && t.type === type
    );

    if (threat) {
      this.updateThreatIntelligence(threat.id);
      return threat;
    }

    return null;
  }

  public getThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threats.values());
  }

  // IP Blocking

  public blockIP(ipAddress: string, reason?: string): void {
    this.blockedIPs.add(ipAddress);
    this.logger.warn('IP blocked', { ipAddress, reason });
    this.emit('ip_blocked', { ipAddress, reason });
  }

  public unblockIP(ipAddress: string): void {
    this.blockedIPs.delete(ipAddress);
    this.logger.info('IP unblocked', { ipAddress });
    this.emit('ip_unblocked', { ipAddress });
  }

  public isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  public getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  // Security Profiles

  public createSecurityProfile(profile: Omit<SecurityProfile, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'successRate'>): SecurityProfile {
    const newProfile: SecurityProfile = {
      ...profile,
      id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 100
    };

    this.profiles.set(newProfile.id, newProfile);
    this.logger.info('Security profile created', { profileId: newProfile.id, name: newProfile.name });
    this.emit('profile_created', newProfile);

    return newProfile;
  }

  public activateSecurityProfile(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      return false;
    }

    // Deactivate current active profile
    Array.from(this.profiles.values()).forEach(p => {
      if (p.isActive) {
        p.isActive = false;
        this.profiles.set(p.id, p);
      }
    });

    // Activate new profile
    profile.isActive = true;
    profile.usageCount++;
    profile.metadata.lastUsed = new Date().toISOString();
    this.profiles.set(profileId, profile);

    // Update current config
    this.config = profile.config;

    this.logger.info('Security profile activated', { profileId, name: profile.name });
    this.emit('profile_activated', profile);

    return true;
  }

  public getSecurityProfile(profileId: string): SecurityProfile | null {
    return this.profiles.get(profileId) || null;
  }

  public getAllSecurityProfiles(): SecurityProfile[] {
    return Array.from(this.profiles.values());
  }

  public getActiveSecurityProfile(): SecurityProfile | null {
    return Array.from(this.profiles.values()).find(p => p.isActive) || null;
  }

  // Security Audits

  public async runSecurityAudit(type: 'full' | 'quick' | 'targeted' = 'quick'): Promise<string> {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    const audit: SecurityAudit = {
      id: auditId,
      timestamp: startTime,
      type,
      status: 'running',
      results: {
        vulnerabilities: 0,
        threats: 0,
        recommendations: 0,
        score: 0
      },
      details: {
        vulnerabilities: [],
        threats: [],
        recommendations: []
      },
      metadata: {
        duration: 0,
        scannedItems: 0,
        errors: 0
      }
    };

    this.audits.set(auditId, audit);
    this.emit('audit_started', audit);

    try {
      // Run security checks based on type
      if (type === 'full' || type === 'quick') {
        await this.checkConfigurationVulnerabilities(audit);
        await this.checkNetworkSecurity(audit);
        await this.checkBrowserSecurity(audit);
      }

      if (type === 'full' || type === 'targeted') {
        await this.checkBehavioralPatterns(audit);
        await this.checkThreatIntelligence(audit);
      }

      // Calculate final score
      audit.results.score = this.calculateSecurityScore(audit);
      audit.status = 'completed';
      audit.metadata.duration = Date.now() - startTime;

      this.audits.set(auditId, audit);
      this.logger.info('Security audit completed', { auditId, score: audit.results.score });
      this.emit('audit_completed', audit);

    } catch (error: any) {
      audit.status = 'failed';
      audit.metadata.duration = Date.now() - startTime;
      audit.metadata.errors = 1;

      this.audits.set(auditId, audit);
      this.logger.error('Security audit failed', { auditId, error });
      this.emit('audit_failed', audit);
    }

    return auditId;
  }

  private async checkConfigurationVulnerabilities(audit: SecurityAudit): Promise<void> {
    // Check for configuration vulnerabilities
    if (!this.config.antiDetection.enabled) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-1`,
        type: 'configuration',
        severity: 'high',
        title: 'Anti-Detection Disabled',
        description: 'Anti-detection measures are disabled',
        impact: 'High risk of detection and blocking',
        remediation: 'Enable anti-detection measures',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }

    if (this.config.delays.minDelay < 500) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-2`,
        type: 'configuration',
        severity: 'medium',
        title: 'Low Delay Configuration',
        description: 'Minimum delay is too low, may trigger rate limiting',
        impact: 'Risk of rate limiting and detection',
        remediation: 'Increase minimum delay to at least 500ms',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }

    audit.results.vulnerabilities = audit.details.vulnerabilities.length;
  }

  private async checkNetworkSecurity(audit: SecurityAudit): Promise<void> {
    // Check network security configuration
    if (!this.config.network.dnsOverHttps) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-3`,
        type: 'network',
        severity: 'medium',
        title: 'DNS Over HTTPS Disabled',
        description: 'DNS queries are not encrypted',
        impact: 'DNS queries can be monitored and blocked',
        remediation: 'Enable DNS over HTTPS',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }

    if (!this.config.network.tlsFingerprinting) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-4`,
        type: 'network',
        severity: 'low',
        title: 'TLS Fingerprinting Disabled',
        description: 'TLS fingerprinting is not enabled',
        impact: 'TLS fingerprint may be detected',
        remediation: 'Enable TLS fingerprinting',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }
  }

  private async checkBrowserSecurity(audit: SecurityAudit): Promise<void> {
    // Check browser security configuration
    if (!this.config.browser.disableWebGL) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-5`,
        type: 'browser',
        severity: 'medium',
        title: 'WebGL Enabled',
        description: 'WebGL is enabled, may expose hardware fingerprint',
        impact: 'Hardware fingerprint can be used for tracking',
        remediation: 'Disable WebGL',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }

    if (!this.config.browser.disableCanvas) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-6`,
        type: 'browser',
        severity: 'medium',
        title: 'Canvas Enabled',
        description: 'Canvas is enabled, may expose canvas fingerprint',
        impact: 'Canvas fingerprint can be used for tracking',
        remediation: 'Disable Canvas',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }
  }

  private async checkBehavioralPatterns(audit: SecurityAudit): Promise<void> {
    // Check for behavioral patterns that may indicate detection
    const recentEvents = Array.from(this.events.values())
      .filter(event => Date.now() - event.timestamp < 3600000); // Last hour

    if (recentEvents.length > 50) {
      audit.details.vulnerabilities.push({
        id: `vuln-${Date.now()}-7`,
        type: 'behavioral',
        severity: 'high',
        title: 'High Event Frequency',
        description: 'High frequency of security events detected',
        impact: 'May indicate detection or blocking attempts',
        remediation: 'Review and adjust security configuration',
        references: [],
        metadata: {
          discovered: Date.now(),
          lastUpdated: Date.now()
        }
      });
    }
  }

  private async checkThreatIntelligence(audit: SecurityAudit): Promise<void> {
    // Check threat intelligence database
    const threats = Array.from(this.threats.values());
    audit.details.threats = threats;
    audit.results.threats = threats.length;
  }

  private calculateSecurityScore(audit: SecurityAudit): number {
    let score = 100;

    // Deduct points for vulnerabilities
    audit.details.vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Deduct points for threats
    audit.details.threats.forEach(threat => {
      switch (threat.threatLevel) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  // Security Recommendations

  public generateSecurityRecommendations(): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // Check current configuration and generate recommendations
    if (!this.config.antiDetection.stealthMode) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        type: 'configuration',
        priority: 'high',
        title: 'Enable Stealth Mode',
        description: 'Stealth mode provides additional protection against detection',
        implementation: 'Set antiDetection.stealthMode to true',
        impact: 'Reduces detection risk by 40-60%',
        effort: 'low',
        estimatedImprovement: 50,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    if (this.config.delays.minDelay < 1000) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        type: 'configuration',
        priority: 'medium',
        title: 'Increase Minimum Delay',
        description: 'Minimum delay is too low, may trigger rate limiting',
        implementation: 'Set delays.minDelay to at least 1000ms',
        impact: 'Reduces rate limiting risk by 30-50%',
        effort: 'low',
        estimatedImprovement: 40,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    if (!this.config.browser.disableWebGL) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        type: 'configuration',
        priority: 'medium',
        title: 'Disable WebGL',
        description: 'WebGL can expose hardware fingerprint',
        implementation: 'Set browser.disableWebGL to true',
        impact: 'Reduces fingerprinting risk by 20-30%',
        effort: 'low',
        estimatedImprovement: 25,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    return recommendations;
  }

  // Configuration Management

  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Security configuration updated');
    this.emit('config_updated', this.config);
  }

  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  // Analytics and Reporting

  public getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  public getSecurityAudit(auditId: string): SecurityAudit | null {
    return this.audits.get(auditId) || null;
  }

  public getAllSecurityAudits(): SecurityAudit[] {
    return Array.from(this.audits.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public getSecurityRecommendations(): SecurityRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  // Export/Import

  public exportSecurityData(): string {
    const data = {
      config: this.config,
      profiles: Array.from(this.profiles.values()),
      events: Array.from(this.events.values()).slice(-1000), // Last 1000 events
      threats: Array.from(this.threats.values()),
      audits: Array.from(this.audits.values()),
      recommendations: Array.from(this.recommendations.values()),
      metrics: this.metrics
    };

    return JSON.stringify(data, null, 2);
  }

  public importSecurityData(data: string): boolean {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.config) {
        this.config = parsedData.config;
      }

      if (parsedData.profiles) {
        for (const profile of parsedData.profiles) {
          this.profiles.set(profile.id, profile);
        }
      }

      if (parsedData.events) {
        for (const event of parsedData.events) {
          this.events.set(event.id, event);
        }
      }

      if (parsedData.threats) {
        for (const threat of parsedData.threats) {
          this.threats.set(threat.id, threat);
        }
      }

      if (parsedData.audits) {
        for (const audit of parsedData.audits) {
          this.audits.set(audit.id, audit);
        }
      }

      if (parsedData.recommendations) {
        for (const recommendation of parsedData.recommendations) {
          this.recommendations.set(recommendation.id, recommendation);
        }
      }

      if (parsedData.metrics) {
        this.metrics = parsedData.metrics;
      }

      this.logger.info('Security data imported successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import security data', error);
      return false;
    }
  }
}
