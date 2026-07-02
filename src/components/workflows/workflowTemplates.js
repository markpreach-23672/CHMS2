export const WORKFLOW_TEMPLATES = [
  {
    id: 'first_time_guest_6_week',
    name: '6-Week First-Time Guest Journey',
    emoji: '👋',
    description: 'A comprehensive 6-week follow-up sequence that dramatically improves guest retention.',
    steps: [
      { step_type: 'staff_notify', delay_days: 0, delay_unit: 'days', subject: 'New guest to follow up with', body: 'A new guest has submitted a connect card. Please call within 48 hours to welcome them personally and invite them back.', notify_method: 'email', info_scope: 'all', sort_order: 0 },
      { step_type: 'email', delay_days: 1, delay_unit: 'days', subject: 'So glad you visited!', body: "Hi {{first_name}},\n\nThank you so much for visiting {{church_name}}! We loved having you with us and wanted to personally welcome you to our church family.\n\nIf you have any questions or if there's anything we can do for you, please don't hesitate to reach out. We'd love to see you again next Sunday!\n\nBlessings,\nThe team at {{church_name}}", sort_order: 1 },
      { step_type: 'task', delay_days: 3, delay_unit: 'days', task_description: 'Call the guest personally to check in and invite them back', sort_order: 2 },
      { step_type: 'email', delay_days: 7, delay_unit: 'days', subject: "We'd love to see you again", body: "Hi {{first_name}},\n\nWe noticed we haven't seen you in a little while and we wanted to let you know we're thinking about you! We'd love to have you back this Sunday.\n\nIf there's anything specific you're looking for in a church home, we'd love to talk with you about it.\n\nSee you soon!\n{{church_name}}", sort_order: 3 },
      { step_type: 'task', delay_days: 14, delay_unit: 'days', task_description: 'Invite to coffee or connect to a small group', sort_order: 4 },
      { step_type: 'email', delay_days: 21, delay_unit: 'days', subject: 'Checking in', body: "Hi {{first_name}},\n\nJust checking in to see how you're doing! We'd love to connect with you and answer any questions you might have about {{church_name}}.\n\nFeel free to reply to this email or call us anytime. We're here for you!\n\nBlessings,\n{{church_name}}", sort_order: 5 },
      { step_type: 'no_response_alert', delay_days: 30, delay_unit: 'days', body: "This guest hasn't returned in 30 days. Please reach out personally (call or text) to reconnect and make sure they feel welcomed.", notify_method: 'email', info_scope: 'all', sort_order: 6 }
    ]
  },
  {
    id: 'second_time_guest',
    name: 'Second-Time Guest Follow-Up',
    emoji: '🔄',
    description: 'A guest came back! Now deepen the connection and move them toward membership.',
    steps: [
      { step_type: 'staff_notify', delay_days: 0, delay_unit: 'days', subject: 'Second-time guest follow-up', body: 'A guest has returned for a second visit! Please reach out to welcome them back and invite them to take a next step.', notify_method: 'email', info_scope: 'all', sort_order: 0 },
      { step_type: 'email', delay_days: 2, delay_unit: 'days', subject: 'Great to see you again!', body: "Hi {{first_name}},\n\nIt was so great to see you again at {{church_name}}! The fact that you came back means a lot to us.\n\nWe'd love to help you take a next step — whether that's joining a small group, learning more about the church, or getting involved in serving. Let us know how we can help!\n\nSee you Sunday!\n{{church_name}}", sort_order: 1 },
      { step_type: 'task', delay_days: 5, delay_unit: 'days', task_description: 'Invite to a small group', sort_order: 2 },
      { step_type: 'email', delay_days: 10, delay_unit: 'days', subject: 'Next steps at our church', body: "Hi {{first_name}},\n\nWe're so glad you're becoming a regular part of {{church_name}}! We want to help you get connected and grow in your faith.\n\nHere are some next steps you can take: join a small group, attend a membership class, or find a place to serve. We'd love to talk with you about what's right for you.\n\nLet's grow together!\n{{church_name}}", sort_order: 3 }
    ]
  },
  {
    id: 'new_convert_baptism',
    name: 'New Convert / Baptism Follow-Up',
    emoji: '✨',
    description: 'Discipleship track for new believers — baptism, mentorship, and spiritual growth.',
    steps: [
      { step_type: 'staff_notify', delay_days: 0, delay_unit: 'days', subject: 'New convert — discipleship follow-up needed', body: 'Someone has made a decision for Christ! Please reach out within 24 hours to begin discipleship and discuss baptism.', notify_method: 'email', info_scope: 'all', sort_order: 0 },
      { step_type: 'email', delay_days: 1, delay_unit: 'days', subject: 'Congratulations on your decision!', body: "Hi {{first_name}},\n\nWe are so excited about your decision to follow Jesus! This is the most important step you'll ever take, and we want to walk alongside you on this journey.\n\nWe'd love to connect with you about next steps, including baptism and our discipleship journey. Someone from our team will be reaching out soon!\n\nWelcome to the family of God!\n{{church_name}}", sort_order: 1 },
      { step_type: 'email', delay_days: 3, delay_unit: 'days', subject: 'Your discipleship journey', body: "Hi {{first_name}},\n\nAs a new follower of Jesus, we want to help you grow in your faith. We have a discipleship journey designed to help you build a strong foundation in your relationship with God.\n\nWe'd love to get you started — someone will be in touch soon to connect you with a mentor and resources.\n\nGrowing together,\n{{church_name}}", sort_order: 2 },
      { step_type: 'task', delay_days: 7, delay_unit: 'days', task_description: 'Discipleship check-in call — see how they are doing spiritually', sort_order: 3 },
      { step_type: 'email', delay_days: 14, delay_unit: 'days', subject: 'Community and small groups', body: "Hi {{first_name}},\n\nOne of the best ways to grow in your faith is in community with other believers. We have small groups that meet throughout the week where you can build friendships, study the Bible, and support one another.\n\nWe'd love to help you find a group that's a good fit. Let us know if you're interested!\n\n{{church_name}}", sort_order: 4 },
      { step_type: 'task', delay_days: 21, delay_unit: 'days', task_description: 'Connect to a spiritual mentor for ongoing discipleship', sort_order: 5 }
    ]
  },
  {
    id: 'prayer_request',
    name: 'Prayer Request Follow-Up',
    emoji: '🙏',
    description: 'Warm, caring follow-up for people who submit prayer requests.',
    steps: [
      { step_type: 'email', delay_days: 0, delay_unit: 'days', subject: 'We are praying for you', body: "Hi {{first_name}},\n\nThank you for sharing your prayer request with us. Our team is lifting you up in prayer right now. We believe God hears and answers prayer.\n\nIf you'd like to talk with someone on our pastoral team, please let us know. We're here for you.\n\nWith love and prayers,\n{{church_name}}", sort_order: 0 },
      { step_type: 'staff_notify', delay_days: 2, delay_unit: 'days', subject: 'Prayer request follow-up', body: 'A prayer request was submitted. Please follow up personally to check on the person and pray with them if appropriate.', notify_method: 'email', info_scope: 'all', sort_order: 1 },
      { step_type: 'email', delay_days: 7, delay_unit: 'days', subject: 'Checking in on your prayer need', body: "Hi {{first_name}},\n\nIt's been a few days since you shared your prayer request with us. We wanted to check in and see how things are going. We're still praying for you!\n\nLet us know if there's anything more we can do.\n\n{{church_name}}", sort_order: 2 }
    ]
  },
  {
    id: 'new_member_onboarding',
    name: 'New Member Onboarding',
    emoji: '🎉',
    description: 'Welcome new members and get them connected to community and serving.',
    steps: [
      { step_type: 'email', delay_days: 0, delay_unit: 'days', subject: 'Welcome to the family!', body: "Hi {{first_name}},\n\nWelcome to {{church_name}}! We're so glad you've decided to make this your church home. Being a member means you're part of our family — and we take care of family.\n\nHere's what happens next: we'll connect you with a small group, help you find your place to serve, and walk with you as you grow in your faith.\n\nWelcome aboard!\n{{church_name}}", sort_order: 0 },
      { step_type: 'task', delay_days: 3, delay_unit: 'days', task_description: 'Assign to a small group based on location/age/stage', sort_order: 1 },
      { step_type: 'email', delay_days: 7, delay_unit: 'days', subject: 'Membership class info', body: "Hi {{first_name}},\n\nAs a new member, we'd love to invite you to our next membership class where you'll learn more about our church's mission, vision, and values. It's a great way to get connected and understand what we're all about.\n\nWe'll be in touch with the details soon!\n\n{{church_name}}", sort_order: 2 },
      { step_type: 'task', delay_days: 14, delay_unit: 'days', task_description: 'Connect to a ministry team based on gifts and interests', sort_order: 3 },
      { step_type: 'email', delay_days: 21, delay_unit: 'days', subject: 'Serving opportunities', body: "Hi {{first_name}},\n\nOne of the best ways to get plugged in at {{church_name}} is to serve! We have opportunities in worship, children's ministry, hospitality, tech, outreach, and more.\n\nWe'd love to help you find a place to serve that matches your gifts and passions. Let us know what interests you!\n\n{{church_name}}", sort_order: 4 }
    ]
  },
  {
    id: 'lapsed_attender',
    name: 'Lapsed Attender Re-Engagement',
    emoji: '💌',
    description: 'Reach out to people who haven\'t been around in a while and bring them back.',
    steps: [
      { step_type: 'email', delay_days: 0, delay_unit: 'days', subject: 'We miss you!', body: "Hi {{first_name}},\n\nWe've noticed we haven't seen you at {{church_name}} in a while, and we wanted to reach out and let you know we miss you! You're an important part of our church family.\n\nIf there's anything going on or anything we can do to support you, please let us know. We'd love to see you again soon.\n\nWith love,\n{{church_name}}", sort_order: 0 },
      { step_type: 'task', delay_days: 5, delay_unit: 'days', task_description: 'Personal call to check in and see how they are doing', sort_order: 1 },
      { step_type: 'email', delay_days: 10, delay_unit: 'days', subject: 'Upcoming events you might enjoy', body: "Hi {{first_name}},\n\nWe have some exciting things coming up at {{church_name}} and we'd love for you to be part of them! We'd love to welcome you back. If there's anything we can do to make that easier, please let us know.\n\n{{church_name}}", sort_order: 2 },
      { step_type: 'no_response_alert', delay_days: 14, delay_unit: 'days', body: "This person hasn't responded to our re-engagement outreach. Please reach out personally to check in.", notify_method: 'email', info_scope: 'all', sort_order: 3 }
    ]
  }
];