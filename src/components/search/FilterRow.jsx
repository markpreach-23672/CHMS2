import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { OPERATORS_BY_TYPE, OPERATOR_LABELS } from './searchUtils';

export default function FilterRow({ filter, idx, allFields, tags, funds, onUpdate, onRemove }) {
  const field = allFields.find(f => f.name === filter.field);
  const operators = field ? OPERATORS_BY_TYPE[field.type] || ['equals'] : ['contains'];

  const renderValueInput = () => {
    if (filter.operator === 'is_empty') return <div className="flex-1" />;
    if (!field) return null;

    if (['select', 'multiselect'].includes(field.type)) {
      return (
        <Select value={filter.value} onValueChange={v => onUpdate(idx, 'value', v)}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'boolean') {
      return (
        <Select value={filter.value} onValueChange={v => onUpdate(idx, 'value', v)}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'tag') {
      return (
        <Select value={filter.value} onValueChange={v => onUpdate(idx, 'value', v)}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select tag..." /></SelectTrigger>
          <SelectContent>
            {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'fund') {
      return (
        <Select value={filter.value} onValueChange={v => onUpdate(idx, 'value', v)}>
          <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Select fund..." /></SelectTrigger>
          <SelectContent>
            {funds.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
        value={filter.value}
        onChange={e => onUpdate(idx, 'value', e.target.value)}
        placeholder="Value..."
        className="flex-1 min-w-[120px] h-8 text-xs"
      />
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={filter.field} onValueChange={v => {
        const newField = allFields.find(f => f.name === v);
        const newOps = newField ? OPERATORS_BY_TYPE[newField.type] || ['equals'] : ['contains'];
        onUpdate(idx, { field: v, operator: newOps[0], value: '' });
      }}>
        <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {allFields.map(f => <SelectItem key={f.name} value={f.name}>{f.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filter.operator} onValueChange={v => onUpdate(idx, 'operator', v)}>
        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {operators.map(op => <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>)}
        </SelectContent>
      </Select>
      {renderValueInput()}
      <button onClick={() => onRemove(idx)} className="p-1 text-slate-400 hover:text-red-500">
        <Trash2 size={14} />
      </button>
    </div>
  );
}