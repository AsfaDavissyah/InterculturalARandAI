import React, { useEffect, useState } from 'react';
import { Key, Save } from 'lucide-react';
import { toast } from 'sonner';
import { requestJson } from '../lib/api-client';
import {
  CopyableCode,
  ErrorBanner,
  LoadingSkeleton,
  StatusBadge,
} from '../components/CommonUI';

export function ProfileView({ user, onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit fields
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await requestJson('/api/dashboard/profile');
      setProfile(res);
      setName(res.name || user.name || '');
    } catch (err) {
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name cannot be empty.');
    if (newPassword && !currentPassword) {
      return toast.error('Please enter your current password to set a new password.');
    }
    if (newPassword && newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }

    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const res = await requestJson('/api/dashboard/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      toast.success(res.message || 'Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      if (onProfileUpdated && res.user) {
        onProfileUpdated(res.user);
      }
      fetchProfile();
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton rows={6} className="p-6 max-w-xl mx-auto" />;
  }

  if (error || !profile) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <ErrorBanner message={error || 'Profile unavailable.'} onRetry={fetchProfile} />
      </div>
    );
  }

  const isLecturer = profile.role === 'lecturer';

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal details, credentials, and research connectivity.
        </p>
      </div>

      {/* Lecturer Research Code Banner */}
      {isLecturer && profile.lecturer_code && (
        <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Your Research Connection Code
            </span>
            <CopyableCode code={profile.lecturer_code} />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Give this code to your students during registration so their practice data links directly to your cohort.
          </p>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-foreground">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm bg-background text-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-3.5 py-2.5 rounded-lg border border-border text-sm bg-muted/40 text-muted-foreground cursor-not-allowed font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
          <div>
            <StatusBadge status={profile.role} />
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Key className="size-4 text-primary" /> Change Password (Optional)
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-3.5 py-2 rounded-lg border border-border text-xs bg-background text-foreground"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            <Save className="size-3.5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
