import { Lead } from '@/types/lead';

// Sample WhatsApp conversations showing Fluffy chatbot interactions
// Fluffy helps with: WhatsApp API, RCS, SMS, Voice Call, Multichannel, Partnership
const conversations = {
  whatsapp_api: `ASSISTANT @ 2024-12-05T04:45:00Z: Hello! Welcome to Telinfy. I'm Fluffy, your messaging assistant. How can I help you today?
USER: Hi, I need WhatsApp Business API for my company
ASSISTANT @ 2024-12-05T04:46:00Z: Great choice! WhatsApp Business API is perfect for scaling your business communications. Could you tell me about your company and what you're hoping to achieve?
USER: We're TechCorp India, an IT services company with 500 employees. We handle 10,000 customer queries daily and need to automate responses.
ASSISTANT @ 2024-12-05T04:48:00Z: That's impressive scale! With 10,000 daily queries, WhatsApp API can help you automate responses, manage multiple agents, and integrate with your CRM. Are you using any CRM system?
USER: Yes, we use Zoho CRM. Integration is critical for us.
ASSISTANT @ 2024-12-05T04:50:00Z: Perfect! Telinfy offers seamless Zoho CRM integration. All conversations sync automatically with your CRM in real-time. What's your timeline for implementation?
USER: We want to go live within 2 weeks. Our current provider is shutting down.
ASSISTANT @ 2024-12-05T04:52:00Z: I understand the urgency! Our enterprise team can meet that timeline. What's your approximate budget range?
USER: We can allocate 5-10 lakhs annually for the right solution
ASSISTANT @ 2024-12-05T04:54:00Z: That works well for enterprise-level service. I'll have our Enterprise Sales Manager reach out within the hour. Can I confirm your contact details?
USER: Yes, contact me at rahul.kumar@techcorp.in or call +91 98765 43210
ASSISTANT @ 2024-12-05T04:56:00Z: Thank you, Rahul! Our team will call you shortly with a tailored WhatsApp API solution. Anything else you'd like to know?
USER: Can you handle message templates approval?
ASSISTANT @ 2024-12-05T04:58:00Z: Absolutely! We handle the entire template approval process with Meta. Our team has a 98% approval rate with 24-48 hour turnaround.
USER: Excellent! Looking forward to the call. Thanks!
ASSISTANT @ 2024-12-05T05:00:00Z: You're welcome, Rahul! Have a great day!`,

  rcs_messaging: `ASSISTANT @ 2024-12-05T09:00:00Z: Hi there! I'm Fluffy from Telinfy. How can I assist you today?
USER: I heard about RCS messaging. Can you explain what it is?
ASSISTANT @ 2024-12-05T09:02:00Z: RCS (Rich Communication Services) is the next evolution of SMS! It offers rich media, read receipts, typing indicators, and interactive buttons - all within the native messaging app. No app download needed!
USER: That sounds interesting. We're an e-commerce company and want better engagement than SMS.
ASSISTANT @ 2024-12-05T09:04:00Z: RCS is perfect for e-commerce! You can send product carousels, order tracking with images, and interactive payment buttons. What's your current messaging volume?
USER: Around 50,000 messages per month for order updates and promotions.
ASSISTANT @ 2024-12-05T09:06:00Z: Great volume! RCS typically sees 3x higher engagement than SMS. We can help you migrate your existing SMS campaigns to RCS. Which carriers do your customers mostly use?
USER: Mix of Jio, Airtel, and Vi mainly.
ASSISTANT @ 2024-12-05T09:08:00Z: Perfect! We have RCS enabled with all major Indian carriers. We can also set up a fallback to SMS for devices that don't support RCS yet. Would you like to see a demo?
USER: Yes! Also what's the pricing compared to SMS?
ASSISTANT @ 2024-12-05T09:10:00Z: RCS pricing is competitive with SMS, and the higher engagement often results in better ROI. I'll have our RCS specialist show you a demo with pricing. Who should we contact?
USER: Contact Priya at priya@shopfast.in or +91 98765 11111
ASSISTANT @ 2024-12-05T09:12:00Z: Thanks Priya! Our RCS team will reach out within 24 hours with a demo and custom pricing. Looking forward to transforming your messaging!`,

  sms_gateway: `ASSISTANT @ 2024-12-04T05:30:00Z: Welcome to Telinfy! I'm Fluffy. What brings you here today?
USER: I need a reliable SMS gateway for OTP and transactional messages
ASSISTANT @ 2024-12-04T05:32:00Z: We specialize in high-throughput SMS delivery! Our gateway handles OTPs, transactional alerts, and promotional campaigns. What's your expected SMS volume?
USER: We need to send about 100,000 OTPs daily for our banking app.
ASSISTANT @ 2024-12-04T05:34:00Z: For banking OTPs, reliability and speed are critical. Our SMS gateway offers 99.9% uptime with sub-3-second delivery for priority routes. Do you need DLT registration assistance?
USER: Yes, we're new to DLT compliance. Can you help with that?
ASSISTANT @ 2024-12-04T05:36:00Z: Absolutely! We provide end-to-end DLT registration support - entity registration, header approval, and template submission. Our team handles everything. What's your current OTP delivery rate?
USER: Around 85% with our current provider. It's causing customer complaints.
ASSISTANT @ 2024-12-04T05:38:00Z: That's too low for banking! Our priority routes achieve 98%+ delivery rates. We also offer real-time delivery reports and automatic retry mechanisms. Would you like to do a pilot?
USER: Yes, a pilot sounds good. What do you need from us?
ASSISTANT @ 2024-12-04T05:40:00Z: Just your DLT details and a test API integration. We can have you running within 48 hours. Who should our technical team contact?
USER: Contact our CTO, Vikram at vikram@securebank.in, +91 99887 76655
ASSISTANT @ 2024-12-04T05:42:00Z: Got it! Our SMS solutions team will reach out to Vikram for the pilot setup. We'll also share our DLT compliance checklist. Thanks for choosing Telinfy!`,

  voice_solution: `ASSISTANT @ 2024-12-04T10:30:00Z: Hello! I'm Fluffy from Telinfy. How can I help you today?
USER: We need a voice calling solution for our customer support
ASSISTANT @ 2024-12-04T10:32:00Z: We offer comprehensive voice solutions - IVR, click-to-call, automated calls, and call center integration. What's your primary use case?
USER: We want automated voice calls for appointment reminders and payment collection.
ASSISTANT @ 2024-12-04T10:34:00Z: Perfect use case! Our voice API supports text-to-speech in multiple Indian languages, DTMF input capture, and call recording. How many calls do you need to make daily?
USER: Around 5,000 reminder calls and maybe 2,000 payment follow-up calls.
ASSISTANT @ 2024-12-04T10:36:00Z: That's a good volume. We can set up automated voice campaigns with customizable scripts. Do you need multilingual support?
USER: Yes, Hindi and English primarily, maybe Tamil for South India.
ASSISTANT @ 2024-12-04T10:38:00Z: We support all three! Our TTS engine has natural-sounding voices in 12 Indian languages. We can also transfer to a live agent if the customer presses a key. Interested in a demo?
USER: Yes, and what about integration with our CRM?
ASSISTANT @ 2024-12-04T10:40:00Z: We integrate with most CRMs - Salesforce, Zoho, Freshdesk, and custom systems via API. Call logs and recordings sync automatically. Who should we contact for the demo?
USER: I'm Anita, reach me at anita@healthplus.in or +91 87654 32109
ASSISTANT @ 2024-12-04T10:42:00Z: Thanks Anita! Our voice solutions team will arrange a demo this week. We'll show you the IVR builder and campaign management dashboard. Talk soon!`,

  multichannel: `ASSISTANT @ 2024-12-05T03:30:00Z: Good morning! I'm Fluffy from Telinfy. How can I help you today?
USER: We want to unify all our customer communication channels
ASSISTANT @ 2024-12-05T03:32:00Z: That's smart! Our multichannel platform brings WhatsApp, SMS, RCS, Voice, and Email into one unified inbox. What channels are you currently using?
USER: We have WhatsApp with one provider, SMS with another, and calls through our PBX. It's a mess to manage.
ASSISTANT @ 2024-12-05T03:34:00Z: I understand the pain! With Telinfy, you get one dashboard, one API, and one billing for all channels. Your agents can see complete customer history across all touchpoints. How many agents handle customer queries?
USER: About 50 agents across different shifts. They struggle to find previous conversations.
ASSISTANT @ 2024-12-05T03:36:00Z: Our unified inbox solves that! When a customer reaches out on WhatsApp today and calls tomorrow, agents see the full history. We also offer smart routing based on channel preference. What's your current monthly spend across all channels?
USER: Roughly 3-4 lakhs per month combined.
ASSISTANT @ 2024-12-05T03:38:00Z: With consolidation, you'll likely see 15-20% cost savings plus operational efficiency. We can migrate all channels without service interruption. Would you like to see how the unified dashboard works?
USER: Yes, definitely. We're planning to add RCS too.
ASSISTANT @ 2024-12-05T03:40:00Z: Perfect timing! RCS is included in our multichannel suite. I'll arrange a comprehensive demo. Who should we contact?
USER: Deepak, our Head of Customer Experience. deepak@retailmart.in, +91 90909 09090
ASSISTANT @ 2024-12-05T03:42:00Z: Thanks! Our solutions architect will reach out to Deepak for a detailed multichannel demo. We'll prepare a migration plan too. Looking forward to simplifying your communications!`,

  partnership: `ASSISTANT @ 2024-12-03T09:45:00Z: Hello! Welcome to Telinfy. I'm Fluffy. What can I help you with?
USER: I'm from a software company and want to explore partnership opportunities
ASSISTANT @ 2024-12-03T09:47:00Z: Excellent! We have several partnership models - Reseller, Referral, Technology Partner, and White-label. What type of partnership interests you?
USER: We build CRM software and want to integrate messaging capabilities for our clients.
ASSISTANT @ 2024-12-03T09:49:00Z: A Technology Partnership would be perfect! You can embed our WhatsApp, SMS, RCS, and Voice APIs directly into your CRM. Your clients get seamless messaging without leaving your platform. How many clients do you have?
USER: Around 200 SMB clients currently, growing rapidly.
ASSISTANT @ 2024-12-03T09:51:00Z: Great scale! As a tech partner, you get wholesale API pricing, co-branded documentation, and dedicated integration support. Your clients benefit, and you earn on every message. What CRM platform do you use?
USER: It's our own proprietary CRM built on Node.js.
ASSISTANT @ 2024-12-03T09:53:00Z: Our REST APIs integrate easily with Node.js. We also provide SDKs and webhook support. Want me to connect you with our partnership team to discuss revenue sharing?
USER: Yes, and we'd also need sandbox access for development.
ASSISTANT @ 2024-12-03T09:55:00Z: Absolutely! You'll get sandbox credentials for all channels, test credits, and technical documentation. Who handles partnerships at your company?
USER: I'm Suresh, Co-founder. suresh@crmtech.in, +91 98765 12345
ASSISTANT @ 2024-12-03T09:57:00Z: Thanks Suresh! Our Partner Manager will reach out within 24 hours with partnership options and sandbox access. We're excited to power messaging for your 200+ clients!`,

  whatsapp_commerce: `ASSISTANT @ 2024-12-04T06:00:00Z: Hi there! I'm Fluffy from Telinfy. What brings you to us today?
USER: We want to set up WhatsApp Commerce for our D2C brand
ASSISTANT @ 2024-12-04T06:02:00Z: WhatsApp Commerce is booming for D2C! You can showcase products, take orders, and process payments - all within WhatsApp. What products do you sell?
USER: Fashion and accessories. We get a lot of inquiries on WhatsApp but can't process orders there.
ASSISTANT @ 2024-12-04T06:04:00Z: Perfect use case! With WhatsApp Commerce, you can send product catalogs, collect orders with cart functionality, and integrate payment links. Do you use Shopify or any e-commerce platform?
USER: Yes, we're on Shopify.
ASSISTANT @ 2024-12-04T06:06:00Z: Great! We have native Shopify integration. Orders placed on WhatsApp sync directly to your Shopify dashboard. Inventory updates automatically too. What's your current monthly order volume?
USER: Around 2,000 orders, but 40% of inquiries don't convert because the process is manual.
ASSISTANT @ 2024-12-04T06:08:00Z: That's a lot of lost revenue! WhatsApp Commerce with automated catalog and checkout can recover most of those. We also support abandoned cart reminders. Would you like to see how other D2C brands use it?
USER: Yes! And what about COD orders?
ASSISTANT @ 2024-12-04T06:10:00Z: COD is fully supported! Customers can choose payment method in-chat. We integrate with Razorpay, Cashfree, and major logistics partners for COD collection. Who should we contact for a demo?
USER: Contact Neha at neha@fashionista.in or +91 88899 77766
ASSISTANT @ 2024-12-04T06:12:00Z: Thanks Neha! Our commerce specialist will show you how to set up your catalog and start selling on WhatsApp. Expect a call tomorrow!`,

  bulk_sms: `ASSISTANT @ 2024-12-03T12:15:00Z: Hello! Welcome to Telinfy. I'm Fluffy. How can I help?
USER: I need to send bulk promotional SMS for my retail chain
ASSISTANT @ 2024-12-03T12:17:00Z: We handle large-scale promotional SMS campaigns with high deliverability. How many messages do you typically send per campaign?
USER: Around 500,000 SMS per month across our 50 stores.
ASSISTANT @ 2024-12-03T12:19:00Z: Good volume! For promotional SMS, we offer smart scheduling, regional targeting, and A/B testing. Are your DLT templates already approved?
USER: We have some, but need help with new promotional templates.
ASSISTANT @ 2024-12-03T12:21:00Z: Our compliance team can help draft and submit templates. We have 95%+ approval rate for promotional templates. Do you need regional language support?
USER: Yes, Hindi, Marathi, and Gujarati for different regions.
ASSISTANT @ 2024-12-03T12:23:00Z: All supported! We can segment your audience by region and send in their preferred language. We also provide detailed analytics - clicks, conversions, and ROI tracking. Interested?
USER: Yes, what's the pricing for 500K monthly?
ASSISTANT @ 2024-12-03T12:25:00Z: For that volume, we offer volume discounts. I'll have our enterprise team share a custom quote. Who handles marketing?
USER: I'm Rajesh, Marketing Head. rajesh@retailking.in, +91 77889 90011
ASSISTANT @ 2024-12-03T12:27:00Z: Thanks Rajesh! Our team will send a detailed proposal with pricing tiers and campaign management features. Let's boost your store footfall!`,

  ivr_setup: `ASSISTANT @ 2024-12-05T04:30:00Z: Good morning! I'm Fluffy from Telinfy. How can I assist you today?
USER: We need to set up an IVR system for our customer support
ASSISTANT @ 2024-12-05T04:32:00Z: IVR is great for routing calls efficiently! What type of business do you run and what's your call volume?
USER: We're an insurance company. We get about 1,000 calls daily for claims, policy inquiries, and renewals.
ASSISTANT @ 2024-12-05T04:34:00Z: Insurance needs sophisticated IVR with multiple menus. Our IVR builder lets you create multi-level menus, collect policy numbers via DTMF, and route to specialized agents. Do you need integration with your policy management system?
USER: Yes, we want callers to check claim status automatically.
ASSISTANT @ 2024-12-05T04:36:00Z: We can integrate with your backend to provide automated claim status via voice. Customers enter their claim number and hear real-time updates without waiting for an agent. What languages do you need?
USER: Hindi and English, with option for regional languages later.
ASSISTANT @ 2024-12-05T04:38:00Z: Easily done! We support 12 languages and you can add more anytime. We also offer call recording, analytics, and missed call callbacks. Would you like a demo of our IVR builder?
USER: Yes, and we need it compliant with insurance regulations.
ASSISTANT @ 2024-12-05T04:40:00Z: All our solutions are IRDAI compliant with proper call recording retention. I'll connect you with our enterprise voice team. Who should we contact?
USER: Amit Shah, Head of Operations. amit.shah@insureco.in, +91 98123 45678
ASSISTANT @ 2024-12-05T04:42:00Z: Thanks Amit! Our team will arrange a demo this week showcasing insurance-specific IVR flows. We'll also share compliance documentation!`,

  referral_partner: `ASSISTANT @ 2024-12-04T08:45:00Z: Hello! I'm Fluffy from Telinfy. What can I help you with today?
USER: I'm a freelance consultant and want to refer clients to you for commission
ASSISTANT @ 2024-12-04T08:47:00Z: We'd love to work with you! Our Referral Partner program offers 15% commission on first-year revenue from your referrals. What industry do you consult in?
USER: I help SMBs with digital transformation, often recommending communication tools.
ASSISTANT @ 2024-12-04T08:49:00Z: Perfect fit! Many SMBs need WhatsApp API, SMS, or multichannel solutions during digital transformation. You can earn recurring commission while helping your clients succeed. How many clients do you typically work with?
USER: About 10-15 active clients at any time.
ASSISTANT @ 2024-12-04T08:51:00Z: Great! As a referral partner, you get a unique tracking link, co-branded materials, and a partner dashboard to track your referrals and earnings. Would you like to sign up?
USER: Yes, but I want to understand the products first so I can recommend correctly.
ASSISTANT @ 2024-12-04T08:53:00Z: Smart approach! We'll provide product training and a sandbox account to test all features. You'll also get priority support for your referred clients. Who should we register as partner?
USER: I'm Kavitha. kavitha.consultant@gmail.com, +91 99001 22334
ASSISTANT @ 2024-12-04T08:55:00Z: Thanks Kavitha! Our partner team will send you the onboarding kit with training materials and your referral link. Let's start earning together!`
};

