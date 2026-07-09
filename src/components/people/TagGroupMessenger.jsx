import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Mail, Users, Download } from 'lucide-react';
import TextMessageDialog from '@/components/people/TextMessageDialog';
import EmailMessageDialog from '@/components/people/EmailMessageDialog';
import { downloadPeopleCsv } from '@/utils/csvExport';

export default function TagGroupMessenger({ people, tags }) {
  const [selectedTagId, setSelectedTagId] = useState('');
  const [textRecipients, setTextRecipients] = useState(null);
  const [emailRecipients, setEmailRecipients] = useState(null);

  const taggedPeople = selectedTagId
    ? people.filter((p) => (p.tag_ids || []).includes(selectedTagId))
    : [];

  const buildRecips = (field) =>
    taggedPeople
      .map((p) => ({ name: `${p.first_name} ${p.last_name}`, [field]: p[field] }))
      .filter((r) => r[field]);

  const disabled = !selectedTagId || taggedPeople.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4 px-4 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
        <Users size={15} className="text-slate-400 flex-shrink-0" />
        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
          Message tag group:
        </span>
        <Select value={selectedTagId} onValueChange={setSelectedTagId}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Select a tag" />
          </SelectTrigger>
          <SelectContent>
            {tags.length === 0 ? (
              <SelectItem value="_none" disabled>
                No tags available
              </SelectItem>
            ) : (
              tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedTagId && (
          <span className="text-xs text-slate-400">{taggedPeople.length} people</span>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setTextRecipients(buildRecips('phone'))}
        >
          <MessageSquare size={14} className="mr-1.5" />
          Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => setEmailRecipients(buildRecips('email'))}
        >
          <Mail size={14} className="mr-1.5" />
          Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            const selectedTag = tags.find((t) => t.id === selectedTagId);
            const safeName = (selectedTag?.name || 'tag').replace(/\s+/g, '-').toLowerCase();
            downloadPeopleCsv(taggedPeople, `tag-${safeName}.csv`);
          }}
        >
          <Download size={14} className="mr-1.5" />
          Download
        </Button>
      </div>

      {textRecipients && (
        <TextMessageDialog
          recipients={textRecipients}
          onClose={() => setTextRecipients(null)}
        />
      )}
      {emailRecipients && (
        <EmailMessageDialog
          recipients={emailRecipients}
          onClose={() => setEmailRecipients(null)}
        />
      )}
    </>
  );
}