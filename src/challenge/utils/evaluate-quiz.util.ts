import { MatchVerdict } from 'src/match/enums/match-verdict.enum';

type QuizQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
  explanation?: string;
};

type QuizAnswers = Record<string, string[]>;

function normalizeOptionIds(optionIds: string[] | undefined) {
  return [...new Set((optionIds ?? []).filter(Boolean))].sort();
}

function areSameSelections(selected: string[], expected: string[]) {
  if (selected.length !== expected.length) {
    return false;
  }

  return selected.every((value, index) => value === expected[index]);
}

export function evaluateQuizAnswers(
  questions: QuizQuestion[],
  answers: QuizAnswers,
) {
  const results = questions.map((question) => {
    const selectedIds = normalizeOptionIds(answers[question.id]);
    const expectedIds = normalizeOptionIds(question.correctOptionIds);
    const selectedLabels = question.options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => option.text);
    const expectedLabels = question.options
      .filter((option) => expectedIds.includes(option.id))
      .map((option) => option.text);
    const passed = areSameSelections(selectedIds, expectedIds);

    return {
      passed,
      actual:
        selectedLabels.length > 0 ? selectedLabels.join(', ') : 'No answer',
      expected: expectedLabels.join(', '),
      runtime: '0',
      memoryKb: null,
      status: passed
        ? 'Correct'
        : question.explanation?.trim() || 'Incorrect selection',
    };
  });

  const passedCount = results.filter((result) => result.passed).length;
  const totalCount = results.length;

  return {
    results,
    passedCount,
    totalCount,
    verdict:
      totalCount > 0 && passedCount === totalCount
        ? MatchVerdict.ACCEPTED
        : MatchVerdict.WRONG_ANSWER,
  };
}
