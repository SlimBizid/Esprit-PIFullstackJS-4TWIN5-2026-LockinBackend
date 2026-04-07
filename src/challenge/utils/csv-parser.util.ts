const csv = require('csv-parser');
import { Readable } from 'stream';
import { CreateChallengeDto } from '../dto/create-challenge.dto';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';

export interface CsvRow {
  title: string;
  content: string;
  examples: string;
  constraints: string;
  conditions: string;
  cases: string;
  type: string;
  difficulty: string;
  topics: string;
  acceptanceRate?: string;
}

export async function parseCsvToChallenges(
  csvBuffer: Buffer,
): Promise<{ challenges: CreateChallengeDto[]; errors: string[] }> {
  const challenges: CreateChallengeDto[] = [];
  const errors: string[] = [];
  let rowIndex = 0;

  return new Promise((resolve, reject) => {
    const stream = Readable.from(csvBuffer);
    stream
      .pipe(csv())
      .on('data', (row: CsvRow) => {
        rowIndex++;
        try {
          const challenge = mapCsvRowToChallenge(row);
          challenges.push(challenge);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${rowIndex}: ${errorMessage}`);
        }
      })
      .on('end', () => {
        resolve({ challenges, errors });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

function mapCsvRowToChallenge(row: CsvRow): CreateChallengeDto {
  const challenge: CreateChallengeDto = {
    title: row.title?.trim(),
    content: row.content?.trim(),
    examples: parseJsonArray(row.examples),
    constraints: parseJsonArray(row.constraints),
    conditions: parseJsonArray(row.conditions),
    quizQuestions: parseCases(row.cases),
    cases: parseCases(row.cases),
    type: validateEnum(
      row.type?.trim(),
      ChallengeType,
      'type',
    ) as ChallengeType,
    difficulty: validateEnum(
      row.difficulty?.trim(),
      ChallengeDifficulty,
      'difficulty',
    ) as ChallengeDifficulty,
    topics: parseTopics(row.topics),
    acceptanceRate: row.acceptanceRate
      ? parseFloat(row.acceptanceRate)
      : undefined,
  };

  if (!challenge.title) throw new Error('Title is required');
  if (!challenge.content) throw new Error('Content is required');
  if (!challenge.type) throw new Error('Type is required');
  if (!challenge.difficulty) throw new Error('Difficulty is required');
  if (!challenge.topics || challenge.topics.length === 0)
    throw new Error('At least one topic is required');

  return challenge;
}

function parseJsonArray(jsonStr: string): string[] {
  if (!jsonStr?.trim()) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed;
    }
    throw new Error('Invalid array format');
  } catch {
    throw new Error('Invalid JSON for array field');
  }
}

function parseCases(jsonStr: string): any[] {
  if (!jsonStr?.trim()) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map((caseItem) => {
        if (
          typeof caseItem === 'object' &&
          caseItem.inputs &&
          caseItem.expectedOutput
        ) {
          return caseItem;
        }
        throw new Error('Invalid case format');
      });
    }
    throw new Error('Cases must be an array');
  } catch {
    throw new Error('Invalid JSON for cases');
  }
}

function parseTopics(jsonStr: string): ChallengeTopic[] {
  if (!jsonStr?.trim()) throw new Error('Topics are required');
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map(
        (topic) =>
          validateEnum(topic, ChallengeTopic, 'topic') as ChallengeTopic,
      );
    }
    throw new Error('Topics must be an array');
  } catch {
    throw new Error('Invalid JSON for topics');
  }
}

function validateEnum(value: string, enumType: any, fieldName: string): string {
  const enumValues = Object.values(enumType);
  if (enumValues.includes(value)) {
    return value;
  }
  throw new Error(
    `Invalid ${fieldName}: ${value}. Must be one of: ${enumValues.join(', ')}`,
  );
}
