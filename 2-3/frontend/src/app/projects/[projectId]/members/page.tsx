'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '../../../../components/AppShell';
import { AsyncState } from '../../../../components/AsyncState';
import { useMe } from '../../../../features/auth/useMe';
import { api } from '../../../../lib/api/client';
import { InviteMemberForm } from '../../../../features/members/InviteMemberForm';
import { MembersTable } from '../../../../features/members/MembersTable';

export default function MembersPage({ params }: { params: { projectId: string } }) {
    const { data: me } = useMe();

    const snapshotQuery = useQuery({
        queryKey: ['snapshot', params.projectId],
        queryFn: () => api.snapshot(params.projectId),
    });

    const myRole = useMemo(() => {
        if (!me || !snapshotQuery.data) return null;
        return snapshotQuery.data.memberships.find((m) => m.userId === me.id)?.role ?? null;
    }, [me, snapshotQuery.data]);

    const canManage = myRole === 'owner' || myRole === 'admin';
    const isOwner = myRole === 'owner';

    const membersQuery = useQuery({
        queryKey: ['projectMembers', params.projectId],
        queryFn: () => api.projectMembers(params.projectId),
    });

    return (
        <AppShell>
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold">成員</h1>
                    <p className="mt-1 text-sm text-slate-600">管理專案成員與角色。</p>
                </div>
                <Link
                    className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    href={`/projects/${params.projectId}/board`}
                >
                    返回看板
                </Link>
            </div>

            {canManage ? (
                <div className="mt-6">
                    <InviteMemberForm projectId={params.projectId} />
                </div>
            ) : null}

            <div className="mt-6">
                <AsyncState isLoading={membersQuery.isLoading} error={membersQuery.error} empty={false}>
                    <MembersTable
                        projectId={params.projectId}
                        members={membersQuery.data?.members ?? []}
                        canManage={canManage}
                        isOwner={isOwner}
                        myUserId={me?.id ?? null}
                    />
                </AsyncState>
            </div>
        </AppShell>
    );
}
