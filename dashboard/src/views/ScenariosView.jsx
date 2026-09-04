import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
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

export function ScenariosView({
  user,
  initialFilterStatus = 'all',
  initialFilterOwnership = 'all',
  onSelectScenario,
  onCreateScenario,
  onEditScenario,
}) {
  const isAdmin = user.role === 'admin';

  // Filters
  const [search, setSearch] = useState('');
  const [placement, setPlacement] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState(initialFilterStatus);
  const [ownership, setOwnership] = useState(initialFilterOwnership);
  const [page, setPage] = useState(1);

  // Data
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total_items: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Dropdown & Action Modal
  const [actionModal, setActionModal] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await requestJson('/api/dashboard/categories');
      setCategories(res || []);
    } catch {}
  };

  const fetchScenarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: '10',
      });
      if (search.trim()) params.set('q', search.trim());
      if (placement !== 'all') params.set('placement', placement);
      if (category !== 'all') params.set('category', category);
      if (status !== 'all') params.set('status', status);
      if (ownership !== 'all') params.set('ownership', ownership);

      const res = await requestJson(`/api/dashboard/scenarios?${params.toString()}`);
      setItems(res.items || []);
      setPagination({
        page: res.page || 1,
        page_size: res.page_size || 10,
        total_items: res.total_items || 0,
        total_pages: res.total_pages || 1,
      });
    } catch (err) {
      setError(err.message || 'Failed to load scenarios.');
      toast.error('Failed to load scenarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [page, placement, category, status, ownership]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchScenarios();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const clearFilters = () => {
    setSearch('');
    setPlacement('all');
    setCategory('all');
    setStatus('all');
    setOwnership('all');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    placement !== 'all' ||
    category !== 'all' ||
    status !== 'all' ||
    ownership !== 'all';

  const handleRowAction = async (actionType, scenarioId) => {
    try {
      if (actionType === 'publish') {
        await requestJson(`/api/dashboard/scenarios/${scenarioId}/publish`, { method: 'POST' });
        toast.success('Scenario published successfully!');
      } else if (actionType === 'submit') {
        await requestJson(`/api/dashboard/scenarios/${scenarioId}/submit`, { method: 'POST' });
        toast.success('Scenario submitted for review.');
      } else if (actionType === 'deactivate') {
        await requestJson(`/api/dashboard/scenarios/${scenarioId}/deactivate`, { method: 'POST' });
        toast.success('Scenario marked inactive.');
      } else if (actionType === 'archive') {
        await requestJson(`/api/dashboard/scenarios/${scenarioId}/archive`, { method: 'POST' });
        toast.success('Scenario archived.');
      } else if (actionType === 'restore') {
        await requestJson(`/api/dashboard/scenarios/${scenarioId}/restore`, { method: 'POST' });
        toast.success('Scenario restored.');
      } else if (actionType === 'duplicate') {
        const res = await requestJson(`/api/dashboard/scenarios/${scenarioId}/duplicate`, { method: 'POST' });
        toast.success('Scenario duplicated as Draft!');
        if (onEditScenario && res.scenario_id) {
          onEditScenario(res.scenario_id);
          return;
        }
      }
      setActionModal(null);
      fetchScenarios();
    } catch (err) {
      toast.error(err.message || 'Action failed.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Scenarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Single catalog for all speaking scenarios across Guided Topics and Scenario Library.
          </p>
        </div>
        <Button
          type="button"
          onClick={onCreateScenario}
        >
          <Plus className="size-4" />
          Create Scenario
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(300px,2fr)_repeat(4,minmax(140px,1fr))_auto]">
          {/* Search Box */}
          <div className="relative min-w-0">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, role, task, or location..."
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

          {/* Placement Filter */}
          <select
            value={placement}
            onChange={(e) => {
              setPlacement(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Placements</option>
            <option value="guided_topics">Guided Topics</option>
            <option value="scenario_library">Scenario Library</option>
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

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
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>

          {/* Ownership Filter */}
          <select
            value={ownership}
            onChange={(e) => {
              setOwnership(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All Owners</option>
            <option value="system">Engora Master</option>
            <option value="mine">My Scenarios</option>
          </select>

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

      {/* Scenarios Table */}
      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchScenarios} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={hasActiveFilters ? 'No matching scenarios' : 'No scenarios found'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search query or removing filters.'
              : 'Create your first speaking scenario to get started.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Create Scenario'}
          onAction={hasActiveFilters ? clearFilters : onCreateScenario}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/50 text-muted-foreground">
                  <TableHead className="py-3 px-4">Title & Placement</TableHead>
                  <TableHead className="py-3 px-4">Category</TableHead>
                  <TableHead className="py-3 px-4">AI Partner</TableHead>
                  <TableHead className="py-3 px-4">Owner</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4">Updated</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {items.map((item) => {
                  const isOwner = String(item.owner?.user_id) === String(user.userId);
                  const canEdit = isAdmin || (isOwner && item.status === 'draft');

                  return (
                    <TableRow
                      key={item.scenario_id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => onSelectScenario(item.scenario_id)}
                    >
                      {/* Title & Placements */}
                      <TableCell className="py-3.5 px-4 min-w-[220px]">
                        <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.placements?.map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                            >
                              {p === 'guided_topics' ? 'Guided' : 'Library'}
                            </span>
                          ))}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        {item.category_ids?.length ? (
                          <span className="font-medium text-foreground capitalize">
                            {item.category_ids.join(', ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>

                      {/* AI Partner */}
                      <TableCell className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{item.ai_partner?.display_name || 'AI Character'}</div>
                        <div className="text-[10px] text-muted-foreground">{item.ai_partner?.role}</div>
                      </TableCell>

                      {/* Owner */}
                      <TableCell className="py-3.5 px-4 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {item.owner?.display_name || 'System Admin'}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </TableCell>

                      {/* Updated Date */}
                      <TableCell className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>

                      {/* Actions Menu */}
                      <TableCell
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            onClick={() => onSelectScenario(item.scenario_id)}
                            variant="ghost"
                            size="icon-sm"
                            title="View Details"
                          >
                            <Eye className="size-4" />
                          </Button>

                          {canEdit && (
                            <Button
                              type="button"
                              onClick={() => onEditScenario(item.scenario_id)}
                              variant="ghost"
                              size="icon-sm"
                              title="Edit Scenario"
                            >
                              <Edit3 className="size-4" />
                            </Button>
                          )}

                          <Button
                            type="button"
                            onClick={() => handleRowAction('duplicate', item.scenario_id)}
                            variant="ghost"
                            size="icon-sm"
                            title="Duplicate Scenario"
                          >
                            <Copy className="size-4" />
                          </Button>

                          {/* Quick Lifecycle Buttons */}
                          {isAdmin && item.status !== 'published' && item.status !== 'archived' && (
                            <Button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  type: 'publish',
                                  id: item.scenario_id,
                                  title: 'Publish Scenario',
                                  desc: `Publish "${item.title}" for mobile learners?`,
                                })
                              }
                              variant="ghost"
                              size="icon-sm"
                              className="text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700"
                              title="Publish"
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                          )}

                          {!isAdmin && isOwner && item.status === 'draft' && (
                            <Button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  type: 'submit',
                                  id: item.scenario_id,
                                  title: 'Submit for Review',
                                  desc: `Submit "${item.title}" for Admin review?`,
                                })
                              }
                              variant="ghost"
                              size="icon-sm"
                              className="text-sky-700 hover:bg-sky-500/10 hover:text-sky-700"
                              title="Submit for Review"
                            >
                              <Send className="size-4" />
                            </Button>
                          )}
                          {isAdmin && item.status !== 'archived' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title="Delete Scenario"
                              onClick={() =>
                                setActionModal({
                                  type: 'archive',
                                  id: item.scenario_id,
                                  title: 'Delete Scenario',
                                  desc: `Remove "${item.title}" from the active catalog? It can still be restored from Archived scenarios.`,
                                  isDestructive: true,
                                })
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs">
              <span className="text-muted-foreground">
                Showing page <strong className="text-foreground">{pagination.page}</strong> of{' '}
                <strong className="text-foreground">{pagination.total_pages}</strong> ({pagination.total_items} total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      <ConfirmModal
        isOpen={Boolean(actionModal)}
        title={actionModal?.title}
        description={actionModal?.desc}
        confirmLabel={actionModal?.title}
        isDestructive={actionModal?.isDestructive}
        onConfirm={() => handleRowAction(actionModal?.type, actionModal?.id)}
        onCancel={() => setActionModal(null)}
      />
    </div>
  );
}
