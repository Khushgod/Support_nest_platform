// Assessment domain types (shared by API + UI).

export type QuestionType = 'text' | 'multiple-choice' | 'coding';

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // multiple-choice
  correct?: number; // multiple-choice: index of correct option
  rubric?: string; // text/coding: scoring guidance
}

export interface AssessmentDefinition {
  title: string;
  description: string;
  questions: AssessmentQuestion[];
}

export type ResultStatus = 'assigned' | 'submitted' | 'graded';

export interface AssessmentSummary {
  id: string;
  title: string;
  description: string;
  roleTitle: string;
  questionCount: number;
  createdAt: string;
}
