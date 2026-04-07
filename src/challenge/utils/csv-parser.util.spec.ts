import { parseCsvToChallenges } from './csv-parser.util';
import { ChallengeType } from '../enums/challenge-type.enums';
import { ChallengeDifficulty } from '../enums/challenge-difficulty.enums';
import { ChallengeTopic } from '../enums/challenge-topic.enums';

describe('CsvParserUtil', () => {
  describe('parseCsvToChallenges', () => {
    it('should parse valid CSV data correctly', async () => {
      const csvData = `title,content,examples,constraints,conditions,cases,type,difficulty,topics,acceptanceRate
Test Challenge,Test content,"[""example1"",""example2""]","[""constraint1""]","[""condition1""]","[{""inputs"":[{""type"":""string"",""value"":""input1""}],""expectedOutput"":""output1""}]",solo,easy,"[""Array""]",95.5`;

      const buffer = Buffer.from(csvData);

      const result = await parseCsvToChallenges(buffer);

      expect(result.challenges).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      const challenge = result.challenges[0];
      expect(challenge.title).toBe('Test Challenge');
      expect(challenge.content).toBe('Test content');
      expect(challenge.examples).toEqual(['example1', 'example2']);
      expect(challenge.type).toBe(ChallengeType.SOLO);
      expect(challenge.difficulty).toBe(ChallengeDifficulty.EASY);
      expect(challenge.topics).toEqual([ChallengeTopic.ARRAY]);
      expect(challenge.acceptanceRate).toBe(95.5);
    });

    it('should handle invalid JSON in arrays', async () => {
      const csvData = `title,content,examples,constraints,conditions,cases,type,difficulty,topics
Test Challenge,Content,invalid json,"[""constraint""]","[""condition""]","[]",solo,easy,"[""Array""]"`;

      const buffer = Buffer.from(csvData);

      const result = await parseCsvToChallenges(buffer);

      expect(result.challenges).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid JSON for array field');
    });

    it('should handle invalid enum values', async () => {
      const csvData = `title,content,examples,constraints,conditions,cases,type,difficulty,topics
Test Challenge,Content,"[]","[]","[]","[]",invalid,easy,"[""Array""]"`;

      const buffer = Buffer.from(csvData);

      const result = await parseCsvToChallenges(buffer);

      expect(result.challenges).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid type: invalid');
    });

    it('should handle missing required fields', async () => {
      const csvData = `title,content,examples,constraints,conditions,cases,type,difficulty,topics
,Content,"[]","[]","[]","[]",solo,easy,"[""Array""]"`;

      const buffer = Buffer.from(csvData);

      const result = await parseCsvToChallenges(buffer);

      expect(result.challenges).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Title is required');
    });

    it('should handle multiple rows with mixed validity', async () => {
      const csvData = `title,content,examples,constraints,conditions,cases,type,difficulty,topics
Valid Challenge,Content,"[]","[]","[]","[]",solo,easy,"[""Array""]"
Invalid Challenge,Content,"[]","[]","[]","[]",invalid,easy,"[""Array""]"
Another Valid,Content,"[]","[]","[]","[]",pvp,medium,"[""String""]"`;

      const buffer = Buffer.from(csvData);

      const result = await parseCsvToChallenges(buffer);

      expect(result.challenges).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Row 2');
    });
  });
});
