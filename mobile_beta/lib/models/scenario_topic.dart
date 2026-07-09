class ScenarioTopic {
  final String id;
  final String title;
  final String type;
  final String level;
  final String arScene;
  final String studentRole;
  final String aiRole;
  final String taskInstruction;
  final bool isAvailable;

  const ScenarioTopic({
    required this.id,
    required this.title,
    required this.type,
    required this.level,
    required this.arScene,
    required this.studentRole,
    required this.aiRole,
    required this.taskInstruction,
    this.isAvailable = true,
  });

  factory ScenarioTopic.fromJson(Map<String, dynamic> json) {
    return ScenarioTopic(
      id: json['scenario_id'] ?? '',
      title: json['title'] ?? '',
      type: json['scenario_type'] ?? '',
      level: json['level'] ?? '',
      arScene: json['ar_scene'] ?? '',
      studentRole: json['student_role'] ?? '',
      aiRole: json['ai_role'] ?? '',
      taskInstruction: json['task_instruction'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'scenario_id': id,
    'title': title,
    'scenario_type': type,
    'level': level,
    'ar_scene': arScene,
    'student_role': studentRole,
    'ai_role': aiRole,
    'task_instruction': taskInstruction,
    'is_available': isAvailable,
  };
}

const List<ScenarioTopic> scenarioTopics = [
  ScenarioTopic(
    id: "L-ICC-002",
    title: "Different Regional Greeting Norms",
    type: "Local Indonesian Intercultural",
    level: "B1",
    arScene: "Student dormitory lobby",
    studentRole: "New student meeting a roommate",
    aiRole: "Roommate from another Indonesian region",
    taskInstruction:
        "Introduce yourself and begin safe, respectful small talk.",
  ),
  ScenarioTopic(
    id: "L-ICC-003",
    title: "Food, Religion, and Cultural Sensitivity",
    type: "Local Indonesian Intercultural",
    level: "B1",
    arScene: "Campus canteen",
    studentRole: "Student inviting a classmate to lunch",
    aiRole: "Classmate with dietary or religious considerations",
    taskInstruction:
        "Invite your classmate to eat and ask about food preferences respectfully.",
  ),
  ScenarioTopic(
    id: "L-ICC-004",
    title: "Urban and Rural Communication Styles",
    type: "Local Indonesian Intercultural",
    level: "B1-B2",
    arScene: "Campus project meeting",
    studentRole: "Student collaborating in a group project",
    aiRole: "Quiet but capable peer",
    taskInstruction:
        "Encourage your groupmate to participate without making assumptions.",
  ),
  ScenarioTopic(
    id: "N-ICC-005",
    title: "Talking About Culture on Campus",
    type: "Global Intercultural Campus Conversation",
    level: "B1-B2",
    arScene: "Campus courtyard near the International Office",
    studentRole: "Rina, a local Indonesian student",
    aiRole: "David, an international student from Australia",
    taskInstruction:
        "Discuss Australian and Indonesian culture respectfully with David.",
  ),
  ScenarioTopic(
    id: "L-ICC-006",
    title: "Different Ways of Showing Respect to Seniors",
    type: "Local Indonesian Intercultural",
    level: "B1",
    arScene: "Campus organization meeting",
    studentRole: "Junior member speaking to senior members",
    aiRole: "Senior student",
    taskInstruction:
        "Present a new activity suggestion using respectful language.",
  ),
  ScenarioTopic(
    id: "L-ICC-007",
    title: "Humor and Misunderstanding Across Regions",
    type: "Local Indonesian Intercultural",
    level: "B1-B2",
    arScene: "Campus cafe",
    studentRole: "Student chatting with friends",
    aiRole: "Friend who misunderstood a joke",
    taskInstruction:
        "Apologize, clarify your intention, and repair the misunderstanding.",
  ),
  ScenarioTopic(
    id: "G-ICC-008",
    title: "Meeting an International Student on Campus",
    type: "Global Intercultural",
    level: "B1",
    arScene: "In front of the International Office on campus",
    studentRole: "Rina, a student volunteer",
    aiRole: "David, an exchange student from Australia",
    taskInstruction:
        "Welcome David, answer campus questions, and begin the campus tour.",
  ),
  ScenarioTopic(
    id: "L-ICC-001",
    title: "Direct and Indirect Communication",
    type: "Local Indonesian Intercultural",
    level: "B1",
    arScene: "University group discussion room",
    studentRole: "Group presentation member",
    aiRole: "Peer from another Indonesian region",
    taskInstruction:
        "Respond to disagreement politely and negotiate a solution.",
  ),
  ScenarioTopic(
    id: "G-ICC-009",
    title: "Asking for a Deadline Extension",
    type: "Global Academic Intercultural",
    level: "B1-B2",
    arScene: "Lecturer's office",
    studentRole: "Student requesting an extension",
    aiRole: "English-speaking lecturer",
    taskInstruction:
        "Ask your lecturer politely for a short deadline extension.",
  ),
  ScenarioTopic(
    id: "M-ICC-010",
    title: "Mixed Local and Global Group Project",
    type: "Mixed Local-Global Intercultural",
    level: "B2",
    arScene: "Collaborative project room",
    studentRole: "Student working with local and international peers",
    aiRole: "Group member with different teamwork expectations",
    taskInstruction:
        "Negotiate fair task division and include all group members.",
  ),
];
