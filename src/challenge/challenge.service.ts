import {
  ConflictException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, IsNull, Not, Repository } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { UserType } from 'src/user/enums/user-type.enum';
import { ChallengeQueryDto } from './dto/get-challenges-query.dto';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { GenerateChallengeDraftDto } from './dto/generate-challenge-draft.dto';
import { UpdateChallengeDto } from './dto/update-challenge.dto';
import { ChallengeType } from './enums/challenge-type.enums';
import { ChallengeDifficulty } from './enums/challenge-difficulty.enums';
import { ChallengeTopic } from './enums/challenge-topic.enums';
import { GeneratedChallengeDraftDto } from './dto/generated-challenge-draft.dto';

@Injectable()
export class ChallengeService {
  private static readonly SUPPORTED_TOPICS = Object.values(ChallengeTopic);
  private static readonly EMPTY_STARTER_CODES: Record<string, string> = {
    javascript: '',
    typescript: '',
    python: '',
    java: '',
    cpp: '',
  };

  constructor(
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
  ) {}

  async findAll(queryDto: ChallengeQueryDto, role: UserType) {
    const {
      page = 1,
      limit = 10,
      difficulty,
      type,
      search,
      deleted,
    } = queryDto;

    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Challenge> = {};

    if (difficulty) where.difficulty = difficulty;
    if (type) where.type = type;

    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      where.title = ILike(`%${normalizedSearch}%`);
    }

    const isAdminQueryingDeleted = deleted === true && role === UserType.ADMIN;

    if (isAdminQueryingDeleted) {
      where.deletedAt = Not(IsNull());
    }

