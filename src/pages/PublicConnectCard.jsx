import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Loader2 } from 'lucide-react';

export default function PublicConnectCard() {
  const { cardId } = useParams();
  const [card, setCard] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getPublicCard', { card_id: cardId })
      .then((res) => {
        setCard(res.data.card);
        setChurch(res.data.church);
        const initial = {};
        (res.data.card.fields || []).forEach(f => {
          initial[f.key] = f.type === 'checkbox' ? false : '';
        });
        setFormData(initial);
      })
      .catch(() => setError('This card is no longer available.'))
      .finally(() => setLoading(false));
  }, [cardId]);

  const handleSubmit = async () => {
    const missing = (card.fields || []).filter(f => f.required && !formData[f.key] && formData[f.key] !== false);
    if (missing.length > 0) {
      alert(`Please fill in: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      await base44.functions.invoke('submitConnectCard', {
        connect_card_id: cardId,
        field_data: formData
      });
      setSuccess(true);
    } catch (err) {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const brandColor = church?.branding_color || '#4f46e5';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: brandColor + '10' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColor + '20' }}>
            <CheckCircle size={32} style={{ color: brandColor }} />
          </div>
          {church?.logo_url && <img src={church.logo_url} alt={church.name} className="h-8 mx-auto mb-4 object-contain" />}
          <h2 className="text-xl font-bold text-slate-900">Thank You!</h2>
          <p className="text-sm text-slate-500 mt-2">{card.confirmation_message}</p>
        </div>
      </div>
    );
  }

  const renderField = (field) => {
    const value = formData[field.key];
    const setVal = (v) => setFormData(prev => ({ ...prev, [field.key]: v }));

    switch (field.type) {
      case 'textarea':
        return <Textarea value={value || ''} onChange={(e) => setVal(e.target.value)} rows={3} className="mt-1" />;
      case 'select':
        return (
          <Select value={value || ''} onValueChange={setVal}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose..." /></SelectTrigger>
            <SelectContent>
              {(field.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2 mt-2">
            <Checkbox checked={!!value} onCheckedChange={setVal} />
            <span className="text-sm text-slate-600">{field.label}</span>
          </div>
        );
      case 'date':
        return <Input type="date" value={value || ''} onChange={(e) => setVal(e.target.value)} className="mt-1" />;
      case 'email':
        return <Input type="email" value={value || ''} onChange={(e) => setVal(e.target.value)} className="mt-1" />;
      case 'tel':
        return <Input type="tel" value={value || ''} onChange={(e) => setVal(e.target.value)} className="mt-1" />;
      default:
        return <Input type="text" value={value || ''} onChange={(e) => setVal(e.target.value)} className="mt-1" />;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: brandColor + '10' }}>
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 text-center" style={{ backgroundColor: brandColor }}>
            {church?.logo_url ? (
              <img src={church.logo_url} alt={church.name} className="h-10 mx-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            ) : (
              <h1 className="text-lg font-bold text-white">{church?.name}</h1>
            )}
          </div>

          <div className="p-6">
            {card.title && <h2 className="text-xl font-bold text-slate-900 text-center">{card.title}</h2>}
            {card.description && <p className="text-sm text-slate-500 text-center mt-1 mb-4">{card.description}</p>}

            <div className="space-y-4 mt-4">
              {(card.fields || []).map((field) => (
                <div key={field.key}>
                  {field.type !== 'checkbox' && (
                    <Label className="text-sm font-medium text-slate-700">
                      {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </Label>
                  )}
                  {renderField(field)}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full mt-6 py-3 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {submitting ? 'Submitting...' : (card.button_text || 'Submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}