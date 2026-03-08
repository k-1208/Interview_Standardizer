export interface CandidateProfile {
  id: string;
  name: string;
  board: string;
  grade10: string;
  grade12: string;
  gpa: string;
  degree: string;
  email: string;
  status: "pending" | "reviewed" | "interviewing" | "completed";
  dateAdded: string;
  activities: string[];
  achievements: string[];
  essays: { title: string; content: string }[];
  summary: string;
  strengths: string[];
  growthAreas: string[];
  skills: string[];
}

export const mockCandidates: CandidateProfile[] = [
  {
    id: "C001",
    name: "Arjun Mehta",
    board: "CBSE",
    grade10: "92.5",
    grade12: "94.2",
    gpa: "3.9",
    degree: "B.Tech Computer Science",
    email: "arjun.mehta@email.com",
    status: "reviewed",
    dateAdded: "2026-03-01",
    activities: ["Robotics Club President", "School Cricket Team Captain", "Math Olympiad Participant"],
    achievements: ["National Robotics Competition – 2nd Place", "School Merit Scholarship 2025"],
    essays: [
      { title: "Why Plaksha?", content: "I believe Plaksha's interdisciplinary approach aligns perfectly with my ambition to build technology that solves real problems in India. The emphasis on first-principles thinking resonates deeply with how I approach challenges." },
    ],
    summary: "High-achieving student with a strong technical background and demonstrated leadership. Particularly impressive robotics project shows both creativity and execution.",
    strengths: ["Strong quantitative aptitude", "Proven leadership in technical domains", "Clear motivation and self-awareness"],
    growthAreas: ["Limited exposure to humanities/social sciences", "Could strengthen written communication"],
    skills: ["Python", "Arduino", "CAD", "Mathematics", "Leadership"],
  },
  {
    id: "C002",
    name: "Priya Sharma",
    board: "ICSE",
    grade10: "89.0",
    grade12: "91.5",
    gpa: "3.7",
    degree: "B.Sc. Physics",
    email: "priya.sharma@email.com",
    status: "interviewing",
    dateAdded: "2026-03-02",
    activities: ["Debate Team", "Community Tutoring", "Physics Society"],
    achievements: ["State Debate Champion 2025", "INSPIRE Award Finalist"],
    essays: [
      { title: "A Problem I Want to Solve", content: "Access to quality education in rural India remains deeply unequal. I want to build adaptive learning tools that can work offline and personalise to each student's pace." },
    ],
    summary: "Strong communicator with genuine passion for educational equity. Her debate background suggests critical thinking and persuasion skills.",
    strengths: ["Exceptional communication skills", "Empathy-driven problem definition", "Consistent academic performance"],
    growthAreas: ["Limited hands-on technical projects", "Could develop quantitative research skills"],
    skills: ["Public Speaking", "Research", "Python Basics", "Statistics"],
  },
  {
    id: "C003",
    name: "Rohan Kumar",
    board: "State",
    grade10: "85.3",
    grade12: "88.7",
    gpa: "3.5",
    degree: "B.E. Electronics",
    email: "rohan.kumar@email.com",
    status: "pending",
    dateAdded: "2026-03-03",
    activities: ["Electronics Tinkering Club", "NSS Volunteer", "Football Team"],
    achievements: ["District Science Fair Winner", "NSS Best Volunteer Award"],
    essays: [
      { title: "My Greatest Challenge", content: "Coming from a small town, I had to build my own learning resources. That constraint taught me resourcefulness and the power of peer learning networks." },
    ],
    summary: "Self-motivated learner who has overcome resource constraints. His NSS work speaks to strong community values.",
    strengths: ["Resourcefulness under constraints", "Community-oriented mindset", "Hardware prototyping skills"],
    growthAreas: ["Academic scores slightly below cohort average", "Needs stronger project documentation"],
    skills: ["Electronics", "Circuit Design", "Soldering", "Community Work"],
  },
  {
    id: "C004",
    name: "Ananya Singh",
    board: "CBSE",
    grade10: "95.0",
    grade12: "96.5",
    gpa: "4.0",
    degree: "B.Tech AI & Data Science",
    email: "ananya.singh@email.com",
    status: "completed",
    dateAdded: "2026-03-04",
    activities: ["AI Research Intern at IIT Delhi", "Women in STEM Club Founder", "Dance Society"],
    achievements: ["Top 1% CBSE Board", "Google AI for Social Good Finalist", "Young Innovator Award"],
    essays: [
      { title: "Why AI?", content: "After interning at IIT Delhi, I realised AI is only as good as the people who build it. Plaksha's focus on ethical, human-centred design is exactly the environment I need to grow." },
    ],
    summary: "Exceptional candidate with research experience and outstanding academics. Founded a women-in-STEM club showing initiative beyond self.",
    strengths: ["Research aptitude", "Initiative and leadership", "Clear long-term vision"],
    growthAreas: ["May benefit from more industry exposure", "Could explore failure/resilience stories"],
    skills: ["Python", "Machine Learning", "TensorFlow", "Data Analysis", "Leadership"],
  },
  {
    id: "C005",
    name: "Vikram Patel",
    board: "ICSE",
    grade10: "87.2",
    grade12: "90.0",
    gpa: "3.6",
    degree: "B.Tech Mechanical",
    email: "vikram.patel@email.com",
    status: "reviewed",
    dateAdded: "2026-03-05",
    activities: ["Formula Student Team", "Photography Club", "Entrepreneurship Cell"],
    achievements: ["Formula Student India – Top 10 Team", "State Level Moot Court Participant"],
    essays: [
      { title: "Innovation I'm Proud Of", content: "Our Formula Student car went from 45th to 9th place in one year. I led the aerodynamics sub-team and we redesigned the diffuser from scratch using simulation data." },
    ],
    summary: "Hands-on engineer with demonstrable impact in a competitive team environment. Strong quantitative skills applied in a real project context.",
    strengths: ["Applied engineering mindset", "Team collaboration under pressure", "Data-driven decision making"],
    growthAreas: ["Could articulate socially-driven motivation more clearly", "Written essays could be more concise"],
    skills: ["SolidWorks", "CFD", "Team Management", "Prototyping", "Photography"],
  },
];

