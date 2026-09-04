import React, { useEffect, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import { formatScore, isNumericScore } from '../lib/display-format';
import {
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
} from '../components/CommonUI';

export function StudentsView({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson('/api/dashboard/students');
      setStudents(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load students.');
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.student_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Roster</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Learners connected to your research cohort using code{' '}
          <strong className="text-foreground font-mono">{user.lecturerCode || 'DR-CODE'}</strong>.
        </p>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, NIM, or email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
          />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchStudents} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={search ? 'No students matching search' : 'No students connected yet'}
          description={
            search
              ? 'Try adjusting your search terms.'
              : `Share your research code "${user.lecturerCode || 'CODE'}" with students to have them connect.`
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Student ID (NIM)</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Practices (Completed)</th>
                  <th className="py-3 px-4">Average Score</th>
                  <th className="py-3 px-4 text-right">Last Practice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                          {st.name?.charAt(0) || 'S'}
                        </div>
                        <div className="text-sm text-foreground">{st.name}</div>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">{st.student_id || '—'}</td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-muted-foreground">{st.email}</td>

                    {/* Practice count */}
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {st.practice_count ?? 0} sessions{' '}
                      <span className="text-muted-foreground text-[11px]">({st.completed_count ?? 0} done)</span>
                    </td>

                    {/* Avg score */}
                    <td className="py-3.5 px-4">
                      {isNumericScore(st.average_score) ? (
                        <span className="font-bold text-foreground">
                          {formatScore(st.average_score)} <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    {/* Last practice */}
                    <td className="py-3.5 px-4 text-right text-muted-foreground whitespace-nowrap">
                      {st.last_practice
                        ? new Date(st.last_practice).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
