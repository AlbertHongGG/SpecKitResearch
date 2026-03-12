'use client';

import { useMemo, useState } from 'react';

import {
  assignProjectMember,
  listProjectMembers,
  updateProjectMember,
  type ProjectMemberRecord,
} from '@/services/projects/project-admin-api';
import type { OrganizationMember } from '@/services/organizations/org-members-api';

interface ProjectMembersSettingsProps {
  projectId: string;
  projectName: string;
  orgMembers: OrganizationMember[];
  csrfToken?: string | null;
  disabled?: boolean;
}

const roleOptions = ['project_manager', 'developer', 'viewer'] as const;

export function ProjectMembersSettings({ projectId, projectName, orgMembers, csrfToken, disabled = false }: ProjectMembersSettingsProps) {
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<(typeof roleOptions)[number]>('viewer');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const availableUsers = useMemo(
    () => orgMembers.filter((member) => member.status === 'active').sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [orgMembers],
  );

  async function loadMembers() {
    setError(null);
    try {
      const data = await listProjectMembers(projectId);
      setMembers(data);
      setLoaded(true);
      if (!selectedUserId && availableUsers[0]) {
        setSelectedUserId(availableUsers[0].userId);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load project members.');
    }
  }

  async function addMember() {
    if (!selectedUserId) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await assignProjectMember(projectId, { userId: selectedUserId, projectRole: selectedRole }, csrfToken);
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to assign project member.');
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(membershipId: string, projectRole: ProjectMemberRecord['projectRole']) {
    setBusy(true);
    setError(null);
    try {
      await updateProjectMember(projectId, membershipId, { projectRole }, csrfToken);
      await loadMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update project member role.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-soft stack">
      <div className="column-header">
        <div>
          <h3>{projectName} roles</h3>
          <p>Assign scoped project roles to active organization members.</p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void loadMembers()}>
          {loaded ? 'Refresh roles' : 'Load roles'}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="form-grid">
        <label className="field">
          <span>Member</span>
          <select aria-label={`Member for ${projectName}`} value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            {availableUsers.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName} ({member.email})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Project role</span>
          <select aria-label={`Role for ${projectName}`} value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as (typeof roleOptions)[number])}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="actions">
        <button className="button" type="button" disabled={busy || !selectedUserId || disabled} onClick={() => void addMember()}>
          Assign project role
        </button>
      </div>

      {loaded ? (
        <div className="stack">
          {members.map((member) => (
            <article className="card-row" key={member.membershipId}>
              <div>
                <h3>{member.displayName}</h3>
                <p>{member.email}</p>
              </div>
              <label className="field inline-field">
                <span className="sr-only">Role for {member.displayName}</span>
                <select
                  aria-label={`Project role for ${member.displayName}`}
                  value={member.projectRole}
                  disabled={disabled}
                  onChange={(event) => void changeRole(member.membershipId, event.target.value as ProjectMemberRecord['projectRole'])}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
