import '../models/guided_topic.dart';

List<GuidedTopic> buildFallbackGuidedTopics() => [
  GuidedTopic(
    topicId: 'academic-communication',
    title: 'Academic Communication',
    description:
        'Practice navigating academic consultations, after-class discussions, and respectful communication with lecturers.',
    iconKey: 'school',
    displayOrder: 1,
    isActive: true,
    languageObjectives: const [
      'Greeting a foreign lecturer',
      'Introducing yourself',
      'Asking questions politely',
      'Requesting clarification',
      'Expressing an opinion respectfully',
      'Ending an academic conversation',
    ],
    iccObjectives: const [
      'Formal address',
      'Respectful disagreement',
      'Polite requests',
      'Appropriate student-lecturer distance',
      'Asking for assistance without sounding demanding',
    ],
  ),
  GuidedTopic(
    topicId: 'social-communication',
    title: 'Social Communication',
    description:
        'Practice social interactions in cafes and restaurants in international cities like London and Melbourne.',
    iconKey: 'restaurant',
    displayOrder: 2,
    isActive: true,
    languageObjectives: const [
      'Ordering food and drinks',
      'Making indirect requests',
      'Asking for recommendations',
      'Asking about payment',
      'Thanking service staff',
    ],
    iccObjectives: const [
      'Politeness conventions',
      'Queue culture',
      'Tipping expectations',
      'Appropriate body language',
      'Differences between direct and indirect requests',
    ],
  ),
  GuidedTopic(
    topicId: 'professional-communication',
    title: 'Professional Communication',
    description:
        'Practice formal job interviews and networking conversations at international career events.',
    iconKey: 'work',
    displayOrder: 3,
    isActive: true,
    languageObjectives: const [
      'Professional self-introduction',
      'Talking about experience',
      'Answering interview questions',
      'Asking the interviewer questions',
      'Closing an interview',
    ],
    iccObjectives: const [
      'Eye contact',
      'Confidence without arrogance',
      'Professional etiquette',
      'Humility',
      'International workplace expectations',
    ],
  ),
];
