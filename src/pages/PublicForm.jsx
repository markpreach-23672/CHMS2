import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import FormRenderer from '@/components/forms/FormRenderer';

export default function PublicForm() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadForm = async () => {
      try {
        const res = await base44.functions.invoke('getPublicForm', { form_id: formId });
        if (res.data?.error) {
          setError(res.data.error);
        } else {
          setForm(res.data);
        }
      } catch (err) {
        setError('Form not found or no longer available.');
      } finally {
        setLoading(false);
      }
    };
    loadForm();
  }, [formId]);

  const validate = () => {
    const errs = {};
    for (const field of form.fields || []) {
      if (field.required && field.type !== 'section') {
        const val = values[field.id];
        let isEmpty = false;
        if (val === undefined || val === null || val === '') isEmpty = true;
        else if (typeof val === 'object' && !Array.isArray(val)) {
          if (field.type === 'name') isEmpty = !val.first && !val.last;
          else if (field.type === 'address') isEmpty = !val.street && !val.city;
          else if (field.type === 'payment') isEmpty = !val.label;
          else isEmpty = Object.values(val).every((v) => !v);
        }
        else if (Array.isArray(val) && val.length === 0) isEmpty = true;
        if (isEmpty) errs[field.id] = 'This field is required';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('submitForm', { form_id: formId, data: values });
      if (res.data?.error) {
        setError(res.data.error);
      } else {
        setConfirmationMessage(res.data.confirmation_message || 'Thank you!');
        setSubmitted(true);
      }
    } catch (err) {
      setError('Failed to submit form. Please try again.');
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

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle size={48} className="mx-auto text-emerald-500 mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Thank You!</h2>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{confirmationMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
        {form.header_image_url && (
          <img src={form.header_image_url} alt="" className="w-full h-40 object-cover" />
        )}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{form.title}</h1>
          {form.description && <p className="text-sm text-slate-500 mb-4">{form.description}</p>}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <FormRenderer fields={form.fields || []} values={values} onChange={setValues} errors={errors} />
          <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700">
            {submitting ? <Loader2 size={16} className="animate-spin mr-1.5" /> : null}
            {form.submit_button_text || 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}