import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, Vote, BarChart3 } from 'lucide-react';

export default function PublicElection() {
  const { electionId } = useParams();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voterName, setVoterName] = useState('');
  const [voterEmail, setVoterEmail] = useState('');
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteError, setVoteError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await base44.functions.invoke('getPublicElection', { election_id: electionId });
        if (res.data?.error) {
          setError(res.data.error);
        } else {
          setElection(res.data);
        }
      } catch (err) {
        setError('Election not found or not available.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [electionId]);

  const handleVote = async () => {
    if (!voterEmail.trim()) { setVoteError('Please enter your email.'); return; }
    if (!selected) { setVoteError('Please select a candidate.'); return; }
    setSubmitting(true);
    setVoteError(null);
    try {
      const res = await base44.functions.invoke('submitElectionVote', {
        election_id: electionId,
        voter_name: voterName,
        voter_email: voterEmail,
        candidate: selected,
      });
      if (res.data?.error) {
        setVoteError(res.data.error);
      } else {
        setVoted(true);
      }
    } catch (err) {
      setVoteError('Failed to submit vote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const isClosed = election.status === 'closed';
  const results = election.results || {};
  const sortedResults = Object.entries(results).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedResults[0]?.[1] || 1;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-indigo-600">
            <div className="flex items-center gap-2.5">
              <Vote size={24} className="text-white" />
              <div>
                <h1 className="text-xl font-bold text-white">{election.title}</h1>
                <p className="text-sm text-indigo-200">{election.total_votes} {election.total_votes === 1 ? 'vote' : 'votes'} cast</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {election.description && <p className="text-sm text-slate-600 mb-5">{election.description}</p>}

            {voted ? (
              <div className="text-center py-8">
                <CheckCircle size={48} className="mx-auto text-emerald-500 mb-3" />
                <h2 className="text-lg font-bold text-slate-900 mb-1">Vote Submitted!</h2>
                <p className="text-sm text-slate-500">Thank you for participating. Your vote has been recorded.</p>
              </div>
            ) : isClosed ? (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  <BarChart3 size={14} /> Final Results
                </div>
                {sortedResults.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No votes were recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {sortedResults.map(([candidate, count], idx) => (
                      <div key={candidate} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700 flex items-center gap-1.5">
                            {idx === 0 && <CheckCircle size={14} className="text-emerald-500" />}
                            {candidate}
                          </span>
                          <span className="text-slate-500">{count} ({Math.round(count / election.total_votes * 100)}%)</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500">Your Name</Label>
                    <Input value={voterName} onChange={(e) => setVoterName(e.target.value)} className="mt-0.5" placeholder="John Doe" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Email *</Label>
                    <Input type="email" value={voterEmail} onChange={(e) => setVoterEmail(e.target.value)} className="mt-0.5" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Select Your {election.max_votes_per_person > 1 ? `Top ${election.max_votes_per_person} Choice` : 'Choice'}</Label>
                  <div className="space-y-2 mt-2">
                    {election.candidates.map((candidate) => {
                      const isSelected = selected === candidate;
                      return (
                        <button key={candidate} type="button" onClick={() => setSelected(candidate)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[3px]" />}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{candidate}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {voteError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle size={16} /> {voteError}
                  </div>
                )}
                <Button onClick={handleVote} disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {submitting ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
                  Submit Vote
                </Button>
                <p className="text-xs text-slate-400 text-center">Your email is used to verify you haven't voted twice. It is not shared with candidates.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}