import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Loader2, Music, ExternalLink } from 'lucide-react';

export default function CCLISearchDialog({ onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults(null);
    try {
      const res = await base44.functions.invoke('searchCCLISongs', { query });
      setResults(res.data?.songs || []);
    } catch (err) {
      alert('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Search CCLI Songs</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Song title, artist, or CCLI #..."
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching || !query.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          </Button>
        </div>

        {searching && <p className="text-sm text-slate-400 text-center py-6">Searching for songs and CCLI numbers...</p>}

        {results !== null && !searching && (
          <div className="space-y-1.5">
            {results.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No songs found. Try a different search.</p>
            ) : (
              results.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50">
                  <Music size={15} className="text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {s.artist}{s.default_key ? ` · Key ${s.default_key}` : ''}{s.ccli_number ? ` · CCLI #${s.ccli_number}` : ' · CCLI # not found'}
                    </p>
                  </div>
                  {s.ccli_number && (
                    <a href={`https://songselect.ccli.com/songs/${s.ccli_number}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-indigo-600 p-1" title="Verify on CCLI SongSelect">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onPick(s)}>Add</Button>
                </div>
              ))
            )}
            <p className="text-[11px] text-slate-400 pt-1">Verify CCLI numbers via the link before relying on them for reporting.</p>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}