// Generate comprehensive sample leads
export const sampleLeads: Lead[] = [
  {
    id: 'lead-001',
    prospect_name: 'Rahul Kumar',
    phone: '+91 98765 43210',
    email: 'rahul.kumar@techcorp.in',
    company_name: 'TechCorp India',
    region: 'Delhi NCR',
    conversation_date: '2024-12-05',
    start_time_ist: '10:15 AM',
    end_time_ist: '10:30 AM',
    duration_minutes: 15,
    total_messages: 20,
    user_messages: 10,
    assistant_messages: 10,
    conversation: conversations.whatsapp_api,
    conversation_summary: 'Enterprise IT services company with 500 employees seeking WhatsApp Business API for handling 10,000 daily customer queries. Uses Zoho CRM and needs integration. Urgent timeline of 2 weeks. Budget of 5-10 lakhs annually.',
    conversation_timeline_points: [
      'Initial inquiry about WhatsApp Business API',
      'Revealed 500 employees and 10,000 daily queries',
      'Confirmed Zoho CRM usage - integration critical',
      'Urgent 2-week implementation timeline',
      'Budget confirmed: 5-10 lakhs annually',
      'Contact details shared for enterprise follow-up'
    ],
    primary_topic: 'WhatsApp Business API',
    secondary_topics: ['CRM Integration', 'Template Approval', 'Enterprise Support'],
    use_case_category: 'Customer Support',
    need_summary: 'Scalable WhatsApp API solution with Zoho CRM integration for high-volume customer support',
    lead_score: 92,
    intent_level: 'high',
    buyer_stage: 'decision',
    urgency: 'critical',
    is_hot_lead: true,
    sentiment_overall: 'very_positive',
    emotional_intensity: 'high',
    motivation_type: 'Urgent business need',
    trust_level: 'high',
    next_action: 'Enterprise Sales Manager to call within 1 hour with custom proposal',
    recommended_routing: 'Enterprise Sales',
    needs_immediate_followup: true,
    key_questions: ['Can you handle template approvals?', 'Zoho integration available?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: '5-10 Lakhs',
    estimated_scale: '10,000+ messages/day',
    partner_intent: false,
    is_enterprise: true,
    is_partner: false,
    completeness: 95,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-05T10:30:00Z',
    updated_at: '2024-12-05T10:30:00Z',
    status: 'new'
  },
  {
    id: 'lead-002',
    prospect_name: 'Priya',
    phone: '+91 98765 11111',
    email: 'priya@shopfast.in',
    company_name: 'ShopFast E-commerce',
    region: 'Mumbai',
    conversation_date: '2024-12-05',
    start_time_ist: '2:30 PM',
    end_time_ist: '2:42 PM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.rcs_messaging,
    conversation_summary: 'E-commerce company interested in RCS messaging as upgrade from SMS. Currently sends 50,000 messages monthly for order updates and promotions. Customers on Jio, Airtel, Vi. Wants better engagement than SMS.',
    conversation_timeline_points: [
      'Inquiry about RCS messaging',
      'E-commerce use case for better engagement',
      '50,000 messages monthly volume',
      'Mixed carrier base - Jio, Airtel, Vi',
      'Asked about pricing vs SMS',
      'Contact details shared for demo'
    ],
    primary_topic: 'RCS Messaging',
    secondary_topics: ['E-commerce', 'Order Updates', 'Promotions'],
    use_case_category: 'Marketing & Engagement',
    need_summary: 'RCS messaging solution for e-commerce order updates and promotional campaigns',
    lead_score: 75,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: false,
    sentiment_overall: 'positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Better engagement',
    trust_level: 'medium',
    next_action: 'RCS specialist to arrange demo with pricing within 24 hours',
    recommended_routing: 'RCS Solutions',
    needs_immediate_followup: false,
    key_questions: ['What is RCS?', 'Pricing compared to SMS?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: '1-2 Lakhs',
    estimated_scale: '50,000 messages/month',
    partner_intent: false,
    is_enterprise: false,
    is_partner: false,
    completeness: 85,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-05T14:42:00Z',
    updated_at: '2024-12-05T14:42:00Z',
    status: 'new'
  },
  {
    id: 'lead-003',
    prospect_name: 'Vikram',
    phone: '+91 99887 76655',
    email: 'vikram@securebank.in',
    company_name: 'SecureBank',
    region: 'Bangalore',
    conversation_date: '2024-12-04',
    start_time_ist: '11:00 AM',
    end_time_ist: '11:12 AM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.sms_gateway,
    conversation_summary: 'Banking company needs reliable SMS gateway for 100,000 daily OTPs. Current delivery rate is only 85% causing complaints. Needs DLT compliance assistance. Interested in pilot program.',
    conversation_timeline_points: [
      'Need SMS gateway for OTP delivery',
      '100,000 OTPs daily for banking app',
      'Current delivery rate only 85%',
      'Needs DLT registration help',
      'Interested in pilot program',
      'CTO contact shared'
    ],
    primary_topic: 'SMS Gateway',
    secondary_topics: ['OTP Delivery', 'DLT Compliance', 'Banking'],
    use_case_category: 'Transactional Messaging',
    need_summary: 'High-throughput SMS gateway for banking OTPs with DLT compliance support',
    lead_score: 88,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'high',
    is_hot_lead: true,
    sentiment_overall: 'positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Reliability improvement',
    trust_level: 'high',
    next_action: 'SMS solutions team to contact CTO for pilot setup within 48 hours',
    recommended_routing: 'Enterprise SMS',
    needs_immediate_followup: true,
    key_questions: ['Can you help with DLT?', 'What delivery rate can you achieve?'],
    main_objections: ['Current provider has 85% delivery'],
    competitors_mentioned: [],
    budget_bucket_inr: '2-5 Lakhs',
    estimated_scale: '100,000 SMS/day',
    partner_intent: false,
    is_enterprise: true,
    is_partner: false,
    completeness: 90,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-04T11:12:00Z',
    updated_at: '2024-12-04T11:12:00Z',
    status: 'new'
  },
  {
    id: 'lead-004',
    prospect_name: 'Anita',
    phone: '+91 87654 32109',
    email: 'anita@healthplus.in',
    company_name: 'HealthPlus Hospitals',
    region: 'Chennai',
    conversation_date: '2024-12-04',
    start_time_ist: '4:00 PM',
    end_time_ist: '4:12 PM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.voice_solution,
    conversation_summary: 'Hospital chain needs automated voice calls for appointment reminders (5,000 daily) and payment collection (2,000 daily). Needs multilingual support - Hindi, English, Tamil. Interested in CRM integration.',
    conversation_timeline_points: [
      'Need voice calling for appointment reminders',
      '5,000 reminder + 2,000 payment calls daily',
      'Requires multilingual: Hindi, English, Tamil',
      'Needs CRM integration',
      'Interested in demo',
      'Contact details shared'
    ],
    primary_topic: 'Voice Solutions',
    secondary_topics: ['IVR', 'Automated Calls', 'Healthcare'],
    use_case_category: 'Voice Automation',
    need_summary: 'Automated voice calling solution for hospital appointment reminders and payment collection',
    lead_score: 72,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: false,
    sentiment_overall: 'positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Operational efficiency',
    trust_level: 'medium',
    next_action: 'Voice solutions team to arrange demo this week',
    recommended_routing: 'Voice Solutions',
    needs_immediate_followup: false,
    key_questions: ['Do you support multilingual?', 'CRM integration available?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: '1-2 Lakhs',
    estimated_scale: '7,000 calls/day',
    partner_intent: false,
    is_enterprise: true,
    is_partner: false,
    completeness: 85,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-04T16:12:00Z',
    updated_at: '2024-12-04T16:12:00Z',
    status: 'new'
  },
  {
    id: 'lead-005',
    prospect_name: 'Deepak',
    phone: '+91 90909 09090',
    email: 'deepak@retailmart.in',
    company_name: 'RetailMart',
    region: 'Hyderabad',
    conversation_date: '2024-12-05',
    start_time_ist: '9:00 AM',
    end_time_ist: '9:12 AM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.multichannel,
    conversation_summary: 'Retail company wants to unify WhatsApp, SMS, and Voice into single platform. Currently using 3 different providers spending 3-4 lakhs monthly. 50 agents struggle with fragmented conversations. Planning to add RCS.',
    conversation_timeline_points: [
      'Want to unify all communication channels',
      'Currently using 3 different providers',
      '50 agents facing fragmented conversations',
      'Monthly spend: 3-4 lakhs',
      'Planning to add RCS',
      'Head of CX contact shared'
    ],
    primary_topic: 'Multichannel Platform',
    secondary_topics: ['WhatsApp', 'SMS', 'Voice', 'RCS'],
    use_case_category: 'Unified Communications',
    need_summary: 'Unified multichannel platform to consolidate WhatsApp, SMS, Voice, and add RCS',
    lead_score: 85,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: true,
    sentiment_overall: 'very_positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Cost savings and efficiency',
    trust_level: 'high',
    next_action: 'Solutions architect to demo unified dashboard with migration plan',
    recommended_routing: 'Enterprise Solutions',
    needs_immediate_followup: false,
    key_questions: ['Can you consolidate all channels?', 'What cost savings?'],
    main_objections: ['Current setup is fragmented'],
    competitors_mentioned: [],
    budget_bucket_inr: '3-4 Lakhs',
    estimated_scale: '50 agents, multi-channel',
    partner_intent: false,
    is_enterprise: true,
    is_partner: false,
    completeness: 90,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-05T09:12:00Z',
    updated_at: '2024-12-05T09:12:00Z',
    status: 'new'
  },
  {
    id: 'lead-006',
    prospect_name: 'Suresh',
    phone: '+91 98765 12345',
    email: 'suresh@crmtech.in',
    company_name: 'CRMTech Solutions',
    region: 'Pune',
    conversation_date: '2024-12-03',
    start_time_ist: '3:15 PM',
    end_time_ist: '3:27 PM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.partnership,
    conversation_summary: 'Software company building CRM wants Technology Partnership to embed messaging APIs. Has 200 SMB clients. Interested in white-label integration of WhatsApp, SMS, RCS, and Voice. Needs sandbox access.',
    conversation_timeline_points: [
      'Software company wants partnership',
      'Builds proprietary CRM on Node.js',
      '200 SMB clients currently',
      'Wants to embed messaging APIs',
      'Needs sandbox for development',
      'Co-founder contact shared'
    ],
    primary_topic: 'Partnership',
    secondary_topics: ['Technology Partner', 'API Integration', 'White-label'],
    use_case_category: 'Partnership',
    need_summary: 'Technology partnership to embed messaging APIs into proprietary CRM for 200+ clients',
    lead_score: 82,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: true,
    sentiment_overall: 'very_positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Revenue expansion',
    trust_level: 'high',
    next_action: 'Partner Manager to discuss partnership options and provide sandbox access',
    recommended_routing: 'Partnership Team',
    needs_immediate_followup: false,
    key_questions: ['What partnership models?', 'Can we get sandbox access?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: 'Revenue Share Model',
    estimated_scale: '200+ end clients',
    partner_intent: true,
    is_enterprise: false,
    is_partner: true,
    completeness: 92,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-03T15:27:00Z',
    updated_at: '2024-12-03T15:27:00Z',
    status: 'new'
  },
  {
    id: 'lead-007',
    prospect_name: 'Neha',
    phone: '+91 88899 77766',
    email: 'neha@fashionista.in',
    company_name: 'Fashionista D2C',
    region: 'Delhi',
    conversation_date: '2024-12-04',
    start_time_ist: '11:30 AM',
    end_time_ist: '11:42 AM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.whatsapp_commerce,
    conversation_summary: 'D2C fashion brand wants WhatsApp Commerce setup. Currently on Shopify with 2,000 monthly orders but 40% inquiries don\'t convert due to manual process. Needs catalog, checkout, and COD support.',
    conversation_timeline_points: [
      'Wants WhatsApp Commerce for D2C brand',
      'Fashion and accessories business',
      'Uses Shopify with 2,000 monthly orders',
      '40% inquiries lost due to manual process',
      'Needs COD support',
      'Contact shared for demo'
    ],
    primary_topic: 'WhatsApp Commerce',
    secondary_topics: ['Shopify Integration', 'Product Catalog', 'COD'],
    use_case_category: 'E-commerce',
    need_summary: 'WhatsApp Commerce with Shopify integration for D2C fashion brand',
    lead_score: 78,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: false,
    sentiment_overall: 'positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Revenue recovery',
    trust_level: 'high',
    next_action: 'Commerce specialist to demo catalog setup and Shopify integration',
    recommended_routing: 'Commerce Solutions',
    needs_immediate_followup: false,
    key_questions: ['Do you support COD?', 'Shopify integration available?'],
    main_objections: ['40% conversion loss due to manual process'],
    competitors_mentioned: [],
    budget_bucket_inr: '50K-1 Lakh',
    estimated_scale: '2,000+ orders/month',
    partner_intent: false,
    is_enterprise: false,
    is_partner: false,
    completeness: 85,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-04T11:42:00Z',
    updated_at: '2024-12-04T11:42:00Z',
    status: 'new'
  },
  {
    id: 'lead-008',
    prospect_name: 'Rajesh',
    phone: '+91 77889 90011',
    email: 'rajesh@retailking.in',
    company_name: 'RetailKing Stores',
    region: 'Gujarat',
    conversation_date: '2024-12-03',
    start_time_ist: '5:45 PM',
    end_time_ist: '5:57 PM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.bulk_sms,
    conversation_summary: 'Retail chain with 50 stores needs bulk promotional SMS. Volume: 500,000 SMS monthly. Needs DLT template help and regional language support - Hindi, Marathi, Gujarati.',
    conversation_timeline_points: [
      'Need bulk promotional SMS',
      '500,000 SMS monthly across 50 stores',
      'Needs DLT template assistance',
      'Regional languages: Hindi, Marathi, Gujarati',
      'Wants detailed analytics',
      'Marketing Head contact shared'
    ],
    primary_topic: 'Bulk SMS',
    secondary_topics: ['Promotional SMS', 'DLT Compliance', 'Regional Languages'],
    use_case_category: 'Marketing',
    need_summary: 'Bulk promotional SMS solution for retail chain with regional language support',
    lead_score: 70,
    intent_level: 'medium',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: false,
    sentiment_overall: 'positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Marketing reach',
    trust_level: 'medium',
    next_action: 'Enterprise team to send custom proposal with volume pricing',
    recommended_routing: 'SMS Solutions',
    needs_immediate_followup: false,
    key_questions: ['What is pricing for 500K?', 'Can you help with DLT?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: '1-2 Lakhs',
    estimated_scale: '500,000 SMS/month',
    partner_intent: false,
    is_enterprise: true,
    is_partner: false,
    completeness: 80,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-03T17:57:00Z',
    updated_at: '2024-12-03T17:57:00Z',
    status: 'new'
  },
  {
    id: 'lead-009',
    prospect_name: 'Amit Shah',
    phone: '+91 98123 45678',
    email: 'amit.shah@insureco.in',
    company_name: 'InsureCo',
    region: 'Mumbai',
    conversation_date: '2024-12-05',
    start_time_ist: '10:00 AM',
    end_time_ist: '10:12 AM',
    duration_minutes: 12,
    total_messages: 14,
    user_messages: 7,
    assistant_messages: 7,
    conversation: conversations.ivr_setup,
    conversation_summary: 'Insurance company needs IVR for customer support. 1,000 daily calls for claims, policy inquiries, renewals. Wants automated claim status check and multilingual support (Hindi, English). Needs IRDAI compliance.',
    conversation_timeline_points: [
      'Need IVR for insurance support',
      '1,000 daily calls',
      'Claim status automation needed',
      'Multilingual: Hindi, English',
      'IRDAI compliance required',
      'Head of Operations contact shared'
    ],
    primary_topic: 'IVR System',
    secondary_topics: ['Voice', 'Automation', 'Insurance', 'Compliance'],
    use_case_category: 'Voice Automation',
    need_summary: 'IRDAI-compliant IVR system for insurance customer support with automated claim status',
    lead_score: 80,
    intent_level: 'high',
    buyer_stage: 'consideration',
    urgency: 'medium',
    is_hot_lead: true,
    sentiment_overall: 'positive',
    emotional_intensity: 'moderate',
    motivation_type: 'Customer service improvement',
    trust_level: 'medium',
    next_action: 'Enterprise voice team to demo IVR builder with compliance docs',
    recommended_routing: 'Voice Solutions',
    needs_immediate_followup: false,
    key_questions: ['Is it IRDAI compliant?', 'Can you integrate with policy system?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: '2-3 Lakhs',
    estimated_scale: '1,000 calls/day',
    partner_intent: false,
    is_enterprise: true,
    is_partner: false,
    completeness: 88,
    isValid: true,
    missingFields: [],
    has_phone: true,
    has_email: true,
    has_company: true,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-05T10:12:00Z',
    updated_at: '2024-12-05T10:12:00Z',
    status: 'new'
  },
  {
    id: 'lead-010',
    prospect_name: 'Kavitha',
    phone: '+91 99001 22334',
    email: 'kavitha.consultant@gmail.com',
    company_name: 'Independent Consultant',
    region: 'Bangalore',
    conversation_date: '2024-12-04',
    start_time_ist: '2:15 PM',
    end_time_ist: '2:25 PM',
    duration_minutes: 10,
    total_messages: 12,
    user_messages: 6,
    assistant_messages: 6,
    conversation: conversations.referral_partner,
    conversation_summary: 'Freelance digital transformation consultant wants to join referral partner program. Works with 10-15 SMB clients. Interested in earning commission by referring clients for communication solutions.',
    conversation_timeline_points: [
      'Freelance consultant interested in referral program',
      'Helps SMBs with digital transformation',
      '10-15 active clients',
      'Wants to understand products first',
      'Needs training materials',
      'Contact shared for partner registration'
    ],
    primary_topic: 'Referral Partnership',
    secondary_topics: ['Commission', 'SMB Clients', 'Training'],
    use_case_category: 'Partnership',
    need_summary: 'Referral partner registration for freelance consultant with SMB client base',
    lead_score: 55,
    intent_level: 'medium',
    buyer_stage: 'awareness',
    urgency: 'low',
    is_hot_lead: false,
    sentiment_overall: 'positive',
    emotional_intensity: 'low',
    motivation_type: 'Additional income',
    trust_level: 'medium',
    next_action: 'Partner team to send onboarding kit and training materials',
    recommended_routing: 'Partnership Team',
    needs_immediate_followup: false,
    key_questions: ['What is commission structure?', 'Can I get training?'],
    main_objections: [],
    competitors_mentioned: [],
    budget_bucket_inr: 'Commission Model',
    estimated_scale: '10-15 referrals/year',
    partner_intent: true,
    is_enterprise: false,
    is_partner: true,
    completeness: 70,
    isValid: true,
    missingFields: ['company_name'],
    has_phone: true,
    has_email: true,
    has_company: false,
    source: 'Website',
    channel: 'WhatsApp',
    created_at: '2024-12-04T14:25:00Z',
    updated_at: '2024-12-04T14:25:00Z',
    status: 'new'
  }
];

// Helper function to get leads stats
export function getLeadStats(leads: Lead[]): {
  total: number;
  highIntent: number;
  hotLeads: number;
  needsFollowup: number;
  avgScore: number;
  byIntent: Record<string, number>;
  byStage: Record<string, number>;
  byUrgency: Record<string, number>;
} {
  return {
    total: leads.length,
    highIntent: leads.filter(l => l.intent_level === 'high').length,
    hotLeads: leads.filter(l => l.is_hot_lead).length,
    needsFollowup: leads.filter(l => l.needs_immediate_followup).length,
    avgScore: Math.round(leads.reduce((acc, l) => acc + l.lead_score, 0) / leads.length),
    byIntent: {
      high: leads.filter(l => l.intent_level === 'high').length,
      medium: leads.filter(l => l.intent_level === 'medium').length,
      low: leads.filter(l => l.intent_level === 'low').length,
    },
    byStage: {
      awareness: leads.filter(l => l.buyer_stage === 'awareness').length,
      consideration: leads.filter(l => l.buyer_stage === 'consideration').length,
      decision: leads.filter(l => l.buyer_stage === 'decision').length,
    },
    byUrgency: {
      critical: leads.filter(l => l.urgency === 'critical').length,
      high: leads.filter(l => l.urgency === 'high').length,
      medium: leads.filter(l => l.urgency === 'medium').length,
      low: leads.filter(l => l.urgency === 'low').length,
    }
  };
}
