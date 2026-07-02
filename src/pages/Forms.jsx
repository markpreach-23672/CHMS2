import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, FileText, FolderPlus, Pencil, Share2, Download, Archive, Trash2, BarChart3, Folder } from 'lucide-react';
import FormBuilder from '@/components/forms/FormBuilder';
import ResponsesView from '@/components/forms/ResponsesView';
import ShareFormDialog from '@/components/forms/ShareFormDialog';
import { FORM_TEMPLATES } from '@/components/forms/formTemplates';
import moment from 'moment';

export default function Forms() {
  const [forms, setForms] = useState([]);
  const [folders, setFolders] = useState([]);
  const [entries, setEntries] = useState([]);
  const [tags, setTags] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [responsesForm, setResponsesForm] = useState(null);
  const [shareForm, setShareForm] = useState(null);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [f, fld, e, t, wf, p] = await Promise.all([
        base44.entities.Form.list(),
        base44.entities.FormFolder.list(),
        base44.entities.FormEntry.list(),
        base44.entities.Tag.list(),
        base44.entities.Workflow.list(),
        base44.entities.Person.list(),
      ]);
      setForms(f);
      setFolders(fld.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setEntries(e);
      setTags(t);
      setWorkflows(wf);
      setPeople(p);
    } catch (err) {
      console.error('Failed to load forms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getEntryCount = (formId) => entries.filter((e) => e.form_id === formId).length;

  const handleCreateFromTemplate = async (template) => {
    try {
      const created = await base44.entities.Form.create({
        title: template.name,
        description: template.description,
        fields: template.fields,
        submit_button_text: template.submit_button_text,
        confirmation_message: template.confirmation_message,
        template_type: template.template_type,
        is_active: true,
      });
      setForms((prev) => [...prev, created]);
      setShowTemplatePicker(false);
      setEditingForm(created);
    } catch (err) {
      alert('Failed to create form.');
    }
  };

  const handleSaveForm = async (formData) => {
    try {
      if (editingForm?.id) {
        const updated = await base44.entities.Form.update(editingForm.id, formData);
        setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      } else {
        const created = await base44.entities.Form.create(formData);
        setForms((prev) => [...prev, created]);
      }
      setEditingForm(null);
    } catch (err) {
      alert('Failed to save form.');
    }
  };

  const handleArchive = async (form) => {
    try {
      await base44.entities.Form.update(form.id, { is_archived: !form.is_archived });
      setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, is_archived: !form.is_archived } : f)));
    } catch (err) {
      alert('Failed to archive form.');
    }
  };

  const handleDelete = async (form) => {
    if (!confirm(`Delete "${form.title}" and all its responses? This cannot be undone.`)) return;
    try {
      const formEntries = entries.filter((e) => e.form_id === form.id);
      await Promise.all(formEntries.map((e) => base44.entities.FormEntry.delete(e.id)));
      await base44.entities.Form.delete(form.id);
      setForms((prev) => prev.filter((f) => f.id !== form.id));
      setEntries((prev) => prev.filter((e) => e.form_id !== form.id));
    } catch (err) {
      alert('Failed to delete form.');
    }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const created = await base44.entities.FormFolder.create({ name: folderName });
      setFolders((prev) => [...prev, created]);
      setFolderName('');
      setShowFolderForm(false);
    } catch (err) {
      alert('Failed to create folder.');
    }
  };

  const filteredForms = forms.filter((f) => {
    if (showArchived) return f.is_archived;
    if (f.is_archived) return false;
    if (activeFolder === null) return !f.folder_id;
    return f.folder_id === activeFolder;
  });

  const folderForms = (folderId) => forms.filter((f) => f.folder_id === folderId && !f.is_archived).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Forms</h1>
          <p className="text-slate-500 text-sm mt-1">Build custom forms for registrations, surveys, and more.</p>
        </div>
        <Button onClick={() => setShowTemplatePicker(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1.5" /> New Form
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0">
          <button onClick={() => { setActiveFolder(null); setShowArchived(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!showArchived && activeFolder === null ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            All Forms
          </button>
          <div className="mt-1">
            {folders.map((folder) => (
              <button key={folder.id} onClick={() => { setActiveFolder(folder.id); setShowArchived(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${!showArchived && activeFolder === folder.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Folder size={14} className="text-slate-400" />
                {folder.name}
                <span className="ml-auto text-xs text-slate-400">{folderForms(folder.id)}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShowFolderForm(true)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2 mt-1">
            <FolderPlus size={14} /> New Folder
          </button>
          <button onClick={() => { setActiveFolder(null); setShowArchived(true); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mt-2 ${showArchived ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-50'}`}>
            Archived
          </button>
        </div>

        {/* Form List */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-16 text-sm text-slate-400">Loading...</div>
          ) : filteredForms.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400 mb-3">No forms yet. Create your first form to get started.</p>
              <Button onClick={() => setShowTemplatePicker(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus size={16} className="mr-1.5" /> New Form
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredForms.map((form) => {
                const count = getEntryCount(form.id);
                return (
                  <div key={form.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{form.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{form.description || 'No description'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded-md hover:bg-slate-100 ml-2">
                          <MoreHorizontal size={16} className="text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingForm(form)}><Pencil size={14} className="mr-1.5" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResponsesForm(form)}><BarChart3 size={14} className="mr-1.5" />Responses ({count})</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShareForm(form)}><Share2 size={14} className="mr-1.5" />Share</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(form)}><Archive size={14} className="mr-1.5" />{form.is_archived ? 'Unarchive' : 'Archive'}</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(form)}><Trash2 size={14} className="mr-1.5" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                      <span>{form.fields?.length || 0} fields</span>
                      <span>·</span>
                      <span>{count} {count === 1 ? 'response' : 'responses'}</span>
                      {form.template_type && form.template_type !== 'blank' && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{form.template_type}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Template Picker */}
      {showTemplatePicker && (
        <Dialog open onOpenChange={() => setShowTemplatePicker(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Choose a Form Template</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              {FORM_TEMPLATES.map((tpl) => (
                <button key={tpl.id} onClick={() => handleCreateFromTemplate(tpl)}
                  className="text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
                  <div className="text-2xl mb-1">{tpl.emoji}</div>
                  <h3 className="font-semibold text-sm text-slate-900">{tpl.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplatePicker(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Folder Form */}
      {showFolderForm && (
        <Dialog open onOpenChange={() => setShowFolderForm(false)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>New Folder</DialogTitle></DialogHeader>
            <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="Folder name" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFolderForm(false)}>Cancel</Button>
              <Button onClick={handleCreateFolder} className="bg-indigo-600 hover:bg-indigo-700">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Form Builder */}
      {editingForm && (
        <FormBuilder
          form={editingForm}
          tags={tags}
          workflows={workflows}
          onSave={handleSaveForm}
          onClose={() => setEditingForm(null)}
        />
      )}

      {/* Responses */}
      {responsesForm && (
        <ResponsesView
          form={responsesForm}
          entries={entries.filter((e) => e.form_id === responsesForm.id)}
          people={people}
          onClose={() => setResponsesForm(null)}
        />
      )}

      {/* Share */}
      {shareForm && (
        <ShareFormDialog form={shareForm} onClose={() => setShareForm(null)} />
      )}
    </div>
  );
}