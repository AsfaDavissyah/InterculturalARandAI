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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Scenarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Single catalog for all speaking scenarios across Guided Topics and Scenario Library.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateScenario}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Create Scenario
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, role, task, or location..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
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
            className="px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground font-medium"
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
            className="px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground font-medium max-w-[180px]"
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
            className="px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground font-medium"
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
            className="px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground font-medium"
          >
            <option value="all">All Owners</option>
            <option value="system">Engora Master</option>
            <option value="mine">My Scenarios</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              Clear Filters
            </button>
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
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4">Title & Placement</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">AI Partner</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => {
                  const isOwner = String(item.owner?.user_id) === String(user.userId);
                  const canEdit = isAdmin || (isOwner && item.status === 'draft');

                  return (
                    <tr
                      key={item.scenario_id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => onSelectScenario(item.scenario_id)}
                    >
                      {/* Title & Placements */}
                      <td className="py-3.5 px-4 min-w-[220px]">
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
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {item.category_ids?.length ? (
                          <span className="font-medium text-foreground capitalize">
                            {item.category_ids.join(', ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* AI Partner */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground">{item.ai_partner?.display_name || 'AI Character'}</div>
                        <div className="text-[10px] text-muted-foreground">{item.ai_partner?.role}</div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {item.owner?.display_name || 'System Admin'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Updated Date */}
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions Menu */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectScenario(item.scenario_id)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="View Details"
                          >
                            <Eye className="size-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEditScenario(item.scenario_id)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              title="Edit Scenario"
                            >
                              <Edit3 className="size-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRowAction('duplicate', item.scenario_id)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            title="Duplicate Scenario"
                          >
                            <Copy className="size-4" />
                          </button>

                          {/* Quick Lifecycle Buttons */}
                          {isAdmin && item.status !== 'published' && item.status !== 'archived' && (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  type: 'publish',
                                  id: item.scenario_id,
                                  title: 'Publish Scenario',
                                  desc: `Publish "${item.title}" for mobile learners?`,
                                })
                              }
                              className="p-1.5 rounded-md hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-all"
                              title="Publish"
                            >
                              <CheckCircle className="size-4" />
                            </button>
                          )}

                          {!isAdmin && isOwner && item.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() =>
                                setActionModal({
                                  type: 'submit',
                                  id: item.scenario_id,
                                  title: 'Submit for Review',
                                  desc: `Submit "${item.title}" for Admin review?`,
                                })
                              }
                              className="p-1.5 rounded-md hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-all"
                              title="Submit for Review"
                            >
                              <Send className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
