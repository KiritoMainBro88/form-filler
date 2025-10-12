import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { FormConfiguration } from '../types';
import { FormTemplate } from '../templates/FormTemplates';
import { BatchJob } from '../batch/BatchProcessor';
import { ScheduledTask } from '../scheduling/Scheduler';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: TeamPermissions;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  joinedAt: string;
  lastActive: string;
  metadata: {
    invitedBy: string;
    invitationToken?: string;
    invitationExpires?: string;
    notes?: string;
  };
}

export interface TeamPermissions {
  configurations: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    share: boolean;
  };
  templates: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    share: boolean;
  };
  batchJobs: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    execute: boolean;
  };
  scheduledTasks: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    execute: boolean;
  };
  team: {
    inviteMembers: boolean;
    removeMembers: boolean;
    updateRoles: boolean;
    viewAnalytics: boolean;
    manageSettings: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  settings: TeamSettings;
  members: Map<string, TeamMember>;
  invitations: Map<string, TeamInvitation>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    totalMembers: number;
    totalConfigurations: number;
    totalTemplates: number;
    totalBatchJobs: number;
    totalScheduledTasks: number;
  };
}

export interface TeamSettings {
  visibility: 'public' | 'private' | 'invite_only';
  defaultRole: 'member' | 'viewer';
  allowMemberInvites: boolean;
  requireApproval: boolean;
  maxMembers: number;
  retention: {
    configurations: number; // days
    templates: number; // days
    batchJobs: number; // days
    scheduledTasks: number; // days
    logs: number; // days
  };
  notifications: {
    memberJoined: boolean;
    memberLeft: boolean;
    configurationShared: boolean;
    templateShared: boolean;
    batchJobCompleted: boolean;
    scheduledTaskFailed: boolean;
  };
  security: {
    twoFactorRequired: boolean;
    sessionTimeout: number; // minutes
    ipWhitelist: string[];
    allowedDomains: string[];
  };
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  message?: string;
}

export interface SharedItem {
  id: string;
  type: 'configuration' | 'template' | 'batch_job' | 'scheduled_task';
  itemId: string;
  sharedBy: string;
  sharedAt: string;
  permissions: {
    read: boolean;
    update: boolean;
    delete: boolean;
    share: boolean;
  };
  accessLevel: 'team' | 'specific_members';
  members: string[]; // member IDs with access
  metadata: {
    name: string;
    description?: string;
    tags: string[];
    version: number;
  };
}

export interface TeamActivity {
  id: string;
  type: 'member_joined' | 'member_left' | 'configuration_shared' | 'template_shared' | 'batch_job_completed' | 'scheduled_task_failed' | 'permission_changed' | 'settings_updated';
  actor: string;
  target?: string;
  timestamp: string;
  description: string;
  metadata?: any;
}

export interface TeamStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  totalConfigurations: number;
  totalTemplates: number;
  totalBatchJobs: number;
  totalScheduledTasks: number;
  sharedItems: number;
  recentActivity: number;
  memberActivity: { [memberId: string]: number };
}

export class TeamManager extends EventEmitter {
  private logger: Logger;
  private teams: Map<string, Team> = new Map();
  private sharedItems: Map<string, SharedItem> = new Map();
  private activities: Map<string, TeamActivity> = new Map();
  private currentUser: string = 'current-user'; // This would be set from authentication

  constructor() {
    super();
    this.logger = new Logger();
  }

  // Team Management

