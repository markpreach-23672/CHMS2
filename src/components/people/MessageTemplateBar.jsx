import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Bookmark, Plus, FileText } from 'lucide-react';

export default function MessageTemplateBar({ type, value, onApply }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    base44.entities.MessageTemplate.filter({ type })
      .then((t) => setTemplates(t))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const handleSelect = (templateId) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) onApply(tpl);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      const created = await base44.entities.MessageTemplate.create({
        name: name.trim(),
        type,
        subject: value.subject || '',
        body: value.body || '',
      });
      setTemplates((prev) => [...prev, created]);
      setShowSave(false);
      setName('');
    } catch (err) {
      alert('Failed to save template.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <FileText size={14} className="text-slate-400 flex-shrink-0" />
      <Select onValueChange={handleSelect}>
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue placeholder={loading ? 'Loading templates...' : 'Load a template'} />
        </SelectTrigger>
        <SelectContent>
          {templates.length === 0 ? (
            <SelectItem value="_none" disabled>No templates saved yet</SelectItem>
          ) : (
            templates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" onClick={() => setShowSave(true)}>
        <Plus size={13} className="mr-1" />
        Save as template
      </Button>

      {showSave && (
        <Dialog open onOpenChange={setShowSave}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bookmark size={16} className="text-indigo-600" />
                Save Message Template
              </DialogTitle>
            </DialogHeader>
            <div>
              <Label className="text-xs font-medium text-slate-600">Template name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome text"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleSave()}
              />
              <p className="text-xs text-slate-400 mt-2">
                Saves the current {type === 'email' ? 'subject and body' : 'message'} as a reusable template.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSave(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}