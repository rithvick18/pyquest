export const LESSON_SCHEMA_V1 = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["theory", "quiz", "code"] },
          title: { type: "string" },
          content: { type: "string", description: "Markdown content for theory or the question for quiz/code" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                isCorrect: { type: "boolean" },
                explanation: { type: "string" }
              },
              required: ["id", "text", "isCorrect"]
            }
          },
          code: {
            type: "object",
            properties: {
              initialCode: { type: "string" },
              expectedOutput: { type: "string" },
              hint: { type: "string" },
              solution: { type: "string" }
            },
            required: ["initialCode", "expectedOutput", "hint", "solution"]
          }
        },
        required: ["id", "type", "title", "content"]
      }
    }
  },
  required: ["title", "summary", "steps"]
};

export function getLessonPromptV1(lesson: { title: string; module: string; difficulty: string }): string {
  return `
    Act as an expert Python tutor creating a Duolingo-style interactive lesson for: "${lesson.title}".
    Module: "${lesson.module}", Difficulty: "${lesson.difficulty}".
    
    Create a strictly structured lesson with 5 to 7 interactive steps.
    The steps should flow logically:
    1. Theory (Short, bite-sized explanation based on search results)
    2. Quiz (Multiple choice to check understanding)
    3. Theory or Code Example
    4. Code Challenge (User must run code to proceed)
    
    GUIDELINES:
    - Keep theory concise (max 3 sentences per card).
    - Quizzes must have 3-4 options, one correct.
    - Code Challenges must have 'initialCode' (runnable but incomplete or needing modification) and 'expectedOutput' (what the output contains if correct).
    - The final step should be a summary or a harder challenge.
    
    Return JSON format matching the schema exactly.
  `;
}