  public createTeam(name: string, description?: string): Team {
    const team: Team = {
      id: `team-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      description,
      settings: this.getDefaultTeamSettings(),
      members: new Map(),
      invitations: new Map(),
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: this.currentUser,
        totalMembers: 0,
        totalConfigurations: 0,
        totalTemplates: 0,
        totalBatchJobs: 0,
        totalScheduledTasks: 0
      }
    };

    // Add creator as owner
    const owner: TeamMember = {
      id: this.currentUser,
      email: 'owner@example.com', // This would come from authentication
      name: 'Team Owner',
      role: 'owner',
      permissions: this.getOwnerPermissions(),
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      metadata: {
        invitedBy: 'system'
      }
    };

    team.members.set(this.currentUser, owner);
    team.metadata.totalMembers = 1;

    this.teams.set(team.id, team);
    this.logger.info('Team created', { teamId: team.id, name: team.name });
    
    this.emit('team_created', team);
    return team;
  }

  public updateTeam(teamId: string, updates: Partial<Team>): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    const updatedTeam = {
      ...team,
      ...updates,
      metadata: {
        ...team.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    this.teams.set(teamId, updatedTeam);
    this.logger.info('Team updated', { teamId, name: updatedTeam.name });
    
    this.emit('team_updated', updatedTeam);
    return true;
  }

  public deleteTeam(teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    // Check if user is owner
    const member = team.members.get(this.currentUser);
    if (!member || member.role !== 'owner') {
      throw new Error('Only team owners can delete teams');
    }

    this.teams.delete(teamId);
    this.logger.info('Team deleted', { teamId, name: team.name });
    
    this.emit('team_deleted', teamId);
    return true;
  }

  public getTeam(teamId: string): Team | null {
    return this.teams.get(teamId) || null;
  }

  public getAllTeams(): Team[] {
    return Array.from(this.teams.values());
  }

  public getUserTeams(): Team[] {
    return Array.from(this.teams.values()).filter(team => 
      team.members.has(this.currentUser)
    );
  }

  // Member Management

  public async inviteMember(teamId: string, email: string, role: 'admin' | 'member' | 'viewer', message?: string): Promise<TeamInvitation> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check permissions
    const currentMember = team.members.get(this.currentUser);
    if (!currentMember || !currentMember.permissions.team.inviteMembers) {
      throw new Error('Insufficient permissions to invite members');
    }

    // Check if member already exists
    const existingMember = Array.from(team.members.values()).find(member => member.email === email);
    if (existingMember) {
      throw new Error('Member already exists in team');
    }

    // Check if invitation already exists
    const existingInvitation = Array.from(team.invitations.values()).find(invitation => 
      invitation.email === email && invitation.status === 'pending'
    );
    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    const invitation: TeamInvitation = {
      id: `invitation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      email,
      role,
      invitedBy: this.currentUser,
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending',
      token: this.generateInvitationToken(),
      message
    };

    team.invitations.set(invitation.id, invitation);
    this.teams.set(teamId, team);

    this.logger.info('Member invited', { teamId, email, role });
    this.emit('member_invited', { teamId, invitation });

    // Record activity
    this.recordActivity(teamId, 'member_joined', this.currentUser, undefined, 
      `Invited ${email} to join the team as ${role}`);

    return invitation;
  }

