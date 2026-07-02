export const FORM_TEMPLATES = [
  {
    id: 'general',
    name: 'General Form',
    emoji: '📝',
    description: 'A simple contact form with name, email, phone, and message.',
    template_type: 'general',
    fields: [
      { id: 'f_name', type: 'name', label: 'Your Name', required: true, maps_to: 'name' },
      { id: 'f_email', type: 'email', label: 'Email Address', required: true, maps_to: 'email' },
      { id: 'f_phone', type: 'phone', label: 'Phone Number', maps_to: 'phone' },
      { id: 'f_message', type: 'essay', label: 'Message', description: 'How can we help you?', required: true }
    ],
    submit_button_text: 'Submit',
    confirmation_message: 'Thank you for reaching out! We will get back to you soon.'
  },
  {
    id: 'registration',
    name: 'Event Registration',
    emoji: '🎟️',
    description: 'Register attendees for an event with payment tiers and session selection.',
    template_type: 'registration',
    fields: [
      { id: 'f_name', type: 'name', label: 'Attendee Name', required: true, maps_to: 'name' },
      { id: 'f_email', type: 'email', label: 'Email Address', required: true, maps_to: 'email' },
      { id: 'f_phone', type: 'phone', label: 'Phone Number', maps_to: 'phone' },
      { id: 'f_address', type: 'address', label: 'Address', maps_to: 'address' },
      { id: 'f_attending', type: 'select', label: 'Number Attending', required: true, options: ['1 person', '2 people', '3 people', '4 people', '5+ people'] },
      { id: 'f_sessions', type: 'checkbox', label: 'Sessions You\'ll Attend', options: ['Morning Session', 'Afternoon Workshop', 'Evening Service', 'Fellowship Dinner'] },
      { id: 'f_payment', type: 'payment', label: 'Registration Fee', required: true, payment_options: [
        { label: 'Early Bird (by Oct 1)', amount: 25 },
        { label: 'Standard Registration', amount: 40 },
        { label: 'Family Rate (up to 4)', amount: 100 },
        { label: 'Scholarship / Free', amount: 0 }
      ]}
    ],
    submit_button_text: 'Complete Registration',
    confirmation_message: 'Your registration has been received! We look forward to seeing you at the event.'
  },
  {
    id: 'blank',
    name: 'Blank Form',
    emoji: '📄',
    description: 'Start from scratch with no pre-built fields.',
    template_type: 'blank',
    fields: [],
    submit_button_text: 'Submit',
    confirmation_message: 'Thank you for your submission!'
  }
];

export const FIELD_TYPE_META = [
  { type: 'name', label: 'Name', icon: 'User', color: 'text-blue-500', defaultLabel: 'Full Name' },
  { type: 'email', label: 'Email', icon: 'Mail', color: 'text-cyan-500', defaultLabel: 'Email Address' },
  { type: 'phone', label: 'Phone', icon: 'Phone', color: 'text-green-500', defaultLabel: 'Phone Number' },
  { type: 'address', label: 'Address', icon: 'MapPin', color: 'text-purple-500', defaultLabel: 'Home Address' },
  { type: 'text', label: 'Short Text', icon: 'Type', color: 'text-slate-500', defaultLabel: 'Short Answer' },
  { type: 'essay', label: 'Long Text', icon: 'AlignLeft', color: 'text-slate-500', defaultLabel: 'Long Answer' },
  { type: 'select', label: 'Dropdown', icon: 'ChevronDown', color: 'text-orange-500', defaultLabel: 'Select an Option' },
  { type: 'radio', label: 'Multiple Choice', icon: 'Circle', color: 'text-orange-500', defaultLabel: 'Choose One' },
  { type: 'checkbox', label: 'Checkboxes', icon: 'CheckSquare', color: 'text-teal-500', defaultLabel: 'Select All That Apply' },
  { type: 'date', label: 'Date', icon: 'Calendar', color: 'text-pink-500', defaultLabel: 'Date' },
  { type: 'payment', label: 'Payment', icon: 'DollarSign', color: 'text-emerald-500', defaultLabel: 'Payment' },
  { type: 'file', label: 'File Upload', icon: 'FileText', color: 'text-indigo-500', defaultLabel: 'File Upload' },
  { type: 'section', label: 'Section Title', icon: 'Heading', color: 'text-slate-400', defaultLabel: 'Section Title' }
];

export function getDefaultLabel(type) {
  const meta = FIELD_TYPE_META.find((m) => m.type === type);
  return meta ? meta.defaultLabel : 'New Field';
}

export function getAutoMapsTo(type) {
  switch (type) {
    case 'name': return 'name';
    case 'email': return 'email';
    case 'phone': return 'phone';
    case 'address': return 'address';
    default: return undefined;
  }
}