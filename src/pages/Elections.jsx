import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Vote, Pencil, Trash2, BarChart3, CheckCircle, Lock, Unlock, Share2, X } from 'lucide-react';
import moment from 'moment';

export default function Elections() {
  const [elections, setElections] = useState([]);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [resultsElection, setResultsElection] = useState(null);
  const [shareElection, setShareElection] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [e, v] = await Promise.all([
        base44.entities.Election.list(),
        base44.entities.Vote.list(),
      ]);
      setElections(e);
      setVotes(v);
    } catch (err) {
      console.error('Failed to load elections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getVoteCount = (electionId) => votes.filter((v) => v.election_id === electionId).length;

  const handleSave = async (data) => {
    try {
      if (editing?.id) {
        const updated = await base44.entities.Election.update(editing.id, data);
        setElections((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      } else {
        const created = await base44.entities.Election.create(data);
        setElections((prev) => [...prev, created]);
      }
      setEditing(null);
    } catch (err) {
      alert('Failed to save election.');
    }
  };

  const handleToggleStatus = async (election) => {
    const newStatus = election.status === 'open' ? 'closed' : 'open';
    try {
      const updated = await base44.entities.Election.update(election.id, { status: newStatus, is_public: newStatus === 'open' ? true : election.is_public });
      setElections((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      alert('Failed to update election status.');
    }
  };

  const handleDelete = async (election) => {
    if (!confirm(`Delete "${election.title}" and all votes?`)) return;
    try {
      const electionVotes = votes.filter((v) => v.election_id === election.id);
      await Promise.all(electionVotes.map((v) => base44.entities.Vote.delete(v.id)));
      await base44.entities.Election.delete(election.id);
      setElections((prev) => prev.filter((e) => e.id !== election.id));
      setVotes((prev) => prev.filter((v) => v.election_id !== election.id));
    } catch (err) {
      alert('Failed to delete election.');
    }
  };

  const statusBadge = (status) => {
    const styles = { draft: 'bg-slate-100 text-slate-600', open: 'bg-emerald-100 text-emerald-700', closed: 'bg-slate-100 text-slate-500' };
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status] || styles.draft}`}>{status.toUpperCase()}</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Elections & Voting</h1>
          <p className="text-slate-500 text-sm mt-1">Create elections, manage candidates, and tally congregational votes.</p>
        </div>
        <Button onClick={() => setEditing({})} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1.5" /> New Election
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm text-slate-400">Loading...</div>
      ) : elections.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Vote size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-400 mb-3">No elections yet. Create your first election to get started.</p>
          <Button onClick={() => setEditing({})} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} className="mr-1.5" /> New Election
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {elections.map((election) => {
            const count = getVoteCount(election.id);
            return (
              <div key={election.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{election.title}</h3>
                      {statusBadge(election.status)}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{election.description || 'No description'}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1 rounded-md hover:bg-slate-100 ml-2">
                      <MoreHorizontal size={16} className="text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(election)}><Pencil size={14} className="mr-1.5" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(election)}>
                        {election.status === 'open' ? <><Lock size={14} className="mr-1.5" />Close Voting</> : <><Unlock size={14} className="mr-1.5" />Open Voting</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setResultsElection(election)}><BarChart3 size={14} className="mr-1.5" />View Results ({count})</DropdownMenuItem>
                      {election.status === 'open' && <DropdownMenuItem onClick={() => setShareElection(election)}><Share2 size={14} className="mr-1.5" />Share Voting Link</DropdownMenuItem>}
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(election)}><Trash2 size={14} className="mr-1.5" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                  <span>{election.candidates?.length || 0} candidates</span>
                  <span>·</span>
                  <span>{count} {count === 1 ? 'vote' : 'votes'}</span>
                  {election.max_votes_per_person > 1 && (
                    <><span>·</span><span>{election.max_votes_per_person} votes/person</span></>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ElectionEditor
          election={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {resultsElection && (
        <ResultsDialog
          election={resultsElection}
          votes={votes.filter((v) => v.election_id === resultsElection.id)}
          onClose={() => setResultsElection(null)}
        />
      )}

      {shareElection && (
        <ShareElectionDialog
          election={shareElection}
          onClose={() => setShareElection(null)}
        />
      )}
    </div>
  );
}

function ElectionEditor({ election, onSave, onClose }) {
  const [title, setTitle] = useState(election.title || '');
  const [description, setDescription] = useState(election.description || '');
  const [candidates, setCandidates] = useState(election.candidates || ['']);
  const [maxVotes, setMaxVotes] = useState(election.max_votes_per_person || 1);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { alert('Please enter a title.'); return; }
    const filtered = candidates.map((c) => c.trim()).filter(Boolean);
    if (filtered.length < 2) { alert('Please add at least 2 candidates.'); return; }
    setSaving(true);
    await onSave({
      title,
      description,
      candidates: filtered,
      max_votes_per_person: maxVotes,
      status: election.status || 'draft',
    });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{election.id ? 'Edit Election' : 'New Election'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-slate-500">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-0.5" placeholder="Board Election 2026" />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-0.5" rows={2} placeholder="Vote for our new elder board members..." />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Candidates</Label>
            <div className="space-y-1.5 mt-1">
              {candidates.map((c, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input value={c} onChange={(e) => setCandidates(candidates.map((x, j) => j === i ? e.target.value : x))} className="h-8 text-sm" placeholder={`Candidate ${i + 1}`} />
                  {candidates.length > 1 && <button onClick={() => setCandidates(candidates.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500 px-1"><X size={14} /></button>}
                </div>
              ))}
              <button onClick={() => setCandidates([...candidates, ''])} className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"><Plus size={12} /> Add Candidate</button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Max Votes Per Person</Label>
            <Input type="number" min="1" value={maxVotes} onChange={(e) => setMaxVotes(parseInt(e.target.value) || 1)} className="mt-0.5" />
            <p className="text-[10px] text-slate-400 mt-0.5">Set to 1 for single-choice, or higher for multi-seat elections.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultsDialog({ election, votes, onClose }) {
  const tally = {};
  for (const v of votes) {
    tally[v.candidate] = (tally[v.candidate] || 0) + 1;
  }
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0]?.[1] || 1;
  const total = votes.length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Results — {election.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{total} total {total === 1 ? 'vote' : 'votes'}</p>
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No votes recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {sorted.map(([candidate, count], idx) => (
                <div key={candidate} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      {idx === 0 && election.status === 'closed' && <CheckCircle size={14} className="text-emerald-500" />}
                      {candidate}
                    </span>
                    <span className="text-slate-500">{count} ({Math.round(count / total * 100)}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareElectionDialog({ election, onClose }) {
  const url = `${window.location.origin}/election/${election.id}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Voting Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Share this link with your congregation. Each person can vote once (validated by email).</p>
          <div className="flex gap-2">
            <Input value={url} readOnly className="text-xs" />
            <Button size="icon" variant="outline" onClick={copy}><Share2 size={14} /></Button>
          </div>
          {copied && <p className="text-xs text-emerald-500">Copied!</p>}
          <div className="text-center pt-2">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(url)}`} alt="QR" width={120} height={120} className="mx-auto" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}