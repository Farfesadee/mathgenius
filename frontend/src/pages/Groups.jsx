import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserStats, xpProgress } from '../lib/stats'

function randomCode(len = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Member row in leaderboard ────────────────────────────────────────────────
function MemberRow({ member, rank, isMe }) {
    const { level } = xpProgress(member.xp || 0)
    const rankColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-400' : 'text-[var(--color-muted)]'
    const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`

    return (
        <div className={`flex items-center gap-4 px-5 py-4 ${isMe ? 'bg-[#e8f4f4]' : ''}`}>
            <span className={`w-10 text-center font-mono font-bold ${rankColor}`}>{rankIcon}</span>
            <div className="w-9 h-9 rounded-full bg-[var(--color-teal)] flex items-center justify-center
                      font-serif font-black text-white text-sm shrink-0">
                {(member.full_name || 'S')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--color-ink)] truncate">
                    {member.full_name || 'Student'}
                    {isMe && <span className="ml-2 text-[10px] font-mono text-[var(--color-teal)] uppercase">You</span>}
                </p>
                <p className="text-xs text-[var(--color-muted)]">Level {level} · {member.streak_current || 0}🔥</p>
            </div>
            <div className="text-right shrink-0">
                <p className="font-serif font-black text-lg text-[var(--color-ink)]">
                    {(member.xp || 0).toLocaleString()}
                </p>
                <p className="font-mono text-[10px] text-[var(--color-muted)] uppercase">XP</p>
            </div>
        </div>
    )
}

// ── Group detail view ────────────────────────────────────────────────────────
function GroupView({ group, userId, onLeave }) {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)

    useEffect(() => { loadMembers() }, [group.id])

    const loadMembers = async () => {
        setLoading(true)
        const { data: memberRows } = await supabase
            .from('group_members')
            .select('user_id, joined_at')
            .eq('group_id', group.id)

        if (!memberRows?.length) { setLoading(false); return }

        // Get profile + stats for each member
        const ids = memberRows.map(m => m.user_id)
        const [{ data: profiles }, { data: statsRows }] = await Promise.all([
            supabase.from('profiles').select('id, full_name').in('id', ids),
            supabase.from('user_stats').select('user_id, xp, streak_current').in('user_id', ids),
        ])

        const statsMap = Object.fromEntries((statsRows || []).map(s => [s.user_id, s]))
        const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

        const combined = ids.map(id => ({
            user_id: id,
            full_name: profileMap[id]?.full_name,
            xp: statsMap[id]?.xp || 0,
            streak_current: statsMap[id]?.streak_current || 0,
        }))
        combined.sort((a, b) => b.xp - a.xp)
        setMembers(combined)
        setLoading(false)
    }

    const copyCode = () => {
        navigator.clipboard.writeText(group.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const leave = async () => {
        if (!window.confirm('Leave this group?')) return
        await supabase.from('group_members')
            .delete().eq('group_id', group.id).eq('user_id', userId)
        onLeave()
    }

    return (
        <div>
            {/* Group header */}
            <div className="card overflow-hidden mb-6">
                <div className="bg-purple-600 px-6 py-5 flex items-center justify-between">
                    <div>
                        <p className="font-mono text-[10px] text-white/60 uppercase tracking-widest mb-1">Study Group</p>
                        <h2 className="font-serif font-black text-white text-2xl">{group.name}</h2>
                        <p className="text-white/70 text-sm mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-[10px] text-white/60 uppercase mb-1">Join Code</p>
                        <button onClick={copyCode}
                            className="font-mono font-black text-2xl text-white hover:text-purple-200 transition-colors">
                            {group.code}
                        </button>
                        {copied && <p className="text-white/70 text-[10px] mt-0.5">Copied!</p>}
                    </div>
                </div>
                <div className="bg-white px-6 py-3 flex justify-between items-center">
                    <button onClick={loadMembers} className="text-xs text-[var(--color-teal)] font-mono hover:underline">
                        🔄 Refresh
                    </button>
                    <button onClick={leave} className="text-xs text-red-500 font-mono hover:underline">
                        Leave group
                    </button>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="card overflow-hidden">
                <div className="bg-[var(--color-ink)] px-6 py-4">
                    <p className="font-serif font-bold text-white text-lg">🏆 Group Leaderboard</p>
                </div>
                <div className="bg-white divide-y divide-[var(--color-border)]">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-3 border-[var(--color-teal)] border-t-transparent
                              rounded-full animate-spin mx-auto" />
                        </div>
                    ) : members.length === 0 ? (
                        <div className="p-8 text-center text-[var(--color-muted)] text-sm">
                            No members found. Share the code to invite friends!
                        </div>
                    ) : members.map((m, i) => (
                        <MemberRow key={m.user_id} member={m} rank={i + 1} isMe={m.user_id === userId} />
                    ))}
                </div>
            </div>
        </div>
    )
}

// ── Main Groups page ──────────────────────────────────────────────────────────
export default function Groups() {
    const { user, profile } = useAuth()

    const [myGroups, setMyGroups] = useState([])
    const [active, setActive] = useState(null)   // selected group
    const [view, setView] = useState('list') // 'list' | 'create' | 'join'

    // Create form
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState(false)

    // Join form
    const [joinCode, setJoinCode] = useState('')
    const [joining, setJoining] = useState(false)
    const [joinError, setJoinError] = useState(null)

    const [loading, setLoading] = useState(true)

    useEffect(() => { if (user) load() }, [user])

    const load = async () => {
        setLoading(true)
        const { data } = await supabase
            .from('group_members')
            .select('group_id, study_groups(id, name, code, created_by)')
            .eq('user_id', user.id)
        setMyGroups((data || []).map(r => r.study_groups).filter(Boolean))
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!newName.trim() || creating) return
        setCreating(true)
        const code = randomCode()
        const { data: g, error } = await supabase
            .from('study_groups')
            .insert({ name: newName.trim(), code, created_by: user.id })
            .select().single()
        if (!error && g) {
            await supabase.from('group_members').insert({ group_id: g.id, user_id: user.id })
            setNewName('')
            setView('list')
            await load()
            setActive(g)
        }
        setCreating(false)
    }

    const handleJoin = async () => {
        if (!joinCode.trim() || joining) return
        setJoining(true)
        setJoinError(null)
        const { data: groups } = await supabase
            .from('study_groups').select('*').eq('code', joinCode.trim().toUpperCase())
        if (!groups?.length) { setJoinError('Group not found. Check the code.'); setJoining(false); return }
        const g = groups[0]
        await supabase.from('group_members')
            .upsert({ group_id: g.id, user_id: user.id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true })
        setJoinCode('')
        setView('list')
        await load()
        setActive(g)
        setJoining(false)
    }

    return (
        <div className="max-w-3xl mx-auto px-6 py-10">

            {/* Header */}
            <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
                <div>
                    <p className="font-mono text-xs tracking-widest uppercase
                        text-[var(--color-gold)] mb-2 flex items-center gap-3">
                        <span className="block w-6 h-px bg-[var(--color-gold)]" />
                        Study Groups
                    </p>
                    <h1 className="font-serif font-black text-5xl tracking-tight">👥 Groups</h1>
                    <p className="text-[var(--color-muted)] mt-1">
                        Study together and see who's topping the leaderboard.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setView('create'); setActive(null) }}
                        className="btn-primary px-5 py-2.5 text-sm">+ Create</button>
                    <button onClick={() => { setView('join'); setActive(null) }}
                        className="btn-secondary px-5 py-2.5 text-sm">🔑 Join</button>
                </div>
            </div>

            {/* Create form */}
            {view === 'create' && (
                <div className="card overflow-hidden mb-6">
                    <div className="bg-purple-600 px-6 py-4"><p className="font-serif font-bold text-white">Create a Group</p></div>
                    <div className="bg-white p-6 space-y-4">
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="Group name (e.g., JAMB 2026 Squad)"
                            className="w-full border-2 border-[var(--color-border)] focus:border-purple-500
                         rounded-xl px-4 py-3 text-sm transition-colors" />
                        <div className="flex gap-3">
                            <button onClick={handleCreate} disabled={!newName.trim() || creating}
                                className="btn-primary px-6 py-3 text-sm disabled:opacity-50 flex-1 justify-center">
                                {creating ? 'Creating...' : '✅ Create Group'}
                            </button>
                            <button onClick={() => setView('list')} className="btn-secondary px-4 py-3 text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join form */}
            {view === 'join' && (
                <div className="card overflow-hidden mb-6">
                    <div className="bg-[var(--color-ink)] px-6 py-4"><p className="font-serif font-bold text-white">Join a Group</p></div>
                    <div className="bg-white p-6 space-y-4">
                        <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleJoin()}
                            placeholder="Enter 6-character group code"
                            maxLength={6}
                            className="w-full border-2 border-[var(--color-border)] focus:border-[var(--color-teal)]
                         rounded-xl px-4 py-3 text-sm font-mono tracking-widest uppercase transition-colors" />
                        {joinError && <p className="text-red-500 text-sm">{joinError}</p>}
                        <div className="flex gap-3">
                            <button onClick={handleJoin} disabled={joinCode.length < 6 || joining}
                                className="btn-primary px-6 py-3 text-sm disabled:opacity-50 flex-1 justify-center">
                                {joining ? 'Joining...' : '🔑 Join Group'}
                            </button>
                            <button onClick={() => setView('list')} className="btn-secondary px-4 py-3 text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* My groups list or active group */}
            {active ? (
                <div>
                    <button onClick={() => setActive(null)}
                        className="text-sm text-[var(--color-teal)] font-mono hover:underline mb-4 block">
                        ← My Groups
                    </button>
                    <GroupView group={active} userId={user.id} onLeave={() => { setActive(null); load() }} />
                </div>
            ) : (
                <div>
                    {loading ? (
                        <div className="card bg-white p-10 text-center">
                            <div className="w-8 h-8 border-4 border-[var(--color-teal)] border-t-transparent
                              rounded-full animate-spin mx-auto" />
                        </div>
                    ) : myGroups.length === 0 ? (
                        <div className="card bg-white p-12 text-center">
                            <div className="text-5xl mb-4">👥</div>
                            <h3 className="font-serif font-bold text-xl mb-2">No groups yet</h3>
                            <p className="text-[var(--color-muted)] text-sm mb-6">
                                Create a group to study with friends and compete on a shared leaderboard.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => setView('create')} className="btn-primary px-5 py-3 text-sm">
                                    + Create Group
                                </button>
                                <button onClick={() => setView('join')} className="btn-secondary px-5 py-3 text-sm">
                                    🔑 Join Group
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                                My Groups ({myGroups.length})
                            </p>
                            {myGroups.map(g => (
                                <button key={g.id} onClick={() => setActive(g)}
                                    className="w-full card bg-white p-5 flex items-center justify-between
                             hover:shadow-md transition-all text-left">
                                    <div>
                                        <p className="font-serif font-bold text-lg text-[var(--color-ink)]">{g.name}</p>
                                        <p className="font-mono text-sm text-[var(--color-muted)] mt-0.5">Code: {g.code}</p>
                                    </div>
                                    <span className="text-[var(--color-teal)]">→</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
