import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { churchSlug, churchLoginUrl } from '@/lib/churchSlug';

const EMPTY = { name: '', email: '', phone: '', site_url: '', custom_domain: '', monthly_rate: '' };

export default function AddChurchDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Church.create({
        name: form.name.trim(),
        subdomain: churchSlug(form.name) || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        site_url: form.site_url || undefined,
        custom_domain: form.custom_domain || undefined,
        monthly_rate: form.monthly_rate ? Number(form.monthly_rate) : 0,
      });
      setForm(EMPTY);
      onOpenChange(false);
      onCreated();
    } catch (err) {
      alert('Failed to add church: ' + (err.message || 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Church</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Church Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="First Community Church" className="mt-1" />
            {form.name.trim() && (
              <p className="text-[11px] text-slate-500 mt-1">
                Login page: <span className="font-medium text-indigo-600">{churchLoginUrl(churchSlug(form.name))}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={form.email} onChange={(e) => set('email', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Web Link (app URL)</Label>
            <Input value={form.site_url} onChange={(e) => set('site_url', e.target.value)} placeholder="https://mychurch.base44.app" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Custom Web Link (optional)</Label>
            <Input value={form.custom_domain} onChange={(e) => set('custom_domain', e.target.value)} placeholder="https://mychurch.org" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Monthly Rate ($)</Label>
            <Input type="number" value={form.monthly_rate} onChange={(e) => set('monthly_rate', e.target.value)} placeholder="99" className="mt-1" />
          </div>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            {saving ? 'Adding...' : 'Add Church'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}