const questions = [
  // Basic policy questions
  "What are the standard work hours?",
  "What is the probation period duration?",
  "Explain progressive discipline process",
  "What are SOC2 principles?",
  "What is remote work policy?",
  "What is monitoring policy?",
  "What is PTO allotment?",
  "What is BYOD policy?",
  "What is acceptable use policy?",
  "What is confidentiality policy?",

  // Retrieval edge cases (wording mismatch)
  "How does probation confirmation work?",
  "What happens if a performance improvement plan fails?",
  "Are employees allowed to install their own software?",
  "What rules apply to moonlighting or second jobs?",

  // Table extraction edge cases
  "What is the maximum PTO carryover for employees with more than 10 years?",
  "How many hours accrue per pay period for 0-3 years tenure?",
  "Which department oversees data security governance?",
  "What controls are listed under the SOC2 Security principle?",

  // Long context edge cases
  "What steps occur before termination in disciplinary escalation?",
  "What are the expectations for remote workspace setup?",
  "What responsibilities do employees have regarding attendance?",
  "What is role based access control policy?",

  // Validator stress tests
  "How many weeks of unpaid leave are allowed under FMLA?",
  "What documentation is required for sick leave longer than three days?",
  "What happens after the probation period ends?",

  // Negative / hallucination tests (should return I don't know)
  "Does the company provide stock options?",
  "What is the CEO salary?",
  "What is the office parking policy?",
  "What is the annual bonus structure?"
];

async function runTests() {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    console.log("\n===== QUESTION", i + 1, "=====");
    console.log(q);

    try {
      const res = await fetch("http://127.0.0.1:7000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: q })
      });

      const data = await res.json();
      console.log("ANSWER:", data.answer);
      console.log("SOURCES:", data.sources);
    } catch (err) {
      console.error("Error:", err.message);
    }
  }
}

runTests();