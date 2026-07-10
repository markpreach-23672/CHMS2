import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ArticlesManager() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'General' });
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    try {
      setArticles(await base44.entities.HelpDeskArticle.list('-created_date'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ title: '', body: '', category: 'General' });
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (a) => {
    setForm({ title: a.title, body: a.body || '', category: a.category || 'General' });
    setEditing(a);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    try {
      if (editing) {
        await base44.entities.HelpDeskArticle.update(editing.id, form);
      } else {
        await base44.entities.HelpDeskArticle.create({ ...form, is_active: true });
      }
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this article?')) return;
    try {
      await base44.entities.HelpDeskArticle.delete(id);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke('seedHelpArticles', {});
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">
          {articles.length} article{articles.length !== 1 ? 's' : ''} — the AI answers from these.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={seed} disabled={seeding}>
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Add starter articles
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> New article
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Loading…</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400 mb-3">No help articles yet. Add some or use the starter set.</p>
          <Button size="sm" variant="outline" onClick={seed} disabled={seeding}>
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Add starter articles
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 p-4 rounded-lg border border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-slate-900 truncate">{a.title}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {a.category || 'General'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.body}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                  <Pencil size={14} />
                </button>
                <button onClick={() => remove(a.id)} className="p-1.5 rounded hover:bg-rose-50 text-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit article' : 'New help article'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Service Times" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="General" />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the answer the AI should give members…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!form.title.trim() || !form.body.trim()}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}