export const statusConfig = {
  pending: { label: "Pending Review", className: "bg-yellow-100 text-yellow-800" },
  reviewed: { label: "Reviewed", className: "bg-blue-100 text-blue-800" },
  interviewing: { label: "Interviewing", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800" },
};

export interface InterviewQuestion {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  skillEvaluated: string;
  rationale: string;
  sourceText?: string;
  confidence?: number;
  tags: string[];
}

export const mockInterviewQuestions: InterviewQuestion[] = [
  {
    id: "Q001",
    category: "academic",
    difficulty: "medium",
    question: "You scored 94.2% in Grade 12. Can you walk us through a topic you found genuinely challenging and how you worked through it?",
    skillEvaluated: "Self-awareness & Learning Agility",
    rationale: "High academic scores can sometimes mask rote learning. This question probes whether the candidate genuinely engages with difficult material.",
    sourceText: "Grade 12 percentage: 94.2 — CBSE Board",
    confidence: 88,
    tags: ["academics", "resilience"],
  },
  {
    id: "Q002",
    category: "leadership",
    difficulty: "hard",
    question: "As Robotics Club President, what was the hardest decision you had to make for the team, and what was the outcome?",
    skillEvaluated: "Decision-making & Accountability",
    rationale: "Leadership claims need to be substantiated with concrete examples. This probes decision quality and ownership of outcomes.",
    sourceText: "Activities: Robotics Club President",
    confidence: 92,
    tags: ["leadership", "teamwork"],
  },
  {
    id: "Q003",
    category: "motivation",
    difficulty: "easy",
    question: "Your essay mentions 'building technology that solves real problems in India.' Can you give us one specific problem you'd start with tomorrow?",
    skillEvaluated: "Motivation Clarity & Specificity",
    rationale: "Vague motivations are common in essays. Asking for immediate specificity reveals whether the candidate has done genuine reflection.",
    sourceText: "I believe Plaksha's interdisciplinary approach aligns perfectly with my ambition to build technology that solves real problems in India.",
    confidence: 95,
    tags: ["motivation", "vision"],
  },
  {
    id: "Q004",
    category: "problem_solving",
    difficulty: "hard",
    question: "Walk us through the technical design of your top robotics project — how did you identify the core constraint and what trade-offs did you make?",
    skillEvaluated: "Technical Depth & Systems Thinking",
    rationale: "The National Robotics 2nd place finish warrants deeper technical probing to verify depth of contribution versus team credit.",
    sourceText: "National Robotics Competition – 2nd Place",
    confidence: 85,
    tags: ["technical", "problem-solving"],
  },
  {
    id: "Q005",
    category: "ethics",
    difficulty: "medium",
    question: "If you were building an AI system that affected hiring decisions, what safeguards would you put in place and why?",
    skillEvaluated: "Ethical Reasoning",
    rationale: "Plaksha's curriculum emphasises responsible technology. This assesses whether the candidate has thought about the societal implications of their work.",
    confidence: 78,
    tags: ["ethics", "AI"],
  },
];

export interface ParsedField {
  field: string;
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export const mockParsedFields: ParsedField[] = [
  { field: "Full Name", value: "Arjun Mehta", confidence: "high", source: "Page 1, Header" },
  { field: "Email Address", value: "arjun.mehta@email.com", confidence: "high", source: "Page 1, Contact" },
  { field: "Phone Number", value: "+91 98765 43210", confidence: "medium", source: "Page 1, Contact" },
  { field: "Date of Birth", value: "15 August 2007", confidence: "high", source: "Page 1, Personal Details" },
  { field: "Grade 12 %", value: "94.2", confidence: "high", source: "Page 2, Academics" },
  { field: "Grade 10 %", value: "92.5", confidence: "high", source: "Page 2, Academics" },
];

export const mockCandidateProfile = {
  name: "Arjun Mehta",
  email: "arjun.mehta@email.com",
  phone: "+91 98765 43210",
  board: "CBSE",
  grade10: "92.5",
  grade12: "94.2",
  gpa: "3.9",
  essays: [
    { title: "Why Plaksha?", content: "I believe Plaksha's interdisciplinary approach aligns perfectly with my ambition to build technology that solves real problems in India." },
    { title: "Greatest Achievement", content: "Leading my robotics team to a national 2nd place finish required me to simultaneously manage technical decisions and team morale under pressure." },
  ],
  activities: ["Robotics Club President", "School Cricket Team Captain", "Math Olympiad Participant"],
  achievements: ["National Robotics Competition – 2nd Place", "School Merit Scholarship 2025"],
};

export interface InterviewHistory {
  id: string;
  version: string;
  dateGenerated: string;
  generatedBy: string;
  questionCount: number;
  status: "scheduled" | "completed" | "cancelled";
}

export const mockInterviewHistory: InterviewHistory[] = [
  { id: "I001", version: "v3 — Full Profile", dateGenerated: "2026-03-07", generatedBy: "Dr. Sarah Chen", questionCount: 12, status: "scheduled" },
  { id: "I002", version: "v2 — Post Essay Review", dateGenerated: "2026-03-04", generatedBy: "Prof. Gupta", questionCount: 10, status: "completed" },
  { id: "I003", version: "v1 — Initial Parse", dateGenerated: "2026-03-01", generatedBy: "Dr. Sarah Chen", questionCount: 8, status: "completed" },
];
