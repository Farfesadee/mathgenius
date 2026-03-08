import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { getUserStats, xpProgress, BADGES } from '../lib/stats'
import { getReferralCode, getReferralStats, getReferralLink, applyReferralCode } from '../lib/referrals'
import { createNotification } from '../lib/notifications'
import { getUserProfile, updateUserProfile } from '../services/api'

const AVATAR_COLORS = [
  { id: 'teal',   bg: 'bg-[var(--color-teal)]', label: 'Teal'   },
  { id: 'ink',    bg: 'bg-[var(--color-ink)]',  label: 'Dark'   },
  { id: 'gold',   bg: 'bg-[var(--color-gold)]', label: 'Gold'   },
  { id: 'purple', bg: 'bg-purple-500',           label: 'Purple' },
  { id: 'pink',   bg: 'bg-pink-500',             label: 'Pink'   },
  { id: 'green',  bg: 'bg-green-500',            label: 'Green'  },
]

const EXAM_TARGETS = ['WAEC', 'NECO', 'JAMB', 'WAEC & JAMB', 'NECO & JAMB', 'All']

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const [stats,         setStats]         = useState(null)
  const [referralData,  setReferralData]  = useState(null)
  const [referralStats, setReferralStats] = useState(null)

  const [fullName,    setFullName]    = useState('')
  const [school,      setSchool]      = useState('')
  const [bio,         setBio]         = useState('')
  const [examTarget,  setExamTarget]  = useState('WAEC')
  const [examDate,    setExamDate]    = useState('')
  const [avatarColor, setAvatarColor] = useState('teal')

  const [refCode,   setRefCode]   = useState('')
  const [refInput,  setRefInput]  = useState('')
  const [refMsg,    setRefMsg]    = useState(null)
  const [copied,    setCopied]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [tab,       setTab]       = useState('profile')

  // ── Role (teacher / parent / student) ────────────────────────────
  const [role, setRole] = useState('student')

  // Study goals
  const [targetScore,    setTargetScore]    = useState('')
  const [targetYear,     setTargetYear]     = useState('')
  const [studyGoalMins,  setStudyGoalMins]  = useState(30)

  useEffect(() => {
    if (user && profile) {
      setFullName(profile.full_name || '')
      setSchool(profile.school || '')
      setBio(profile.bio || '')
      setExamTarget(profile.exam_target || 'WAEC')
      setExamDate(profile.exam_date || '')
      setAvatarColor(profile.avatar_color || 'teal')
      setRole(profile.role || 'student')
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    Promise.all([
      getUserStats(user.id),
      getReferralCode(user.id),
      getReferralStats(user.id),
      getUserProfile(user.id),
    ]).then(([s, r, rs, p]) => {
      setStats(s)
      setReferralData(r)
      setReferralStats(rs)
      setRefCode(r?.referral_code || '')
      const prof = p?.data?.profile
      if (prof) {
        if (prof.target_score)            setTargetScore(prof.target_score)
        if (prof.target_year)             setTargetYear(prof.target_year)
        if (prof.study_goal_mins_per_day) setStudyGoalMins(prof.study_goal_mins_per_day)
      }
    })
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        full_name:    fullName,
        school,
        bio,
        exam_target:  examTarget,
        exam_date:    examDate || null,
        avatar_color: avatarColor,
        role,                          // ← saves teacher/parent/student
      })
      .eq('id', user.id)

    try {
      await updateUserProfile(user.id, {
        target_exam:             examTarget,
        target_score:            targetScore ? parseInt(targetScore) : null,
        target_year:             targetYear  ? parseInt(targetYear)  : null,
        study_goal_mins_per_day: parseInt(studyGoalMins) || 30,
      })
    } catch { /* non-fatal */ }

    if (refreshProfile) await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleCopyLink = () => {
    const link = getReferralLink(refCode)
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApplyCode = async () => {
    if (!refInput.trim()) return
    const result = await applyReferralCode(user.id, refInput.trim())
    if (result.success) {
      setRefMsg({ type: 'success', text: '✅ Code applied! +50 XP added to your account.' })
      await createNotification(user.id, {
        type: 'referral', title: 'Referral Code Applied!',
        message: 'You earned 50 XP for joining via a referral.',
        icon: '🎁', link: '/mastery',
      })
    } else {
      setRefMsg({ type: 'error', text: `❌ ${result.error}` })
    }
    setTimeout(() => setRefMsg(null), 4000)
  }

  const { level, progress, current, needed } = stats
    ? xpProgress(stats.xp || 0)
    : { level: 1, progress: 0, current: 0, needed: 100 }

  const initials  = fullName
    ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'
  const avatarBg  = AVATAR_COLORS.find(c => c.id === avatarColor)?.bg || 'bg-[var(--color-teal)]'
  const daysToExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000))
    : null

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <p className="font-mono text-xs tracking-widest uppercase
                      text-[var(--color-gold)] mb-2 flex items-center gap-3">
          <span className="block w-6 h-px bg-[var(--color-gold)]" />
          Account
        </p>
        <h1 className="font-serif font-black text-5xl tracking-tight">My Profile</h1>
      </div>

      {/* Avatar + summary */}
      <div className="card bg-white p-6 mb-6 flex flex-wrap items-center gap-5">
        <div className={`${avatarBg} w-20 h-20 rounded-2xl flex items-center
                         justify-center font-serif font-black text-white text-3xl shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-serif font-black text-2xl text-[var(--color-ink)]">
            {fullName || 'Student'}
          </h2>
          <p className="text-[var(--color-muted)] text-sm">{user?.email}</p>
          {/* Role badge */}
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg
                            text-[10px] font-bold font-mono uppercase tracking-wide
                            ${role === 'teacher' ? 'bg-blue-100 text-blue-700'
                              : role === 'parent' ? 'bg-purple-100 text-purple-700'
                              : 'bg-[var(--color-paper)] text-[var(--color-muted)]'}`}>
            {role === 'teacher' ? '👨‍🏫 Teacher'
              : role === 'parent' ? '👪 Parent'
              : '🎓 Student'}
          </span>
          {stats && (
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="font-mono text-xs text-[var(--color-teal)] font-bold">
                Level {level}
              </span>
              <span className="font-mono text-xs text-[var(--color-muted)]">
                ⚡ {(stats.xp || 0).toLocaleString()} XP
              </span>
              <span className="font-mono text-xs text-orange-500">
                🔥 {stats.streak_current || 0} day streak
              </span>
              {daysToExam !== null && (
                <span className="font-mono text-xs text-red-500 font-bold">
                  📅 {daysToExam}d to {examTarget}
                </span>
              )}
            </div>
          )}
          {stats && (
            <div className="w-full max-w-xs mt-2">
              <div className="flex justify-between text-[10px] font-mono
                              text-[var(--color-muted)] mb-1">
                <span>Lv.{level}</span>
                <span>{current}/{needed} XP to Lv.{level + 1}</span>
              </div>
              <div className="w-full bg-[var(--color-border)] rounded-full h-1.5">
                <div className="bg-[var(--color-teal)] h-1.5 rounded-full"
                     style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/share/${user?.id}`)
            alert('Share link copied! Send it to a parent or teacher.')
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                     border-[var(--color-border)] text-sm font-semibold
                     text-[var(--color-ink)] hover:border-[var(--color-teal)]
                     hover:text-[var(--color-teal)] transition-all bg-white">
          👀 Share Profile (Parent / Teacher)
        </button>
        <a href="/challenge"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                     border-[var(--color-border)] text-sm font-semibold
                     text-[var(--color-ink)] hover:border-purple-500
                     hover:text-purple-600 transition-all bg-white">
          ⚔️ Challenge a Friend
        </a>
        <a href="/certificate"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                     border-[var(--color-border)] text-sm font-semibold
                     text-[var(--color-ink)] hover:border-[var(--color-gold)]
                     hover:text-[var(--color-gold)] transition-all bg-white">
          🏆 View Certificate
        </a>
        {(role === 'teacher' || role === 'parent') && (
          <a href="/monitor"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2
                       border-[var(--color-teal)] text-sm font-semibold
                       text-[var(--color-teal)] hover:bg-[#e8f4f4]
                       transition-all bg-white">
            {role === 'teacher' ? '👨‍🏫 Monitor Dashboard' : '👪 Monitor Dashboard'}
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: 'profile',  label: '👤 Profile'   },
          { id: 'referral', label: '🎁 Referrals' },
          { id: 'badges',   label: '🏅 Badges'    },
          { id: 'settings', label: '⚙️ Settings'  },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
              ${tab === t.id
                ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div className="card bg-white p-6 space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                         text-sm transition-colors"
              placeholder="Your full name" />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">School</label>
            <input type="text" value={school} onChange={e => setSchool(e.target.value)}
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                         text-sm transition-colors"
              placeholder="Your school name" />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Bio (optional)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              rows={3} placeholder="Tell us a bit about yourself..."
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                         text-sm transition-colors resize-none" />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Exam Target</label>
            <div className="flex flex-wrap gap-2">
              {EXAM_TARGETS.map(et => (
                <button key={et} onClick={() => setExamTarget(et)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                    ${examTarget === et
                      ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)]'}`}>
                  {et}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">
              Exam Date (for countdown)
            </label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
              className="w-full border-2 border-[var(--color-border)]
                         focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                         text-sm transition-colors" />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest
                               text-[var(--color-muted)] block mb-2">Avatar Colour</label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map(c => (
                <button key={c.id} onClick={() => setAvatarColor(c.id)} title={c.label}
                  className={`w-9 h-9 rounded-xl ${c.bg} border-2 transition-all
                    ${avatarColor === c.id
                      ? 'border-[var(--color-ink)] scale-110'
                      : 'border-transparent'}`} />
              ))}
            </div>
          </div>

          {/* Study Goals */}
          <div className="border-t-2 border-[var(--color-border)] pt-5">
            <p className="font-mono text-[10px] uppercase tracking-widest
                           text-[var(--color-teal)] mb-4">🎯 Study Goals</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">Target Score</label>
                <input type="number" value={targetScore} min="0" max="400"
                  onChange={e => setTargetScore(e.target.value)}
                  className="w-full border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                             text-sm transition-colors"
                  placeholder="e.g. 280" />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">Target Year</label>
                <input type="number" value={targetYear} min="2024" max="2030"
                  onChange={e => setTargetYear(e.target.value)}
                  className="w-full border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                             text-sm transition-colors"
                  placeholder="e.g. 2025" />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest
                                   text-[var(--color-muted)] block mb-2">Daily Study (mins)</label>
                <input type="number" value={studyGoalMins} min="5" max="480"
                  onChange={e => setStudyGoalMins(e.target.value)}
                  className="w-full border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                             text-sm transition-colors"
                  placeholder="30" />
              </div>
            </div>
            {targetScore && (
              <p className="text-xs text-[var(--color-teal)] mt-2 font-medium">
                🎯 Goal: Score {targetScore} in {examTarget}{targetYear ? ` ${targetYear}` : ''} · Study {studyGoalMins} min/day
              </p>
            )}
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full btn-primary py-3 text-sm justify-center
                       flex items-center gap-2 disabled:opacity-50">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white
                                   rounded-full animate-spin" /> Saving...</>
              : saved ? '✅ Saved!' : '💾 Save Changes'
            }
          </button>
        </div>
      )}

      {/* ── REFERRAL TAB ── */}
      {tab === 'referral' && (
        <div className="space-y-5">
          <div className="card bg-white p-6">
            <p className="font-mono text-[10px] uppercase tracking-widest
                           text-[var(--color-muted)] mb-4">Your Referral Link</p>
            <div className="bg-[var(--color-paper)] border-2 border-[var(--color-border)]
                            rounded-xl p-4 font-mono text-sm text-[var(--color-ink)]
                            break-all mb-3">
              {refCode ? getReferralLink(refCode) : 'Loading...'}
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopyLink}
                className="flex-1 btn-primary py-3 text-sm justify-center">
                {copied ? '✅ Copied!' : '📋 Copy Link'}
              </button>
              {navigator.share && refCode && (
                <button
                  onClick={() => navigator.share({
                    title: 'Join MathGenius',
                    text: 'Study WAEC & JAMB maths with AI — use my referral link!',
                    url: getReferralLink(refCode),
                  })}
                  className="btn-secondary px-5 py-3 text-sm">
                  📤 Share
                </button>
              )}
            </div>
            <div className="mt-4 bg-[#e8f4f4] border border-[var(--color-teal)] rounded-xl p-4">
              <p className="text-sm font-semibold text-[var(--color-teal)] mb-1">
                🎁 Earn 100 XP per referral!
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                When a friend signs up with your link and completes their first exam,
                you get 100 XP and they get 50 XP.
              </p>
            </div>
          </div>

          {referralStats && (
            <div className="card bg-white p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-muted)] mb-4">Your Referrals</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <div className="font-serif font-black text-3xl text-[var(--color-teal)]">
                    {referralStats.count}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-[var(--color-muted)]">
                    Friends Referred
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-serif font-black text-3xl text-[var(--color-gold)]">
                    {referralStats.count * 100}
                  </div>
                  <div className="font-mono text-[10px] uppercase text-[var(--color-muted)]">
                    XP Earned
                  </div>
                </div>
              </div>
              {referralStats.referrals.length > 0 && (
                <div className="space-y-2">
                  {referralStats.referrals.map(r => (
                    <div key={r.id}
                      className="flex items-center gap-3 bg-[var(--color-paper)]
                                 rounded-xl px-4 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-teal)]
                                      flex items-center justify-center text-white
                                      font-bold text-xs">
                        {r.referred?.full_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {r.referred?.full_name || 'Student'}
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">
                          Joined {new Date(r.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <span className="ml-auto text-xs font-mono text-[var(--color-gold)] font-bold">
                        +100 XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!profile?.referred_by && (
            <div className="card bg-white p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest
                             text-[var(--color-muted)] mb-3">Have a Referral Code?</p>
              <div className="flex gap-3">
                <input type="text" value={refInput}
                  onChange={e => setRefInput(e.target.value.toUpperCase())}
                  placeholder="Enter code e.g. ABC12345"
                  className="flex-1 border-2 border-[var(--color-border)]
                             focus:border-[var(--color-teal)] rounded-xl px-4 py-3
                             text-sm font-mono transition-colors" />
                <button onClick={handleApplyCode} disabled={!refInput.trim()}
                  className="btn-primary px-5 py-3 text-sm disabled:opacity-50">
                  Apply
                </button>
              </div>
              {refMsg && (
                <p className={`mt-2 text-sm
                  ${refMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {refMsg.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── BADGES TAB ── */}
      {tab === 'badges' && (
        <div className="card bg-white p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest
                         text-[var(--color-muted)] mb-4">
            {stats?.badges?.length || 0} of {BADGES.length} badges earned
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BADGES.map(badge => {
              const earned = stats?.badges?.includes(badge.id)
              return (
                <div key={badge.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                    ${earned
                      ? 'border-[var(--color-gold)] bg-yellow-50'
                      : 'border-[var(--color-border)] opacity-40 grayscale'}`}>
                  <span className="text-3xl">{badge.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm text-[var(--color-ink)]">{badge.label}</p>
                    <p className="text-xs text-[var(--color-muted)]">{badge.desc}</p>
                  </div>
                  {earned && <span className="ml-auto text-[var(--color-gold)] text-lg">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div className="card bg-white p-6 space-y-4">

          {/* ── Account Role ─────────────────────────────────────── */}
          <div className="py-3 border-b border-[var(--color-border)]">
            <div className="mb-3">
              <p className="font-semibold text-sm text-[var(--color-ink)]">Account Role</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Teachers and parents unlock the Monitor dashboard to track students
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'student', icon: '🎓', label: 'Student', desc: 'Practice & learn'  },
                { id: 'teacher', icon: '👨‍🏫', label: 'Teacher', desc: 'Monitor classes'  },
                { id: 'parent',  icon: '👪',  label: 'Parent',  desc: 'Track your child' },
              ].map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl
                              border-2 text-center transition-all
                    ${role === r.id
                      ? 'border-[var(--color-teal)] bg-[#e8f4f4] text-[var(--color-teal)]'
                      : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-teal)]'
                    }`}>
                  <span className="text-xl">{r.icon}</span>
                  <span className="text-xs font-bold">{r.label}</span>
                  <span className="text-[10px] opacity-70">{r.desc}</span>
                </button>
              ))}
            </div>
            {role !== 'student' && (
              <p className="mt-2 text-xs text-[var(--color-teal)] font-medium">
                {role === 'teacher' ? '👨‍🏫 Teacher' : '👪 Parent'} dashboard unlocked —{' '}
                <a href="/monitor" className="underline hover:opacity-80">Go to Monitor →</a>
              </p>
            )}
            <button onClick={handleSave} disabled={saving}
              className="mt-3 w-full btn-primary py-2.5 text-sm justify-center
                         flex items-center gap-2 disabled:opacity-50">
              {saving ? 'Saving...' : saved ? '✅ Role Saved!' : '💾 Save Role'}
            </button>
          </div>

          {/* ── Dark Mode ── */}
          <div className="flex items-center justify-between py-3 border-b
                          border-[var(--color-border)]">
            <div>
              <p className="font-semibold text-sm text-[var(--color-ink)]">Dark Mode</p>
              <p className="text-xs text-[var(--color-muted)]">
                Switch between light and dark theme
              </p>
            </div>
            <button onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative border-2
                ${isDark
                  ? 'bg-[var(--color-teal)] border-[var(--color-teal)]'
                  : 'bg-[var(--color-border)] border-[var(--color-border)]'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full
                                transition-all duration-300 ${isDark ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          {/* ── Referral Code ── */}
          <div className="flex items-center justify-between py-3 border-b
                          border-[var(--color-border)]">
            <div>
              <p className="font-semibold text-sm text-[var(--color-ink)]">Referral Code</p>
              <p className="text-xs text-[var(--color-muted)]">Share this code with friends</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[var(--color-teal)]">
                {refCode || '...'}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(refCode)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]
                           transition-colors border border-[var(--color-border)]
                           rounded-lg px-2 py-1">
                {copied ? '✅' : '📋'}
              </button>
            </div>
          </div>

          {/* ── Account Email ── */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold text-sm text-[var(--color-ink)]">Account Email</p>
              <p className="text-xs text-[var(--color-muted)]">{user?.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
