import React, { useEffect, useState } from 'react';
import {
  Edit2,
  Key,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import {
  ConfirmModal,
  CopyableCode,
  EmptyState,
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from '../components/CommonUI';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export function LecturersView() {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [regenModal, setRegenModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'male',
  });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLecturers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson('/api/dashboard/lecturers');
      setLecturers(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load lecturers.');
      toast.error('Failed to load lecturers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLecturers();
  }, []);

  const handleCreateLecturer = async () => {
    if (!formData.name.trim()) return toast.error('Name is required.');
    if (!formData.email.trim()) return toast.error('Email is required.');
    if (!formData.password || formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    setSaving(true);
    try {
      await requestJson('/api/dashboard/lecturers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Lecturer account created successfully.');
      setCreateModalOpen(false);
      setFormData({ name: '', email: '', password: '', gender: 'male' });
      fetchLecturers();
    } catch (err) {
      toast.error(err.message || 'Failed to create lecturer.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLecturer = async () => {
    if (!editModal?.name?.trim()) return toast.error('Name is required.');
    if (!editModal?.email?.trim()) return toast.error('Email is required.');

    setSaving(true);
    try {
      await requestJson(`/api/dashboard/lecturers/${editModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editModal.name, email: editModal.email }),
      });
      toast.success('Lecturer updated.');
      setEditModal(null);
      fetchLecturers();
    } catch (err) {
      toast.error(err.message || 'Failed to update lecturer.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }

    setSaving(true);
    try {
      await requestJson(`/api/dashboard/lecturers/${resetModal.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword }),
      });
      toast.success('Password reset successfully.');
      setResetModal(null);
      setNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async (lecturerId) => {
    try {
      const res = await requestJson(`/api/dashboard/lecturers/${lecturerId}/regenerate-code`, {
        method: 'POST',
      });
      toast.success(`Research code regenerated: ${res.lecturer_code}`);
      setRegenModal(null);
      fetchLecturers();
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate code.');
    }
  };

  const handleStatusChange = async () => {
    if (!statusModal) return;
    const nextStatus = statusModal.status === 'inactive' ? 'active' : 'inactive';
    try {
      await requestJson(`/api/dashboard/lecturers/${statusModal.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      toast.success(`Lecturer account marked ${nextStatus}.`);
      setStatusModal(null);
      fetchLecturers();
    } catch (err) {
      toast.error(err.message || 'Failed to update lecturer status.');
    }
  };

  const filtered = lecturers.filter((l) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.lecturer_code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Lecturers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage participating research lecturers and their unique student connection codes.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateModalOpen(true)}
        >
          <UserPlus className="size-4" />
          Add Lecturer
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative w-full max-w-xl">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or code..."
            className="h-10 pl-10!"
          />
      </div>

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : error ? (
        <ErrorBanner message={error} onRetry={fetchLecturers} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'No lecturers matching search' : 'No lecturers found'}
          description="Add a research lecturer to allow students to link their accounts."
          actionLabel="Add Lecturer"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/50 text-muted-foreground">
                  <TableHead className="py-3 px-4">Lecturer Name</TableHead>
                  <TableHead className="py-3 px-4">Email</TableHead>
                  <TableHead className="py-3 px-4">Research Code</TableHead>
                  <TableHead className="py-3 px-4">Connected Students</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {filtered.map((lec) => (
                  <TableRow key={lec.id} className="hover:bg-muted/30 transition-colors">
                    {/* Name */}
                    <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs uppercase border">
                          {lec.name?.charAt(0) || 'L'}
                        </div>
                        <div>
                          <div className="text-sm text-foreground">{lec.name}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">{lec.gender || 'lecturer'}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="py-3.5 px-4 text-muted-foreground">{lec.email}</TableCell>

                    {/* Research Code */}
                    <TableCell className="py-3.5 px-4">
                      {lec.lecturer_code ? (
                        <CopyableCode code={lec.lecturer_code} />
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    {/* Connected Students */}
                    <TableCell className="py-3.5 px-4">
                      <span className="font-semibold text-foreground">
                        {lec.connected_students_count ?? 0} students
                      </span>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5 px-4">
                      <StatusBadge status={lec.status || 'active'} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          onClick={() => setEditModal(lec)}
                          variant="ghost"
                          size="icon-sm"
                          title="Edit Lecturer"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setRegenModal(lec)}
                          variant="ghost"
                          size="icon-sm"
                          title="Regenerate Research Code"
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setResetModal(lec)}
                          variant="ghost"
                          size="icon-sm"
                          title="Reset Password"
                        >
                          <Key className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setStatusModal(lec)}
                          variant="ghost"
                          size={lec.status === 'inactive' ? 'sm' : 'icon-sm'}
                          className={lec.status === 'inactive'
                            ? 'text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700'
                            : 'text-destructive hover:bg-destructive/10 hover:text-destructive'}
                          title={lec.status === 'inactive' ? 'Restore Lecturer' : 'Delete Lecturer'}
                        >
                          {lec.status === 'inactive' ? 'Restore' : <Trash2 className="size-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Lecturer Modal */}
      <ConfirmModal
        isOpen={Boolean(statusModal)}
        title={statusModal?.status === 'inactive' ? 'Restore Lecturer' : 'Delete Lecturer'}
        description={statusModal?.status === 'inactive'
          ? `Allow ${statusModal?.name} to sign in again?`
          : `Remove ${statusModal?.name} from active lecturers? Sign-in will be disabled while students and research history remain intact.`}
        confirmLabel={statusModal?.status === 'inactive' ? 'Restore' : 'Delete'}
        isDestructive={statusModal?.status !== 'inactive'}
        onConfirm={handleStatusChange}
        onCancel={() => setStatusModal(null)}
      />

      {/* Create Lecturer Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-foreground">Add New Research Lecturer</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Jane Smith"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="lecturer@university.edu"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Initial Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleCreateLecturer}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-foreground">Edit Lecturer</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Full Name</label>
                <input
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">Email Address</label>
                <input
                  type="email"
                  value={editModal.email}
                  onChange={(e) => setEditModal({ ...editModal, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleEditLecturer}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-xl rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-foreground">Reset Password for {resetModal.name}</h3>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 chars)"
                className="w-full px-3 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setResetModal(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleResetPassword}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Code Modal */}
      <ConfirmModal
        isOpen={Boolean(regenModal)}
        title="Regenerate Research Code"
        description={`Regenerate research code for "${regenModal?.name}"? Future student registrations will need the new code.`}
        confirmLabel="Regenerate Code"
        onConfirm={() => handleRegenerateCode(regenModal?.id)}
        onCancel={() => setRegenModal(null)}
      />
    </div>
  );
}
