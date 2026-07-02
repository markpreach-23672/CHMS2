export const CARD_TEMPLATES = [
  {
    id: 'first_time_guest',
    name: 'First-Time Guest',
    emoji: '👋',
    title: "Welcome! We're so glad you're here.",
    description: 'A warm welcome card for first-time visitors to connect with the church.',
    keyword: 'GUEST',
    button_text: 'Welcome Me',
    confirmation_message: "Thank you for visiting with us today! We'll be in touch soon. May God bless you richly!",
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, maps_to: 'first_name' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: false, maps_to: 'last_name' },
      { key: 'email', label: 'Email Address', type: 'email', required: true, maps_to: 'email' },
      { key: 'phone', label: 'Phone Number', type: 'tel', required: false, maps_to: 'phone' },
      { key: 'address', label: 'Mailing Address', type: 'text', required: false, maps_to: 'address' },
      { key: 'first_visit', label: 'Is this your first time visiting?', type: 'select', required: true, maps_to: 'custom', options: ['Yes, first time', "I've visited before"] },
      { key: 'service_time', label: 'Which service did you attend?', type: 'select', required: false, maps_to: 'custom', options: ['9:00 AM Service', '11:00 AM Service', "Didn't attend yet"] },
      { key: 'message', label: 'Anything else you would like us to know?', type: 'textarea', required: false, maps_to: 'notes' }
    ]
  },
  {
    id: 'plan_a_visit',
    name: 'Plan a Visit',
    emoji: '📅',
    title: 'Planning your visit? Let us know!',
    description: 'Let us know when you are coming so we can welcome you personally.',
    keyword: 'PLAN',
    button_text: 'Plan My Visit',
    confirmation_message: "We can't wait to meet you! Someone from our team will reach out to confirm the details.",
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, maps_to: 'first_name' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true, maps_to: 'last_name' },
      { key: 'email', label: 'Email Address', type: 'email', required: true, maps_to: 'email' },
      { key: 'phone', label: 'Phone Number', type: 'tel', required: true, maps_to: 'phone' },
      { key: 'visit_date', label: 'When are you planning to visit?', type: 'date', required: true, maps_to: 'custom' },
      { key: 'party_size', label: 'How many people in your party?', type: 'select', required: false, maps_to: 'custom', options: ['Just me', '2 people', '3-4 people', '5+ people'] },
      { key: 'children', label: 'Will you bring children?', type: 'select', required: false, maps_to: 'custom', options: ['No children', 'Yes, ages 0-5', 'Yes, ages 6-12', 'Yes, teens'] },
      { key: 'message', label: 'Any questions or special needs?', type: 'textarea', required: false, maps_to: 'notes' }
    ]
  },
  {
    id: 'prayer_request',
    name: 'Prayer Request',
    emoji: '🙏',
    title: 'We would love to pray for you.',
    description: 'Share your prayer need and our team will lift you up.',
    keyword: 'PRAYER',
    button_text: 'Submit Prayer Request',
    confirmation_message: 'Your prayer request has been received. Our team is praying for you right now.',
    fields: [
      { key: 'first_name', label: 'Your Name', type: 'text', required: true, maps_to: 'first_name' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: false, maps_to: 'last_name' },
      { key: 'email', label: 'Email', type: 'email', required: false, maps_to: 'email' },
      { key: 'phone', label: 'Phone (if you would like a call)', type: 'tel', required: false, maps_to: 'phone' },
      { key: 'prayer_request', label: 'Your Prayer Request', type: 'textarea', required: true, maps_to: 'notes' },
      { key: 'follow_up', label: 'Would you like someone to follow up?', type: 'select', required: false, maps_to: 'custom', options: ['Yes, please contact me', 'No, just please pray'] }
    ]
  },
  {
    id: 'volunteer_signup',
    name: 'Volunteer Sign-Up',
    emoji: '🤝',
    title: 'Ready to serve? Sign up here!',
    description: 'Discover your place to serve and get connected to a ministry team.',
    keyword: 'SERVE',
    button_text: 'I Want to Serve',
    confirmation_message: 'Thank you for your heart to serve! Our team will contact you about opportunities that match your interests.',
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, maps_to: 'first_name' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true, maps_to: 'last_name' },
      { key: 'email', label: 'Email', type: 'email', required: true, maps_to: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel', required: true, maps_to: 'phone' },
      { key: 'area', label: 'Areas you are interested in', type: 'select', required: true, maps_to: 'custom', options: ['Worship/Music', "Children's Ministry", 'Youth Ministry', 'Greeter/Usher', 'Hospitality/Coffee', 'Audio/Visual/Tech', 'Outreach/Missions', 'Prayer Team', 'Other'] },
      { key: 'availability', label: 'When are you available?', type: 'select', required: false, maps_to: 'custom', options: ['Sunday mornings', 'Wednesday evenings', 'Weekdays', 'Flexible'] },
      { key: 'experience', label: 'Any relevant experience?', type: 'textarea', required: false, maps_to: 'notes' }
    ]
  },
  {
    id: 'update_info',
    name: 'Update My Info',
    emoji: '✏️',
    title: 'Keep your information up to date.',
    description: 'Update your contact details so we can stay connected.',
    keyword: 'UPDATE',
    button_text: 'Update My Info',
    confirmation_message: 'Your information has been updated. Thank you for helping us keep in touch!',
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, maps_to: 'first_name' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true, maps_to: 'last_name' },
      { key: 'email', label: 'Email', type: 'email', required: true, maps_to: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel', required: false, maps_to: 'phone' },
      { key: 'mobile', label: 'Mobile', type: 'tel', required: false, maps_to: 'mobile' },
      { key: 'address', label: 'Street Address', type: 'text', required: false, maps_to: 'address' },
      { key: 'city', label: 'City', type: 'text', required: false, maps_to: 'city' },
      { key: 'state', label: 'State', type: 'text', required: false, maps_to: 'state' },
      { key: 'zip', label: 'ZIP Code', type: 'text', required: false, maps_to: 'zip' },
      { key: 'birth_date', label: 'Birthday', type: 'date', required: false, maps_to: 'birth_date' }
    ]
  },
  {
    id: 'decision_card',
    name: 'Decision / Response Card',
    emoji: '✨',
    title: 'We would love to celebrate with you.',
    description: 'Did you make a decision today? Let us know so we can support you.',
    keyword: 'DECISION',
    button_text: 'Share My Decision',
    confirmation_message: 'Praise God for your decision! Someone from our team will reach out to support you on this journey.',
    fields: [
      { key: 'first_name', label: 'First Name', type: 'text', required: true, maps_to: 'first_name' },
      { key: 'last_name', label: 'Last Name', type: 'text', required: true, maps_to: 'last_name' },
      { key: 'email', label: 'Email', type: 'email', required: true, maps_to: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel', required: true, maps_to: 'phone' },
      { key: 'decision', label: 'My decision today', type: 'select', required: true, maps_to: 'custom', options: ['I accepted Jesus as my Savior', 'I rededicated my life to Christ', 'I want to be baptized', 'I want to join the church', 'I want to talk to a pastor', 'Other'] },
      { key: 'message', label: 'Tell us more (optional)', type: 'textarea', required: false, maps_to: 'notes' }
    ]
  }
];