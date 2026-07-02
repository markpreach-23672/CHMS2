import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function ShareCardDialog({ card, onClose }) {
  const [copied, setCopied] = useState(null);
  const publicUrl = `${window.location.origin}/card/${card.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(publicUrl)}`;
  const embedCode = `<iframe src="${publicUrl}" width="400" height="640" frameborder="0" style="border:0;border-radius:12px;max-width:100%"></iframe>`;

  const copy = (text, what) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{card.name}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-block p-3 bg-white border border-slate-200 rounded-xl">
              <img src={qrUrl} alt="QR Code" width={200} height={200} className="mx-auto" />
            </div>
            <p className="text-xs text-slate-500 mt-2">Scan to open the card on a phone. Print this on bulletins, seat-back cards, or screens.</p>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Public Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={publicUrl} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(publicUrl, 'url')}>
                {copied === 'url' ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Website Embed Code</Label>
            <div className="flex gap-2 mt-1">
              <Input value={embedCode} readOnly className="text-xs font-mono" />
              <Button size="icon" variant="outline" onClick={() => copy(embedCode, 'embed')}>
                {copied === 'embed' ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Paste this into your church website's HTML.</p>
          </div>

          {card.keyword && (
            <div className="bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">Text Keyword:</span> Guests text <span className="font-mono font-bold">{card.keyword}</span> to receive this card link. (Requires SMS setup.)
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.open(publicUrl, '_blank')}>
            <ExternalLink size={14} className="mr-1.5" /> Preview
          </Button>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}