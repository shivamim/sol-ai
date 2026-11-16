// Fixed provider-safe categories. Private free text must never be added here.
const taxonomy = [
  "Python",
  "SQL",
  "JavaScript",
  "Pandas",
  "NumPy",
  "Excel",
  "Google Sheets",
  "Power BI",
  "Power Query",
  "ETL",
  "PySpark",
  "Machine Learning",
  "Deep Learning",
  "Generative AI",
  "Agentic AI",
  "RAG",
  "LangChain",
  "LlamaIndex",
  "APIs",
  "Automation",
  "PostgreSQL",
  "MongoDB",
  "Data visualization",
];
const roles = [
  "AI Engineer",
  "Data Scientist",
  "Data Analyst",
  "Business Intelligence Analyst",
  "Data Engineer",
  "Machine Learning Engineer",
  "Analytics Engineer",
  "Product Analyst",
  "Business Data Analyst",
  "Operations Analyst",
  "Data Visualization Developer",
  "Data Analytics Specialist",
];
export function publicContext(skills: string[], role: string) {
  return {
    skills: taxonomy.filter((t) =>
      skills.some((s) => s.toLowerCase() === t.toLowerCase()),
    ),
    role:
      roles.find((r) => r.toLowerCase() === role.toLowerCase()) ||
      "a suitable professional role",
  };
}
