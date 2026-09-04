import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Building,
  Coffee,
  Compass,
  Edit2,
  Globe,
  Layers,
  MessageSquare,
  Plus,
  RotateCcw,
  School,
  Sparkles,
  Trash2,
  Users,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

const AVAILABLE_ICONS = [
  { key: 'school', label: 'School', icon: School },
  { key: 'coffee', label: 'Coffee / Cafe', icon: Coffee },
  { key: 'building', label: 'Building / Workplace', icon: Building },
  { key: 'users', label: 'Community / Friends', icon: Users },
  { key: 'message-square', label: 'Conversation', icon: MessageSquare },
  { key: 'book-open', label: 'Academics', icon: BookOpen },
  { key: 'compass', label: 'Travel & Orientation', icon: Compass },
  { key: 'globe', label: 'Global / Culture', icon: Globe },
  { key: 'sparkles', label: 'General / Creative', icon: Sparkles },
];

export function CategoriesView() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_key: 'school',
  });
  const [saving, setSaving] = useState(false);
  const [archiveModal, setArchiveModal] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson('/api/dashboard/categories?include_archived=true');
      setCategories(res || []);
    } catch {
      setError(err.message || 'Failed to load categories.');
      toast.error('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon_key: 'school' });
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      icon_key: category.icon_key || 'school',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      toast.error('Category Name must be at least 3 characters.');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await requestJson(`/api/dashboard/categories/${editingCategory.category_id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Category updated successfully.');
      } else {
        await requestJson('/api/dashboard/categories', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Category created successfully.');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setCategories(updated);
    try {
      const orderedIds = updated.map((c) => c.category_id);
      await requestJson('/api/dashboard/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ ordered_ids: orderedIds }),
      });
      toast.success('Category order updated.');
    } catch {
      toast.error('Failed to update category order.');
      fetchCategories();
    }
  };

  const handleArchive = async (categoryId) => {
    try {
      await requestJson(`/api/dashboard/categories/${categoryId}/archive`, { method: 'POST' });
      toast.success('Category archived.');
      setArchiveModal(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to archive category.');
    }
  };

  const handleRestore = async (categoryId) => {
    try {
      await requestJson(`/api/dashboard/categories/${categoryId}/restore`, { method: 'POST' });
      toast.success('Category restored.');
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to restore category.');
    }
  };

  const renderIcon = (iconKey) => {
    const found = AVAILABLE_ICONS.find((i) => i.key === iconKey) || AVAILABLE_ICONS[0];
    const IconComponent = found.icon;
    return <IconComponent className="size-4 text-primary" />;
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organize Guided Topics with clear names, icons, and student-facing order.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreateModal}
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchCategories} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No categories found"
          description="Create your first category to group Guided Topics."
          actionLabel="Add Category"
          onAction={openCreateModal}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/50 text-muted-foreground">
                  <TableHead className="py-3 px-4 w-12 text-center">Order</TableHead>
                  <TableHead className="py-3 px-4">Category Name & Icon</TableHead>
                  <TableHead className="py-3 px-4">Description</TableHead>
                  <TableHead className="py-3 px-4">Scenarios</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {categories.map((cat, idx) => (
                  <TableRow key={cat.category_id} className="hover:bg-muted/30 transition-colors">
                    {/* Move Up/Down Controls */}
                    <TableCell className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>

                    {/* Name & Icon */}
                    <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                          {renderIcon(cat.icon_key)}
                        </div>
                        <div>
                          <div className="text-sm text-foreground">{cat.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{cat.category_id}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Description */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground max-w-xs truncate">
                      {cat.description || '—'}
                    </TableCell>

                    {/* Published Scenarios Count */}
                    <TableCell className="py-3.5 px-4">
                      <span className="font-semibold text-foreground">
                        {cat.published_scenario_count ?? 0} published
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5 px-4">
                      <StatusBadge status={cat.status || 'active'} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          variant="ghost"
                          size="icon-sm"
                          title="Edit Category"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        {cat.status === 'archived' ? (
                          <Button
                            type="button"
                            onClick={() => handleRestore(cat.category_id)}
                            variant="ghost"
                            size="icon-sm"
                            className="text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700"
                            title="Restore Category"
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={() =>
                              setArchiveModal({
                                id: cat.category_id,
                                name: cat.name,
                              })
                            }
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Delete Category"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-xl rounded-2xl p-6 max-w-lg w-full space-y-5">
            <h3 className="text-base font-bold text-foreground">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Social & Everyday Life"
                  className="w-full px-3.5 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short explanation for students..."
                  className="w-full px-3.5 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>

              {/* Icon Picker Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Category Icon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = formData.icon_key === item.key;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon_key: item.key })}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'border-border bg-background hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        <IconComp className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      <ConfirmModal
        isOpen={Boolean(archiveModal)}
        title="Delete Category"
        description={`Remove "${archiveModal?.name}" from active Categories? This recoverable action is allowed only after its Guided Topics scenarios have been moved or removed.`}
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={() => handleArchive(archiveModal?.id)}
        onCancel={() => setArchiveModal(null)}
      />
    </div>
  );
}
