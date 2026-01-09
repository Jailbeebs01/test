"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useParams } from "next/navigation";
import { Users, Mail, Shield, MoreHorizontal, Loader2, ArrowLeft, UserPlus, X, Crown } from "lucide-react";
import { getApiUrl } from "../../../../lib/api";
import { RoleBadge } from "../../../../components/platform/RoleBadge";

interface Member {
    id: string;
    user: {
        id: string;
        login: string;
        email?: string;
        avatarUrl?: string;
    };
    role: string;
    status: string;
    joinedAt: string;
}

//test if it works

    const fetchOrgDetails = async () => {
        try {
            const apiUrl = getApiUrl();
            const res = await fetch(`${apiUrl}/orgs/${slug}`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setOrgBillingStatus(data.organization?.billingStatus || null);
            }
        } catch (err) {
            console.error("Failed to fetch org details:", err);
        }
    };

    const fetchMembers = async () => {
        try {
            setLoading(true);
            setError(null);
            const apiUrl = getApiUrl();
            const res = await fetch(`${apiUrl}/orgs/${slug}/members`, {
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
            } else if (res.status === 401) {
                router.push("/auth/login");
            } else if (res.status === 403) {
                setError("You don't have access to view members");
            } else {
                setError("Failed to load members");
            }
        } catch (err) {
            console.error("Failed to fetch members:", err);
            setError("Failed to load members");
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteForm.githubUsername.trim()) return;

        try {
            setInviting(true);
            setInviteError(null);
            setInviteSuccess(null);
            const apiUrl = getApiUrl();
            const res = await fetch(`${apiUrl}/orgs/${slug}/members/invite`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: inviteForm.githubUsername.trim().replace(/^@/, ""),
                    role: inviteForm.role,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setInviteSuccess(`Invitation sent to @${inviteForm.githubUsername}`);
                setInviteForm({ githubUsername: "", role: "member" });
                fetchMembers();
                setTimeout(() => {
                    setShowInviteModal(false);
                    setInviteSuccess(null);
                }, 2000);
            } else {
                setInviteError(data.error || "Failed to invite member");
            }
        } catch (err) {
            console.error("Failed to invite member:", err);
            setInviteError("Failed to invite member");
        } finally {
            setInviting(false);
        }
    };



    const getStatusBadge = (status: string) => {
        if (status === "pending") {
            return "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30";
        }
        return "";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    const activeMembers = members.filter(m => m.status === "active");
    const pendingMembers = members.filter(m => m.status === "pending");
    const isSuspended = orgBillingStatus === "suspended";

    // Block access if workspace is suspended
    if (isSuspended) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => router.push("/platform/organization")}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Organizations
                </button>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <div className="p-6 bg-amber-100 dark:bg-amber-500/20 rounded-full mb-6">
                        <Crown className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Upgrade Required
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
                        This workspace is suspended. Upgrade your plan to manage team members.
                    </p>
                    <button
                        onClick={() => router.push("/platform/settings")}
                        className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-all font-medium inline-flex items-center gap-2"
                    >
                        <Crown className="w-5 h-5" />
                        Upgrade Plan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.push(`/org/${slug}`)}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Organization
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Members</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Manage your team and invite new members.
                    </p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all font-medium flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Active Members */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Members ({activeMembers.length})
                </h2>

                <div className="space-y-3">
                    {activeMembers.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold overflow-hidden">
                                    {member.user.avatarUrl ? (
                                        <img src={member.user.avatarUrl} alt={member.user.login} className="w-10 h-10" />
                                    ) : (
                                        member.user.login.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{member.user.login}</p>
                                    {member.user.email && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{member.user.email}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <RoleBadge role={member.role} />
                                <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pending Invitations */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Pending Invitations ({pendingMembers.length})
                </h2>

                {pendingMembers.length > 0 ? (
                    <div className="space-y-3">
                        {pendingMembers.map((member) => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-semibold">
                                        {member.user.login.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{member.user.login}</p>
                                        {member.user.email && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{member.user.email}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge("pending")}`}>
                                        Pending
                                    </span>
                                    <RoleBadge role={member.role} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center border border-dashed border-slate-300 dark:border-white/10 rounded-lg">
                        <Mail className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
                        <p className="text-slate-600 dark:text-slate-400">No pending invitations</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Invite team members to collaborate
                        </p>
                    </div>
                )}
            </div>

            {/* Roles Info */}
            <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    Roles & Permissions
                </h2>

                <div className="space-y-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <RoleBadge role="owner" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Full access to all settings, billing, and team management</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <RoleBadge role="admin" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage repositories, settings, and invite members</p>
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <RoleBadge role="member" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">View and interact with code reviews</p>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && typeof document !== "undefined" && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowInviteModal(false)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Invite Member
                            </h2>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    GitHub Username *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                                    <input
                                        type="text"
                                        value={inviteForm.githubUsername}
                                        onChange={(e) => setInviteForm({ ...inviteForm, githubUsername: e.target.value.replace(/^@/, "") })}
                                        placeholder="username"
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    The user must be registered on MergeMonkey
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Role
                                </label>
                                <select
                                    value={inviteForm.role}
                                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            {inviteError && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                    {inviteError}
                                </div>
                            )}

                            {inviteSuccess && (
                                <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg text-green-600 dark:text-green-400 text-sm">
                                    {inviteSuccess}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting || !inviteForm.githubUsername.trim()}
                                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                                >
                                    {inviting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Inviting...
                                        </>
                                    ) : (
                                        "Send Invitation"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
