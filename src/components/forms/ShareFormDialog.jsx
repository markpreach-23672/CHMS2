import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Copy, QrCode, Code } from 'lucide-react';

export default function ShareFormDialog({ form, onClose }) {
  const [copied, setCopied] = useState('');
  const formUrl = `${window.location.origin}/form/${form.id}`;
  const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0" style="border:none; border-radius:8px;"></iframe>`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formUrl)}`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Form — {form.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium text-slate-600">Direct Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={formUrl} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={() => copyToClipboard(formUrl, 'url')}>
                <Copy size={14} />
              </Button>
            </div>
            {copied === 'url' && <p className="text-xs text-emerald-500 mt-0.5">Copied!</p>}
          </div>

          <div className="text-center">
            <Label className="text-xs font-medium text-slate-600 mb-2 block">QR Code</Label>
            <div className="inline-block p-3 bg-white border border-slate-200 rounded-lg">
              <img src={qrUrl} alt="QR Code" width="160" height="160" />
            </div>
            <p className="text-xs text-slate-400 mt-1">Scan to open the form on any device</p>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Embed Code</Label>
            <div className="relative mt-1">
              <Textarea value={embedCode} readOnly className="text-xs font-mono" rows={3} />
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(embedCode, 'embed')} className="absolute top-1 right-1 h-7">
                <Code size={12} className="mr-1" /> Copy
              </Button>
            </div>
            {copied === 'embed' && <p className="text-xs text-emerald-500 mt-0.5">Copied!</p>}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(formUrl, '_blank')}>
              Open Form
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => copyToClipboard(formUrl, 'social')}>
              Copy Link for Email/Social
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}