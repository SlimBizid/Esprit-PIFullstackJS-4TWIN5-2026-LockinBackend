import { PlagiarismFlagStatus } from '../enums/plagiarism-flag-status.enum';

export class UpdatePlagiarismFlagDto {
  status: PlagiarismFlagStatus;
  adminNotes?: string;
}
