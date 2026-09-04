import React, { useEffect, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MessageSquare,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import { cleanDisplayText, formatScore, isNumericScore } from '../lib/display-format';
import {
  ConfirmModal,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from '../components/CommonUI';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const SCORE_CATEGORIES = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  fluency: 'Fluency',
  politeness: 'Politeness',
  pragmatic_appropriateness: 'Pragmatic Appropriateness',
  intercultural_awareness: 'Intercultural Awareness',
};

export function PracticeResultsView({ user }) {
  const isAdmin = user.role === 'admin';

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Data
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 15, total_items: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail Modal
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [deleteSessionId, setDeleteSessionId] = useState(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '15',
      });
      if (search.trim()) params.set('q', search.trim());
      if (status !== 'all') params.set('status', status);
      if (minScore) params.set('min_score', minScore);
      if (maxScore) params.set('max_score', maxScore);
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await requestJson(`/api/dashboard/practice-results?${params.toString()}`);
      setItems(res.items || []);
      setPagination({
        page: res.page || 1,
        page_size: res.page_size || 15,
        total_items: res.total_items || 0,
        total_pages: res.total_pages || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load practice results.');
      toast.error('Failed to load practice results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [page, status, minScore, maxScore, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchResults();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSessionDetail = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setDetailLoading(true);
    try {
      const res = await requestJson(`/api/dashboard/practice-results/${sessionId}`);
      setSessionDetail(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load session details.');
      setSelectedSessionId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    try {
      await requestJson(`/api/dashboard/practice-results/${deleteSessionId}`, { method: 'DELETE' });
      toast.success('Practice result deleted.');
      setDeleteSessionId(null);
      fetchResults();
    } catch (err) {
      toast.error(err.message || 'Failed to delete practice result.');
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    const token = localStorage.getItem('engora_auth_session')
      ? JSON.parse(localStorage.getItem('engora_auth_session'))?.token
      : '';

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const exportUrl = `${baseUrl}/api/dashboard/practice-results/export.csv?${params.toString()}`;

    // Trigger authenticated download
    fetch(exportUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to generate CSV.');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `practice_results_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success('CSV exported successfully.');
      })
      .catch((err) => toast.error(err.message || 'Export failed.'));
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setMinScore('');
    setMaxScore('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    status !== 'all' ||
    Boolean(minScore) ||
    Boolean(maxScore) ||
    Boolean(startDate) ||
    Boolean(endDate);
  const sessionScores = sessionDetail?.score_breakdown || sessionDetail?.scores || {};

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header & Export Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Practice Results</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed transcripts, ICC scores, and progress records of student speaking practices.
          </p>
        </div>
        <Button
          type="button"
          onClick={handleExportCsv}
        >
          <Download className="size-4" />
          Export to CSV
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(320px,2fr)_minmax(160px,1fr)_auto_auto] xl:items-center">
          {/* Search Box */}
          <div className="relative min-w-0">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, ID, or scenario..."
              className="h-10 pl-10! pr-9!"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="ended_manually">Ended Manually</option>
          </select>

          {/* Date Range */}
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-10 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>

          {hasActiveFilters && (
            <Button
              type="button"
              onClick={clearFilters}
              variant="ghost"
              className="h-10"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchResults} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={hasActiveFilters ? 'No results match filters' : 'No practice sessions yet'}
          description={
            hasActiveFilters
              ? 'Try changing the date range or clear your search filters.'
              : 'Student speaking session records will appear here as they practice.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/50 text-muted-foreground">
                  <TableHead className="py-3 px-4">Student</TableHead>
                  <TableHead className="py-3 px-4">Scenario Title</TableHead>
                  <TableHead className="py-3 px-4">Category</TableHead>
                  {isAdmin && <TableHead className="py-3 px-4">Lecturer Code</TableHead>}
                  <TableHead className="py-3 px-4">Duration & Turns</TableHead>
                  <TableHead className="py-3 px-4">Overall Score</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4">Date</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {items.map((item) => (
                  <TableRow
                    key={item.session_id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => fetchSessionDetail(item.session_id)}
                  >
                    {/* Student */}
                    <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                      <div>{item.student?.display_name || item.student_name || 'Student'}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {item.student?.student_id || item.student_id || '—'}
                      </div>
                    </TableCell>

                    {/* Scenario Title */}
                    <TableCell className="py-3.5 px-4 font-medium text-foreground max-w-xs truncate">
                      {cleanDisplayText(
                        item.scenario?.title || item.scenario_title || item.setting_title,
                        'Conversation Practice',
                      )}
                    </TableCell>

                    {/* Category */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground capitalize">
                      {item.category_id || 'academic-communication'}
                    </TableCell>

                    {/* Lecturer Code for Admin */}
                    {isAdmin && (
                      <TableCell className="py-3.5 px-4 font-mono text-muted-foreground">
                        {item.lecturer_code || '—'}
                      </TableCell>
                    )}

                    {/* Duration & Turns */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground">
                      <div className="font-medium text-foreground">
                        {Math.floor((item.duration_seconds || 0) / 60)}m {(item.duration_seconds || 0) % 60}s
                      </div>
                      <div className="text-[10px]">
                        {item.total_student_responses ?? item.student_response_count ?? 0} student turns
                      </div>
                    </TableCell>

                    {/* Score */}
                    <TableCell className="py-3.5 px-4">
                      {isNumericScore(item.overall_score) ? (
                        <span className="font-bold text-foreground">
                          {formatScore(item.overall_score)} <span className="text-[10px] text-muted-foreground">/ 5.0</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5 px-4">
                      <StatusBadge status={item.status} />
                    </TableCell>

                    {/* Date */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {item.completed_at
                        ? new Date(item.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        onClick={() => fetchSessionDetail(item.session_id)}
                        variant="ghost"
                        size="sm"
                      >
                        <Eye className="size-3.5 text-muted-foreground" />
                        View
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setDeleteSessionId(item.session_id)}
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Delete Practice Result"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
              <span className="text-muted-foreground">
                Page <strong className="text-foreground">{pagination.page}</strong> of{' '}
                <strong className="text-foreground">{pagination.total_pages}</strong> ({pagination.total_items} items)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteSessionId)}
        title="Delete Practice Result"
        description="Permanently delete this practice result and its transcript? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
        onConfirm={handleDeleteSession}
        onCancel={() => setDeleteSessionId(null)}
      />

      {/* Session Detail Drawer / Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">Practice Session Analysis</h2>
                  {sessionDetail && <StatusBadge status={sessionDetail.status} />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Session ID: {selectedSessionId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSessionId(null);
                  setSessionDetail(null);
                }}
                className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {detailLoading ? (
              <LoadingSkeleton rows={8} />
            ) : sessionDetail ? (
              <div className="space-y-6">
                {/* Metadata & Scores Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Student Info
                    </span>
                    <div className="text-xs font-bold text-foreground">
                      {sessionDetail.student?.display_name || 'Student'}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      NIM: {sessionDetail.student?.student_id || '—'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Scenario
                    </span>
                    <div className="text-xs font-bold text-foreground truncate">
                      {cleanDisplayText(
                        sessionDetail.scenario?.title || sessionDetail.scenario_title || sessionDetail.setting_title,
                        'Speaking Practice',
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Location: {cleanDisplayText(
                        sessionDetail.scenario?.context?.location || sessionDetail.scenario?.ar_scene,
                        'Campus',
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Overall Score
                    </span>
                    <div className="text-xl font-bold text-primary">
                      {formatScore(sessionDetail.overall_score, '0.0')} <span className="text-xs text-muted-foreground">/ 5.0</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {sessionDetail.total_student_responses ?? sessionDetail.student_response_count ?? 0} student responses
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                {Object.keys(sessionScores).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Assessment Rubric Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(sessionScores).map(([crit, score]) => (
                        <div key={crit} className="p-2.5 rounded-lg border border-border bg-background">
                          <div className="text-[11px] text-muted-foreground">
                            {SCORE_CATEGORIES[crit] || crit.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {formatScore(score, '0.0')} / 5.0
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Summary */}
                {sessionDetail.feedback_summary && (
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Feedback Summary</h3>
                    <p className="text-xs text-foreground leading-relaxed font-medium">
                      {sessionDetail.feedback_summary}
                    </p>
                  </div>
                )}

                {/* Full Transcript */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <MessageSquare className="size-4 text-primary" /> Conversation Transcript
                  </h3>
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {sessionDetail.transcript?.length > 0 ? (
                      sessionDetail.transcript.map((msg, i) => {
                        const isAI = msg.sender === 'ai';
                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border text-xs leading-relaxed ${
                              isAI
                                ? 'border-border bg-muted/40 text-foreground mr-8'
                                : 'border-primary/30 bg-primary/10 text-foreground ml-8'
                            }`}
                          >
                            <div className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                              {isAI ? (sessionDetail.scenario?.ai_character?.display_name || 'AI Partner') : 'Student'}
                            </div>
                            <p>{msg.text || msg.message}</p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No transcript recorded for this session.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