  public async acceptInvitation(teamId: string, invitationToken: string): Promise<TeamMember> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const invitation = Array.from(team.invitations.values()).find(inv => 
      inv.token === invitationToken && inv.status === 'pending'
    );

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = 'expired';
      throw new Error('Invitation has expired');
    }

    // Create new member
    const member: TeamMember = {
      id: `member-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      email: invitation.email,
      name: invitation.email.split('@')[0], // This would come from user profile
      role: invitation.role,
      permissions: this.getRolePermissions(invitation.role),
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      metadata: {
        invitedBy: invitation.invitedBy
      }
    };

    team.members.set(member.id, member);
    team.metadata.totalMembers++;
    invitation.status = 'accepted';
    team.invitations.set(invitation.id, invitation);

    this.teams.set(teamId, team);

    this.logger.info('Invitation accepted', { teamId, memberId: member.id, email: member.email });
    this.emit('member_joined', { teamId, member });

    // Record activity
    this.recordActivity(teamId, 'member_joined', member.id, undefined, 
      `${member.email} joined the team`);

    return member;
  }

  public async removeMember(teamId: string, memberId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    // Check permissions
    const currentMember = team.members.get(this.currentUser);
    const targetMember = team.members.get(memberId);
    
    if (!currentMember || !targetMember) {
      return false;
    }

    if (!currentMember.permissions.team.removeMembers && currentMember.id !== memberId) {
      throw new Error('Insufficient permissions to remove members');
    }

    if (targetMember.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    team.members.delete(memberId);
    team.metadata.totalMembers--;
    this.teams.set(teamId, team);

    this.logger.info('Member removed', { teamId, memberId });
    this.emit('member_removed', { teamId, memberId });

    // Record activity
    this.recordActivity(teamId, 'member_left', this.currentUser, memberId, 
      `Removed ${targetMember.email} from the team`);

    return true;
  }

  public async updateMemberRole(teamId: string, memberId: string, newRole: 'admin' | 'member' | 'viewer'): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) {
      return false;
    }

    // Check permissions
    const currentMember = team.members.get(this.currentUser);
    const targetMember = team.members.get(memberId);
    
    if (!currentMember || !targetMember) {
      return false;
    }

    if (!currentMember.permissions.team.updateRoles) {
      throw new Error('Insufficient permissions to update roles');
    }

    if (targetMember.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    const oldRole = targetMember.role;
    targetMember.role = newRole;
    targetMember.permissions = this.getRolePermissions(newRole);
    team.members.set(memberId, targetMember);
    this.teams.set(teamId, team);

    this.logger.info('Member role updated', { teamId, memberId, oldRole, newRole });
    this.emit('member_role_updated', { teamId, memberId, oldRole, newRole });

    // Record activity
    this.recordActivity(teamId, 'permission_changed', this.currentUser, memberId, 
      `Changed ${targetMember.email}'s role from ${oldRole} to ${newRole}`);

    return true;
  }

  public getTeamMembers(teamId: string): TeamMember[] {
    const team = this.teams.get(teamId);
    if (!team) {
      return [];
    }
    return Array.from(team.members.values());
  }

  public getTeamInvitations(teamId: string): TeamInvitation[] {
    const team = this.teams.get(teamId);
    if (!team) {
      return [];
    }
    return Array.from(team.invitations.values());
  }

  // Item Sharing

  public async shareItem(teamId: string, item: { type: string; id: string; name: string; description?: string }, permissions: any, accessLevel: 'team' | 'specific_members', memberIds?: string[]): Promise<SharedItem> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check permissions
    const currentMember = team.members.get(this.currentUser);
    if (!currentMember) {
      throw new Error('Not a team member');
    }

    const sharedItem: SharedItem = {
      id: `shared-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: item.type as any,
      itemId: item.id,
      sharedBy: this.currentUser,
      sharedAt: new Date().toISOString(),
      permissions,
      accessLevel,
      members: accessLevel === 'specific_members' ? (memberIds || []) : Array.from(team.members.keys()),
      metadata: {
        name: item.name,
        description: item.description,
        tags: [],
        version: 1
      }
    };

    this.sharedItems.set(sharedItem.id, sharedItem);

    this.logger.info('Item shared', { teamId, itemId: item.id, sharedItemId: sharedItem.id });
    this.emit('item_shared', { teamId, sharedItem });

    // Record activity
    this.recordActivity(teamId, 'configuration_shared', this.currentUser, undefined, 
      `Shared ${item.type} "${item.name}" with the team`);

    return sharedItem;
  }

  public async unshareItem(sharedItemId: string): Promise<boolean> {
    const sharedItem = this.sharedItems.get(sharedItemId);
    if (!sharedItem) {
      return false;
    }

    // Check permissions
    if (sharedItem.sharedBy !== this.currentUser) {
      throw new Error('Only the sharer can unshare items');
    }

    this.sharedItems.delete(sharedItemId);

    this.logger.info('Item unshared', { sharedItemId });
    this.emit('item_unshared', { sharedItemId });

    return true;
  }

  public getSharedItems(teamId: string): SharedItem[] {
    return Array.from(this.sharedItems.values()).filter(item => 
      item.members.includes(this.currentUser)
    );
  }

  public getSharedItem(sharedItemId: string): SharedItem | null {
    const item = this.sharedItems.get(sharedItemId);
    if (!item || !item.members.includes(this.currentUser)) {
      return null;
    }
    return item;
  }

  // Activity Tracking

  private recordActivity(teamId: string, type: TeamActivity['type'], actor: string, target?: string, description?: string, metadata?: any): void {
    const activity: TeamActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type,
      actor,
      target,
      timestamp: new Date().toISOString(),
      description: description || `${type} activity`,
      metadata
    };

    this.activities.set(activity.id, activity);
    this.emit('activity_recorded', { teamId, activity });
  }

  public getTeamActivities(teamId: string, limit: number = 50): TeamActivity[] {
    return Array.from(this.activities.values())
      .filter(activity => {
        // Filter activities for this team (this would be more sophisticated in a real implementation)
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Statistics

  public getTeamStats(teamId: string): TeamStats {
    const team = this.teams.get(teamId);
    if (!team) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        pendingInvitations: 0,
        totalConfigurations: 0,
        totalTemplates: 0,
        totalBatchJobs: 0,
        totalScheduledTasks: 0,
        sharedItems: 0,
        recentActivity: 0,
        memberActivity: {}
      };
    }

    const members = Array.from(team.members.values());
    const invitations = Array.from(team.invitations.values());
    const sharedItems = Array.from(this.sharedItems.values()).filter(item => 
      item.members.includes(this.currentUser)
    );
    const activities = Array.from(this.activities.values());

    return {
      totalMembers: members.length,
      activeMembers: members.filter(m => m.status === 'active').length,
      pendingInvitations: invitations.filter(i => i.status === 'pending').length,
      totalConfigurations: team.metadata.totalConfigurations,
      totalTemplates: team.metadata.totalTemplates,
      totalBatchJobs: team.metadata.totalBatchJobs,
      totalScheduledTasks: team.metadata.totalScheduledTasks,
      sharedItems: sharedItems.length,
      recentActivity: activities.filter(a => 
        new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      memberActivity: this.calculateMemberActivity(teamId)
    };
  }

  private calculateMemberActivity(teamId: string): { [memberId: string]: number } {
    const activities = Array.from(this.activities.values());
    const memberActivity: { [memberId: string]: number } = {};

    activities.forEach(activity => {
      if (activity.actor) {
        memberActivity[activity.actor] = (memberActivity[activity.actor] || 0) + 1;
      }
    });

    return memberActivity;
  }

  // Utility Methods

  private getDefaultTeamSettings(): TeamSettings {
    return {
      visibility: 'private',
      defaultRole: 'member',
      allowMemberInvites: true,
      requireApproval: false,
      maxMembers: 50,
      retention: {
        configurations: 365,
        templates: 365,
        batchJobs: 90,
        scheduledTasks: 365,
        logs: 30
      },
      notifications: {
        memberJoined: true,
        memberLeft: true,
        configurationShared: true,
        templateShared: true,
        batchJobCompleted: true,
        scheduledTaskFailed: true
      },
      security: {
        twoFactorRequired: false,
        sessionTimeout: 480, // 8 hours
        ipWhitelist: [],
        allowedDomains: []
      }
    };
  }

  private getOwnerPermissions(): TeamPermissions {
    return {
      configurations: { create: true, read: true, update: true, delete: true, share: true },
      templates: { create: true, read: true, update: true, delete: true, share: true },
      batchJobs: { create: true, read: true, update: true, delete: true, execute: true },
      scheduledTasks: { create: true, read: true, update: true, delete: true, execute: true },
      team: { inviteMembers: true, removeMembers: true, updateRoles: true, viewAnalytics: true, manageSettings: true }
    };
  }

  private getRolePermissions(role: 'admin' | 'member' | 'viewer'): TeamPermissions {
    switch (role) {
      case 'admin':
        return {
          configurations: { create: true, read: true, update: true, delete: true, share: true },
          templates: { create: true, read: true, update: true, delete: true, share: true },
          batchJobs: { create: true, read: true, update: true, delete: true, execute: true },
          scheduledTasks: { create: true, read: true, update: true, delete: true, execute: true },
          team: { inviteMembers: true, removeMembers: true, updateRoles: false, viewAnalytics: true, manageSettings: false }
        };
      case 'member':
        return {
          configurations: { create: true, read: true, update: true, delete: false, share: true },
          templates: { create: true, read: true, update: true, delete: false, share: true },
          batchJobs: { create: true, read: true, update: true, delete: false, execute: true },
          scheduledTasks: { create: true, read: true, update: true, delete: false, execute: true },
          team: { inviteMembers: false, removeMembers: false, updateRoles: false, viewAnalytics: false, manageSettings: false }
        };
      case 'viewer':
        return {
          configurations: { create: false, read: true, update: false, delete: false, share: false },
          templates: { create: false, read: true, update: false, delete: false, share: false },
          batchJobs: { create: false, read: true, update: false, delete: false, execute: false },
          scheduledTasks: { create: false, read: true, update: false, delete: false, execute: false },
          team: { inviteMembers: false, removeMembers: false, updateRoles: false, viewAnalytics: false, manageSettings: false }
        };
    }
  }

  private generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }

  // Export/Import

  public exportTeamData(teamId: string): string {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const data = {
      team,
      sharedItems: Array.from(this.sharedItems.values()).filter(item => 
        item.members.includes(this.currentUser)
      ),
      activities: this.getTeamActivities(teamId, 1000)
    };

    return JSON.stringify(data, null, 2);
  }

  public importTeamData(data: string): boolean {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.team) {
        this.teams.set(parsedData.team.id, parsedData.team);
      }

      if (parsedData.sharedItems) {
        for (const item of parsedData.sharedItems) {
          this.sharedItems.set(item.id, item);
        }
      }

      if (parsedData.activities) {
        for (const activity of parsedData.activities) {
          this.activities.set(activity.id, activity);
        }
      }

      this.logger.info('Team data imported successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import team data', error);
      return false;
    }
  }
}
