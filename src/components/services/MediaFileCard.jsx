import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Music, Download, Trash2 } from 'lucide-react';
import { TYPE_STYLES, typeLabel } from '@/components/services/mediaTypes';

export default function MediaFileCard({ file, song, onDelete }) {
  const isAudio = file.file_type === 'backing_track';
  const Icon = isAudio ? Music : FileText;

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${TYPE_STYLES[file.file_type] || TYPE_STYLES.other}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{file.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {typeLabel(file.file_type)}
            {song && <> · {song.title}</>}
            {file.key && <> · Key of {file.key}</>}
          </p>
          {file.notes && <p className="text-xs text-slate-400 mt-1 truncate">{file.notes}</p>}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <a href={file.file_url} target="_blank" rel="noopener noreferrer" title="Open / Download">
              <Download className="w-4 h-4" />
            </a>
          </Button>
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={onDelete} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {isAudio && (
        <audio controls preload="none" className="w-full mt-3 h-9">
          <source src={file.file_url} />
        </audio>
      )}
    </div>
  );
}