    const [items, total] = await this.challengeRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      withDeleted: isAdminQueryingDeleted,
    });

    return {
      data: items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async findOne(
    id: number,
    role: UserType = UserType.PLAYER,
  ): Promise<Challenge> {
    const challenge = await this.challengeRepository.findOne({
      where: { id },
      withDeleted: role === UserType.ADMIN,
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID #${id} not found.`);
    }

    return challenge;
  }

  async findDailyChallenge(role: UserType = UserType.PLAYER) {
    const availableChallenges = await this.challengeRepository.find({
      select: {
        id: true,
      },
      where: {
        type: ChallengeType.SOLO,
      },
      order: {
        id: 'ASC',
      },
    });

    if (availableChallenges.length === 0) {
      throw new NotFoundException(
        'No solo challenges are available for today.',
      );
    }

    const now = new Date();
    const dayNumber = Math.floor(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) /
        86_400_000,
    );
    const challengeId =
      availableChallenges[dayNumber % availableChallenges.length]?.id;

    if (!challengeId) {
      throw new NotFoundException('No daily challenge could be selected.');
    }

    return {
      date: now.toISOString().slice(0, 10),
      challenge: await this.findOne(challengeId, role),
    };
  }

  async findByTitle(title: string): Promise<Challenge | null> {
    return await this.challengeRepository.findOne({
      where: { title },
      withDeleted: true,
    });
  }

  async create(createDto: CreateChallengeDto): Promise<Challenge> {
    const existingChallenge = await this.findByTitle(createDto.title);
    if (existingChallenge) {
      throw new ConflictException(
        `A challenge with the title "${createDto.title}" already exists. Please choose a unique name.`,
      );
    }

    const newChallenge = this.challengeRepository.create({
      ...createDto,
      acceptanceRate: createDto.acceptanceRate ?? 100,
    });

    try {
      return await this.challengeRepository.save(newChallenge);
    } catch {
      throw new InternalServerErrorException(
        `An unexpected error occurred while saving the challenge. `,
      );
    }
  }

  async bulkCreate(
    createDtos: CreateChallengeDto[],
  ): Promise<{ successCount: number; failureCount: number; errors: string[] }> {
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < createDtos.length; i++) {
      const dto = createDtos[i];
      try {
        const existing = await this.findByTitle(dto.title);
        if (existing) {
          throw new ConflictException(`Title "${dto.title}" is already taken.`);
        }

        const newChallenge = this.challengeRepository.create({
          title: dto.title,
          content: dto.content,
          examples: dto.examples,
          constraints: dto.constraints,
          conditions: dto.conditions,
          cases: dto.cases,
          type: dto.type,
          difficulty: dto.difficulty,
          topics: dto.topics,
          acceptanceRate: dto.acceptanceRate ?? 100,
        });

        await this.challengeRepository.save(newChallenge);
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    return { successCount, failureCount, errors };
  }

  async generateDraft(
    dto: GenerateChallengeDraftDto,
  ): Promise<GeneratedChallengeDraftDto> {
    const apiKey =
      process.env.GOOGLE_AI_STUDIO_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GEMENI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Google AI Studio API key is not configured on the backend.',
      );
    }

    const model =
      process.env.GOOGLE_AI_STUDIO_MODEL || 'gemini-3-flash-preview';
    const isQuizType =
      dto.type === ChallengeType.QUIZ || dto.type === ChallengeType.QUIZ_PVP;
    const payload = {
      system_instruction: {
        parts: [
          {
            text: [
              'You generate challenge drafts for a competitive programming platform.',
              'Return valid JSON only. Do not wrap the JSON in markdown.',
              `Use one of these exact topics only: ${ChallengeService.SUPPORTED_TOPICS.join(', ')}.`,
              'Acceptance rate must be a number between 0 and 100.',
              'Examples, constraints, and conditions must each be arrays of short strings.',
              isQuizType
                ? 'For quiz types, produce quizQuestions and leave starterCode, starterCodes, and cases empty.'
                : 'For code challenge types, produce starterCode, starterCodes for javascript/typescript/python/java/cpp, and 3-5 test cases.',
            ].join(' '),
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: this.buildDraftPrompt(dto.title, dto.type),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Google AI Studio request failed: ${errorText || response.statusText}`,
      );
    }

    const data = await response.json();
    const rawText = this.extractGeminiText(data);
    const parsedDraft = this.parseGeneratedDraft(rawText);

    return this.normalizeGeneratedDraft(parsedDraft, dto);
  }

  async update(id: number, updateDto: UpdateChallengeDto): Promise<Challenge> {
    const challenge = await this.findOne(id, UserType.ADMIN);

    if (updateDto.title && updateDto.title !== challenge.title) {
      const existing = await this.findByTitle(updateDto.title);
      if (existing) {
        throw new ConflictException(
          `Title "${updateDto.title}" is already taken.`,
        );
      }
    }

    const updatedChallenge = await this.challengeRepository.preload({
      id: id,
      ...updateDto,
    });

    if (!updatedChallenge) {
      throw new NotFoundException(`Challenge #${id} could not be preloaded.`);
    }

    return await this.challengeRepository.save(updatedChallenge);
  }

  async softDelete(id: number): Promise<void> {
    await this.findOne(id, UserType.ADMIN);
    await this.challengeRepository.softDelete(id);
  }

  async restore(id: number): Promise<void> {
    const result = await this.challengeRepository.restore(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Challenge #${id} not found or is not currently deleted.`,
      );
    }
  }

  private buildDraftPrompt(title: string, type: ChallengeType) {
    const isQuizType =
      type === ChallengeType.QUIZ || type === ChallengeType.QUIZ_PVP;
    const isPvpType =
      type === ChallengeType.PVP || type === ChallengeType.QUIZ_PVP;
    const isThatsNotMyCoderType = type === ChallengeType.THATS_NOT_MY_CODER;
    const isCssBattleType = type === ChallengeType.CSS_BATTLE;

    return [
      `Generate a draft challenge for the title "${title}".`,
      `The challenge type must stay exactly "${type}".`,
      isPvpType
        ? 'Make the wording suitable for head-to-head competition.'
        : 'Make the wording suitable for a standard challenge.',
      isQuizType
        ? [
            'The JSON response must include:',
            'title, content, difficulty, type, topics, acceptanceRate, examples, constraints, conditions, quizQuestions.',
            'quizQuestions must be an array of 3 to 5 multiple-answer questions.',
            'Each question must include id, prompt, options, correctOptionIds, explanation.',
            'Set starterCode to an empty string, starterCodes to an empty object, and cases to an empty array.',
          ].join(' ')
        : isThatsNotMyCoderType
          ? [
              'The JSON response must include:',
              'title, content, difficulty, type, topics, acceptanceRate, examples, constraints, conditions, starterCode, starterCodes, cases.',
              'Set starterCode to an empty string and starterCodes to an empty object.',
              'cases must be an array of 4 to 7 review cases.',
              'Each case must include inputs and expectedOutput.',
              'Each input must have type and value as strings.',
              'Every case must contain inputs with types "title", "author", "language", "note", "rationale", "timeLimit", and "code".',
              'expectedOutput must be exactly "accept" or "deny".',
              'Set examples, constraints, and conditions to empty arrays.',
              'Set quizQuestions to an empty array.',
            ].join(' ')
          : isCssBattleType
            ? [
                'The JSON response must include:',
                'title, content, difficulty, type, topics, acceptanceRate, examples, constraints, conditions, starterCode, starterCodes, cases.',
                'Set starterCode to an empty string and starterCodes to an empty object.',
                'cases must be an array with exactly 1 visual battle case.',
                'Each case must include inputs and expectedOutput.',
                'Each input must have type and value as strings.',
                'Every case must contain inputs with type "targetHtml" and "targetCss".',
                'Optional input types include note, starterHtml, starterCss, viewportWidth, viewportHeight, and colors.',
                'If colors is provided, it must be a JSON array encoded as a string, for example "[\"#0b0f1a\",\"#ff6b00\",\"#101215\"]".',
                'expectedOutput should be a numeric minimum score (0-100) as a string, like "100".',
                'Set examples, constraints, and conditions to empty arrays.',
                'Set quizQuestions to an empty array.',
              ].join(' ')
            : [
                'The JSON response must include:',
                'title, content, difficulty, type, topics, acceptanceRate, examples, constraints, conditions, starterCode, starterCodes, cases.',
                'starterCodes must include javascript, typescript, python, java, and cpp.',
                'Use these exact execution contracts:',
                'javascript: function solution(...args) { /* ... */ }',
                'typescript: function solution(...args: unknown[]): unknown { /* ... */ }',
                'python: def solution(*args):',
                'java: class Solution { public Object solution(Object... args) { /* ... */ } }',
                'cpp: class Solution { public: JsonValue solution(const std::vector<JsonValue>& args) { /* ... */ } };',
                'Do not use names like subtract, addTwoNumbers, solve, or main. The callable entry point must be named solution.',
                'cases must be an array of 3 to 5 test cases.',
                'Each test case must include inputs and expectedOutput.',
                'Each input must have type and value as strings.',
                'Set quizQuestions to an empty array.',
              ].join(' '),
    ].join(' ');
  }

  private extractGeminiText(data: any) {
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new InternalServerErrorException(
        'Google AI Studio returned an empty challenge draft.',
      );
    }

    return text;
  }

  private parseGeneratedDraft(rawText: string) {
    const normalized = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      return JSON.parse(normalized);
    } catch {
      throw new InternalServerErrorException(
        'Google AI Studio returned invalid JSON for the challenge draft.',
      );
    }
  }

  private normalizeGeneratedDraft(
    draft: any,
    request: GenerateChallengeDraftDto,
  ): GeneratedChallengeDraftDto {
    const isQuizType =
      request.type === ChallengeType.QUIZ ||
      request.type === ChallengeType.QUIZ_PVP;
    const isCustomVisualType =
      request.type === ChallengeType.THATS_NOT_MY_CODER ||
      request.type === ChallengeType.CSS_BATTLE;
    const starterCodes: Record<string, string> =
      isQuizType || isCustomVisualType
        ? ChallengeService.EMPTY_STARTER_CODES
        : {
            javascript: this.normalizeStarterCode(
              'javascript',
              String(
                draft?.starterCodes?.javascript ?? draft?.starterCode ?? '',
              ),
            ),
            typescript: this.normalizeStarterCode(
              'typescript',
              String(draft?.starterCodes?.typescript ?? ''),
            ),
            python: this.normalizeStarterCode(
              'python',
              String(draft?.starterCodes?.python ?? ''),
            ),
            java: this.normalizeStarterCode(
              'java',
              String(draft?.starterCodes?.java ?? ''),
            ),
            cpp: this.normalizeStarterCode(
              'cpp',
              String(draft?.starterCodes?.cpp ?? ''),
            ),
          };
    const topics = Array.isArray(draft?.topics)
      ? draft.topics.filter((topic: string) =>
          ChallengeService.SUPPORTED_TOPICS.includes(topic as ChallengeTopic),
        )
      : [];

    return {
      title: request.title.trim(),
      content: String(draft?.content ?? '').trim(),
      starterCode:
        isQuizType || isCustomVisualType ? '' : (starterCodes.javascript ?? ''),
      starterCodes,
      examples: this.normalizeStringArray(draft?.examples),
      constraints: this.normalizeStringArray(draft?.constraints),
      conditions: this.normalizeStringArray(draft?.conditions),
      cases: isQuizType ? [] : this.normalizeCases(draft?.cases),
      quizQuestions: isQuizType
        ? this.normalizeQuizQuestions(draft?.quizQuestions)
        : [],
      difficulty: this.normalizeDifficulty(draft?.difficulty),
      type: request.type,
      topics: topics.length > 0 ? topics : [ChallengeTopic.MATH],
      acceptanceRate: this.normalizeAcceptanceRate(draft?.acceptanceRate),
    };
  }

  private normalizeStringArray(value: unknown) {
    return Array.isArray(value)
      ? value
          .map((item) => String(item ?? '').trim())
          .filter((item) => item.length > 0)
      : [];
  }

  private normalizeDifficulty(value: unknown) {
    return Object.values(ChallengeDifficulty).includes(
      value as ChallengeDifficulty,
    )
      ? (value as ChallengeDifficulty)
      : ChallengeDifficulty.MEDIUM;
  }

  private normalizeAcceptanceRate(value: unknown) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return 60;
    }

    return Math.max(0, Math.min(100, numericValue));
  }

  private normalizeCases(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((testCase) => {
        const inputs = Array.isArray(testCase?.inputs)
          ? testCase.inputs
              .map((input: any) => ({
                type: String(input?.type ?? '').trim(),
                value: String(input?.value ?? ''),
              }))
              .filter((input) => input.type.length > 0)
          : [];

        const expectedOutput = String(testCase?.expectedOutput ?? '');

        if (inputs.length === 0 || expectedOutput.length === 0) {
          return null;
        }

        return {
          inputs,
          expectedOutput,
        };
      })
      .filter(
        (
          testCase,
        ): testCase is {
          inputs: Array<{ type: string; value: string }>;
          expectedOutput: string;
        } => !!testCase,
      );
  }

  private normalizeQuizQuestions(value: unknown) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((question: any, index: number) => {
        const options = Array.isArray(question?.options)
          ? question.options
              .map((option: any, optionIndex: number) => ({
                id: String(
                  option?.id ?? `option_${index + 1}_${optionIndex + 1}`,
                ).trim(),
                text: String(option?.text ?? '').trim(),
              }))
              .filter((option) => option.text.length > 0)
          : [];
        const optionIds = new Set(options.map((option) => option.id));
        const correctOptionIds = Array.isArray(question?.correctOptionIds)
          ? question.correctOptionIds
              .map((optionId: unknown) => String(optionId ?? '').trim())
              .filter((optionId: string) => optionIds.has(optionId))
          : [];

        if (options.length < 2 || correctOptionIds.length === 0) {
          return null;
        }

        return {
          id: String(question?.id ?? `question_${index + 1}`).trim(),
          prompt: String(question?.prompt ?? '').trim(),
          options,
          correctOptionIds,
          explanation:
            typeof question?.explanation === 'string' &&
            question.explanation.trim().length > 0
              ? question.explanation.trim()
              : undefined,
        };
      })
      .filter(
        (question): question is NonNullable<typeof question> =>
          !!question && question.prompt.length > 0,
      );
  }

  private normalizeStarterCode(language: string, value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return this.getFallbackStarterCode(language);
    }

    switch (language) {
      case 'javascript': {
        const normalized = trimmed
          .replace(
            /\b(?:const|let|var)\s+\w+\s*=\s*function\s*\(/,
            'function solution(',
          )
          .replace(/\bfunction\s+(?!solution\b)\w+\s*\(/, 'function solution(')
          .replace(
            /\b(?:const|let|var)\s+\w+\s*=\s*\((.*?)\)\s*=>/s,
            'function solution($1)',
          );
        const signatureMatch = normalized.match(
          /function\s+solution\s*\(([^)]*)\)/s,
        );

        if (!signatureMatch) {
          return this.getFallbackStarterCode(language);
        }

        const params = signatureMatch[1]?.trim() ?? '...args';
        return [
          `function solution(${params || '...args'}) {`,
          '  // Implement your answer here.',
          '  return null',
          '}',
        ].join('\n');
      }
      case 'typescript': {
        const normalized = trimmed
          .replace(
            /\b(?:const|let|var)\s+\w+\s*=\s*function\s*\(/,
            'function solution(',
          )
          .replace(/\bfunction\s+(?!solution\b)\w+\s*\(/, 'function solution(')
          .replace(
            /\b(?:const|let|var)\s+\w+\s*=\s*\((.*?)\)\s*:\s*([^{=]+)=>/s,
            'function solution($1): $2',
          );
        const signatureMatch = normalized.match(
          /function\s+solution\s*\(([^)]*)\)\s*(?::\s*([^{\n]+))?/s,
        );

        if (!signatureMatch) {
          return this.getFallbackStarterCode(language);
        }

        const params = signatureMatch[1]?.trim() ?? '...args: unknown[]';
        const returnType = signatureMatch[2]?.trim();

        return [
          `function solution(${params || '...args: unknown[]'})${
            returnType ? `: ${returnType}` : ': unknown'
          } {`,
          '  // Implement your answer here.',
          '  return null',
          '}',
        ].join('\n');
      }
      case 'python': {
        const normalized = trimmed.replace(
          /\bdef\s+(?!solution\b)\w+\s*\(/,
          'def solution(',
        );
        const signatureMatch = normalized.match(
          /def\s+solution\s*\(([^)]*)\)\s*:/,
        );

        if (!signatureMatch) {
          return this.getFallbackStarterCode(language);
        }

        const params = signatureMatch[1]?.trim() ?? '*args';

        return [
          `def solution(${params || '*args'}):`,
          '    # Implement your answer here.',
          '    return None',
        ].join('\n');
      }
      case 'java': {
        return this.getFallbackStarterCode(language);
      }
      case 'cpp': {
        return this.getFallbackStarterCode(language);
      }
      default:
        return this.getFallbackStarterCode(language);
    }
  }

  private getFallbackStarterCode(language: string) {
    switch (language) {
      case 'typescript':
        return [
          'function solution(...args: unknown[]): unknown {',
          '  // Implement your answer here.',
          '  return args',
          '}',
        ].join('\n');
      case 'python':
        return [
          'def solution(*args):',
          '    # Implement your answer here.',
          '    return args',
        ].join('\n');
      case 'java':
        return [
          'class Solution {',
          '    public Object solution(Object... args) {',
          '        // Implement your answer here.',
          '        return args;',
          '    }',
          '}',
        ].join('\n');
      case 'cpp':
        return [
          'class Solution {',
          'public:',
          '    JsonValue solution(const std::vector<JsonValue>& args) {',
          '        // Implement your answer here.',
          '        return args.empty() ? JsonValue(nullptr) : args[0];',
          '    }',
          '};',
        ].join('\n');
      case 'javascript':
      default:
        return [
          'function solution(...args) {',
          '  // Implement your answer here.',
          '  return args',
          '}',
        ].join('\n');
    }
  }
}
