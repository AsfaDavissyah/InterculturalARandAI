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
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

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
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Roster</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Learners connected to your research cohort using code{' '}
          <strong className="text-foreground font-mono">{user.lecturerCode || 'DR-CODE'}</strong>.
        </p>
      </div>

      {/* Search Filter */}
      <div className="relative w-full max-w-xl">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, NIM, or email..."
            className="h-10 pl-10!"
          />
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
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/50 text-muted-foreground">
                  <TableHead className="py-3 px-4">Student Name</TableHead>
                  <TableHead className="py-3 px-4">Student ID (NIM)</TableHead>
                  <TableHead className="py-3 px-4">Email</TableHead>
                  <TableHead className="py-3 px-4">Practices (Completed)</TableHead>
                  <TableHead className="py-3 px-4">Average Score</TableHead>
                  <TableHead className="py-3 px-4 text-right">Last Practice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {filtered.map((st) => (
                  <TableRow key={st.id} className="hover:bg-muted/30 transition-colors">
                    {/* Name */}
                    <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
                          {st.name?.charAt(0) || 'S'}
                        </div>
                        <div className="text-sm text-foreground">{st.name}</div>
                      </div>
                    </TableCell>

                    {/* Student ID */}
                    <TableCell className="py-3.5 px-4 font-mono text-muted-foreground">{st.student_id || '—'}</TableCell>

                    {/* Email */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground">{st.email}</TableCell>

                    {/* Practice count */}
                    <TableCell className="py-3.5 px-4 font-medium text-foreground">
                      {st.practice_count ?? 0} sessions{' '}
                      <span className="text-muted-foreground text-[11px]">({st.completed_count ?? 0} done)</span>
                    </TableCell>

                    {/* Avg score */}
                    <TableCell className="py-3.5 px-4">
                      {isNumericScore(st.average_score) ? (
                        <span className="font-bold text-foreground">
                          {formatScore(st.average_score)} <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    {/* Last practice */}
                    <TableCell className="py-3.5 px-4 text-right text-muted-foreground whitespace-nowrap">
                      {st.last_practice
                        ? new Date(st.last_practice).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
