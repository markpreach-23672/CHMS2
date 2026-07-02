import moment from 'moment';

export const BUILT_IN_FIELDS = [
  { name: 'first_name', label: 'First Name', type: 'text' },
  { name: 'last_name', label: 'Last Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'mobile', label: 'Mobile', type: 'text' },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'member', 'visitor', 'inactive'] },
  { name: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'unspecified'] },
  { name: 'marital_status', label: 'Marital Status', type: 'select', options: ['single', 'married', 'divorced', 'widowed', 'separated'] },
  { name: 'family_role', label: 'Family Role', type: 'select', options: ['head_of_household', 'spouse', 'adult', 'child', 'unassigned', 'other'] },
  { name: 'address', label: 'Address', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'zip', label: 'ZIP', type: 'text' },
  { name: 'birth_date', label: 'Birth Date', type: 'date' },
  { name: 'first_visit_date', label: 'First Visit', type: 'date' },
  { name: 'baptism_date', label: 'Baptism Date', type: 'date' },
  { name: 'membership_date', label: 'Membership Date', type: 'date' },
  { name: 'tag', label: 'Has Tag', type: 'tag' },
  { name: 'giving_total', label: 'Total Giving', type: 'number' },
  { name: 'giving_fund', label: 'Gave to Fund', type: 'fund' },
  { name: 'has_given', label: 'Has Given', type: 'boolean' },
];

export const OPERATORS_BY_TYPE = {
  text: ['contains', 'equals', 'starts_with', 'is_empty'],
  select: ['equals', 'not_equals', 'is_empty'],
  date: ['is_before', 'is_after', 'equals', 'is_empty'],
  number: ['equals', 'greater_than', 'less_than', 'is_empty'],
  tag: ['equals'],
  fund: ['equals'],
  boolean: ['equals'],
  multiselect: ['equals'],
};

export const OPERATOR_LABELS = {
  contains: 'Contains',
  equals: 'Equals',
  not_equals: 'Not equals',
  starts_with: 'Starts with',
  is_empty: 'Is empty',
  is_before: 'Is before',
  is_after: 'Is after',
  greater_than: 'Greater than',
  less_than: 'Less than',
};

export const SORT_FIELDS = [
  { value: 'last_name', label: 'Last Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
  { value: 'city', label: 'City' },
  { value: 'birth_date', label: 'Birth Date' },
  { value: 'first_visit_date', label: 'First Visit' },
  { value: 'created_date', label: 'Date Added' },
];

export function compareValue(personValue, operator, filterValue) {
  const pv = String(personValue || '').toLowerCase();
  const fv = String(filterValue || '').toLowerCase();
  switch (operator) {
    case 'contains': return pv.includes(fv);
    case 'equals': return pv === fv;
    case 'not_equals': return pv !== fv;
    case 'starts_with': return pv.startsWith(fv);
    case 'is_empty': return !personValue;
    case 'is_before': return moment(personValue).isBefore(moment(filterValue));
    case 'is_after': return moment(personValue).isAfter(moment(filterValue));
    default: return true;
  }
}

export function compareNumber(personValue, operator, filterValue) {
  const num = Number(personValue) || 0;
  const target = Number(filterValue) || 0;
  switch (operator) {
    case 'equals': return num === target;
    case 'greater_than': return num > target;
    case 'less_than': return num < target;
    case 'is_empty': return num === 0;
    default: return true;
  }
}