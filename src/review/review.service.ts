import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChallengeService } from 'src/challenge/challenge.service';
import { ImposterSubmission } from 'src/imposter/entities/imposter-submission.entity';
import { MatchSubmission } from 'src/match/entities/match-submission.entity';
import { ChallengeSubmission } from 'src/submission/entities/challenge-submission.entity';
import { User } from 'src/user/entities/user.entity';
import { UserType } from 'src/user/enums/user-type.enum';
import { Repository } from 'typeorm';

import { CreateChallengeReviewDto } from './dto/create-challenge-review.dto';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { CreateReviewReportDto } from './dto/create-review-report.dto';
import { ChallengeReviewCommentReport } from './entities/challenge-review-comment-report.entity';
import { ChallengeReviewComment } from './entities/challenge-review-comment.entity';
import { ChallengeReviewReport } from './entities/challenge-review-report.entity';
import { ChallengeReviewUpvote } from './entities/challenge-review-upvote.entity';
import { ChallengeReview } from './entities/challenge-review.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(ChallengeReview)
    private readonly reviewRepository: Repository<ChallengeReview>,
    @InjectRepository(ChallengeReviewComment)
    private readonly commentRepository: Repository<ChallengeReviewComment>,
    @InjectRepository(ChallengeReviewUpvote)
    private readonly upvoteRepository: Repository<ChallengeReviewUpvote>,
    @InjectRepository(ChallengeReviewReport)
    private readonly reviewReportRepository: Repository<ChallengeReviewReport>,
    @InjectRepository(ChallengeReviewCommentReport)
    private readonly commentReportRepository: Repository<ChallengeReviewCommentReport>,
    @InjectRepository(ChallengeSubmission)
    private readonly challengeSubmissionRepository: Repository<ChallengeSubmission>,
    @InjectRepository(MatchSubmission)
    private readonly matchSubmissionRepository: Repository<MatchSubmission>,
    @InjectRepository(ImposterSubmission)
    private readonly imposterSubmissionRepository: Repository<ImposterSubmission>,
    private readonly challengeService: ChallengeService,
  ) {}

  async listChallengeReviews(challengeId: number, user: User) {
    await this.challengeService.findOne(challengeId, user.type);

    const hasSubmitted = await this.hasUserSubmittedChallenge(
      challengeId,
      user.id,
    );
    const reviews = await this.reviewRepository.find({
      where: { challengeId },
      relations: {
        user: true,
      },
      withDeleted: true,
      order: {
        createdAt: 'DESC',
      },
    });

    const reviewIds = reviews.map((review) => review.id);
    const [comments, upvotes, reviewReports, commentReports] = reviewIds.length
      ? await Promise.all([
          this.commentRepository.find({
            where: reviewIds.map((reviewId) => ({ reviewId })),
            relations: { user: true },
            withDeleted: true,
            order: { createdAt: 'ASC' },
          }),
          this.upvoteRepository.find({
            where: reviewIds.map((reviewId) => ({ reviewId })),
          }),
          this.reviewReportRepository.find({
            where: reviewIds.map((reviewId) => ({ reviewId })),
          }),
          this.commentReportRepository
            .createQueryBuilder('report')
            .innerJoinAndSelect('report.comment', 'comment')
            .where('comment.reviewId IN (:...reviewIds)', { reviewIds })
            .getMany(),
        ])
      : [[], [], [], []];

    const commentsByReviewId = new Map<string, ChallengeReviewComment[]>();
    comments.forEach((comment) => {
      const current = commentsByReviewId.get(comment.reviewId) ?? [];
      current.push(comment);
      commentsByReviewId.set(comment.reviewId, current);
    });

    const upvotesByReviewId = new Map<string, ChallengeReviewUpvote[]>();
    upvotes.forEach((upvote) => {
      const current = upvotesByReviewId.get(upvote.reviewId) ?? [];
      current.push(upvote);
      upvotesByReviewId.set(upvote.reviewId, current);
    });

    const reviewReportsByReviewId = new Map<string, ChallengeReviewReport[]>();
    reviewReports.forEach((report) => {
      const current = reviewReportsByReviewId.get(report.reviewId) ?? [];
      current.push(report);
      reviewReportsByReviewId.set(report.reviewId, current);
    });

    const commentReportsByCommentId = new Map<
      string,
      ChallengeReviewCommentReport[]
    >();
    commentReports.forEach((report) => {
      const current = commentReportsByCommentId.get(report.commentId) ?? [];
      current.push(report);
      commentReportsByCommentId.set(report.commentId, current);
    });

    const userReview = reviews.find((review) => review.userId === user.id);

    return {
      challengeId,
      hasSubmitted,
      canCreateReview: hasSubmitted && !userReview,
      userReviewId: userReview?.id ?? null,
      data: reviews.map((review) =>
        this.serializeReview(
          review,
          user,
          commentsByReviewId.get(review.id) ?? [],
          upvotesByReviewId.get(review.id) ?? [],
          reviewReportsByReviewId.get(review.id) ?? [],
          commentReportsByCommentId,
        ),
      ),
    };
  }

  async createChallengeReview(
    challengeId: number,
    dto: CreateChallengeReviewDto,
    user: User,
  ) {
    await this.challengeService.findOne(challengeId, user.type);

    const hasSubmitted = await this.hasUserSubmittedChallenge(
      challengeId,
      user.id,
    );

    if (!hasSubmitted) {
      throw new ForbiddenException(
        'Only users who submitted a solution can leave a review.',
      );
    }

    const existingReview = await this.reviewRepository.exist({
      where: {
        challengeId,
        userId: user.id,
      },
      withDeleted: true,
    });

    if (existingReview) {
      throw new ConflictException(
        'You already submitted a review for this challenge.',
      );
    }

    const review = this.reviewRepository.create({
      challengeId,
      userId: user.id,
      title: dto.title.trim(),
      content: dto.content.trim(),
    });

    const savedReview = await this.reviewRepository.save(review);
    const populatedReview = await this.reviewRepository.findOne({
      where: { id: savedReview.id },
      relations: {
        user: true,
      },
    });

    if (!populatedReview) {
      throw new NotFoundException('Review could not be loaded after save.');
    }

    return this.serializeReview(
      populatedReview,
      user,
      [],
      [],
      [],
      new Map<string, ChallengeReviewCommentReport[]>(),
    );
  }

  async addComment(reviewId: string, dto: CreateReviewCommentDto, user: User) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.deletedAt) {
      throw new BadRequestException('You cannot comment on a deleted review.');
    }

    const comment = this.commentRepository.create({
      reviewId: review.id,
      userId: user.id,
      content: dto.content.trim(),
    });

    const savedComment = await this.commentRepository.save(comment);
    const populatedComment = await this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: {
        user: true,
      },
      withDeleted: true,
    });

    if (!populatedComment) {
      throw new NotFoundException('Comment could not be loaded after save.');
    }

    return this.serializeComment(populatedComment, user, []);
  }

  async reportComment(
    commentId: string,
    dto: CreateReviewReportDto,
    user: User,
  ) {
    const comment = await this.getCommentOrThrow(commentId);

    if (comment.userId === user.id) {
      throw new BadRequestException('You cannot report your own comment.');
    }

    if (comment.deletedAt) {
      throw new BadRequestException('This comment has already been deleted.');
    }

    const existingReport = await this.commentReportRepository.findOne({
      where: {
        commentId,
        reporterId: user.id,
      },
    });

    if (existingReport) {
      throw new ConflictException('You already reported this comment.');
    }

    const report = this.commentReportRepository.create({
      commentId,
      reporterId: user.id,
      reason: dto.reason.trim(),
      details: dto.details?.trim() || null,
    });

    await this.commentReportRepository.save(report);

    return { reported: true };
  }

  async upvoteReview(reviewId: string, user: User) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.deletedAt) {
      throw new BadRequestException('You cannot upvote a deleted review.');
    }

    if (review.userId === user.id) {
      throw new BadRequestException('You cannot upvote your own review.');
    }

    const existingUpvote = await this.upvoteRepository.findOne({
      where: {
        reviewId,
        userId: user.id,
      },
    });

    if (existingUpvote) {
      return { upvoted: true };
    }

    await this.upvoteRepository.save(
      this.upvoteRepository.create({
        reviewId,
        userId: user.id,
      }),
    );

    return { upvoted: true };
  }

  async removeUpvote(reviewId: string, user: User) {
    const existingUpvote = await this.upvoteRepository.findOne({
      where: {
        reviewId,
        userId: user.id,
      },
    });

    if (!existingUpvote) {
      return { upvoted: false };
    }

    await this.upvoteRepository.remove(existingUpvote);

    return { upvoted: false };
  }

  async reportReview(reviewId: string, dto: CreateReviewReportDto, user: User) {
    const review = await this.getReviewOrThrow(reviewId);

    if (review.userId === user.id) {
      throw new BadRequestException('You cannot report your own review.');
    }

    if (review.deletedAt) {
      throw new BadRequestException('This review has already been deleted.');
    }

    const existingReport = await this.reviewReportRepository.findOne({
      where: {
        reviewId,
        reporterId: user.id,
      },
    });

    if (existingReport) {
      throw new ConflictException('You already reported this review.');
    }

    const report = this.reviewReportRepository.create({
      reviewId,
      reporterId: user.id,
      reason: dto.reason.trim(),
      details: dto.details?.trim() || null,
    });

    await this.reviewReportRepository.save(report);

    return { reported: true };
  }

  async deleteReview(reviewId: string, user: User) {
    this.assertAdmin(user);

    const review = await this.getReviewOrThrow(reviewId);

    if (review.deletedAt) {
      return { deleted: true };
    }

    review.deletedByAdminId = user.id;
    await this.reviewRepository.save(review);
    await this.reviewRepository.softRemove(review);

    return { deleted: true };
  }

  async deleteComment(commentId: string, user: User) {
    this.assertAdmin(user);

    const comment = await this.getCommentOrThrow(commentId);

    if (comment.deletedAt) {
      return { deleted: true };
    }

    comment.deletedByAdminId = user.id;
    await this.commentRepository.save(comment);
    await this.commentRepository.softRemove(comment);

    return { deleted: true };
  }

  async listReports(user: User) {
    this.assertAdmin(user);

    const [reviewReports, commentReports] = await Promise.all([
      this.reviewReportRepository.find({
        relations: {
          reporter: true,
          review: {
            user: true,
            challenge: true,
          },
        },
        order: {
          createdAt: 'DESC',
        },
      }),
      this.commentReportRepository.find({
        relations: {
          reporter: true,
          comment: {
            user: true,
            review: {
              user: true,
              challenge: true,
            },
          },
        },
        withDeleted: true,
        order: {
          createdAt: 'DESC',
        },
      }),
    ]);

    const reviewIds = [
      ...new Set([
        ...reviewReports.map((report) => report.reviewId),
        ...commentReports
          .map((report) => report.comment?.reviewId)
          .filter((value): value is string => !!value),
      ]),
    ];

    const allComments = reviewIds.length
      ? await this.commentRepository.find({
          where: reviewIds.map((reviewId) => ({ reviewId })),
          relations: {
            user: true,
          },
          withDeleted: true,
          order: {
            createdAt: 'ASC',
          },
        })
      : [];

    const commentsByReviewId = new Map<string, ChallengeReviewComment[]>();
    allComments.forEach((comment) => {
      const current = commentsByReviewId.get(comment.reviewId) ?? [];
      current.push(comment);
      commentsByReviewId.set(comment.reviewId, current);
    });

    const reviewItems = reviewReports.map((report) => ({
      id: report.id,
      targetType: 'review' as const,
      reason: report.reason,
      details: report.details,
      createdAt: report.createdAt,
      reporter: report.reporter
        ? {
            id: report.reporter.id,
            username: report.reporter.username,
          }
        : null,
      review: report.review
        ? this.serializeReviewForAdmin(
            report.review,
            commentsByReviewId.get(report.review.id) ?? [],
          )
        : null,
      comment: null,
    }));

    const commentItems = commentReports.map((report) => ({
      id: report.id,
      targetType: 'comment' as const,
      reason: report.reason,
      details: report.details,
      createdAt: report.createdAt,
      reporter: report.reporter
        ? {
            id: report.reporter.id,
            username: report.reporter.username,
          }
        : null,
      review: report.comment?.review
        ? this.serializeReviewForAdmin(
            report.comment.review,
            commentsByReviewId.get(report.comment.review.id) ?? [],
          )
        : null,
      comment: report.comment
        ? this.serializeCommentForAdmin(report.comment)
        : null,
    }));

    return [...reviewItems, ...commentItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async dismissReport(reportId: string, user: User) {
    this.assertAdmin(user);

    const reviewReport = await this.reviewReportRepository.findOne({
      where: { id: reportId },
    });

    if (reviewReport) {
      await this.reviewReportRepository.remove(reviewReport);
      return { dismissed: true };
    }

    const commentReport = await this.commentReportRepository.findOne({
      where: { id: reportId },
    });

    if (!commentReport) {
      throw new NotFoundException('Review report not found.');
    }

    await this.commentReportRepository.remove(commentReport);

    return { dismissed: true };
  }

  private async hasUserSubmittedChallenge(challengeId: number, userId: string) {
    const hasSoloSubmission = await this.challengeSubmissionRepository.exist({
      where: {
        challengeId,
        userId,
      },
    });

    if (hasSoloSubmission) {
      return true;
    }

    const matchSubmissionCount = await this.matchSubmissionRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.match', 'match')
      .where('submission.userId = :userId', { userId })
      .andWhere('match.challengeId = :challengeId', { challengeId })
      .getCount();

    if (matchSubmissionCount > 0) {
      return true;
    }

    const imposterSubmissionCount = await this.imposterSubmissionRepository
      .createQueryBuilder('submission')
      .innerJoin('submission.match', 'match')
      .where('submission.userId = :userId', { userId })
      .andWhere('match.challengeId = :challengeId', { challengeId })
      .getCount();

    return imposterSubmissionCount > 0;
  }

  private async getReviewOrThrow(reviewId: string) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: {
        user: true,
      },
      withDeleted: true,
    });

    if (!review) {
      throw new NotFoundException('Review not found.');
    }

    return review;
  }

  private async getCommentOrThrow(commentId: string) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: {
        user: true,
        review: true,
      },
      withDeleted: true,
    });

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    return comment;
  }

  private assertAdmin(user: User) {
    if (user.type !== UserType.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can moderate challenge reviews.',
      );
    }
  }

  private serializeReview(
    review: ChallengeReview,
    currentUser: User,
    comments: ChallengeReviewComment[],
    upvotes: ChallengeReviewUpvote[],
    reports: ChallengeReviewReport[],
    commentReportsByCommentId: Map<string, ChallengeReviewCommentReport[]>,
  ) {
    const isDeleted = !!review.deletedAt;

    return {
      id: review.id,
      challengeId: review.challengeId,
      title: isDeleted ? '[deleted]' : review.title,
      content: isDeleted ? '[deleted by admin]' : review.content,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      deletedAt: review.deletedAt,
      isDeleted,
      author: review.user
        ? {
            id: review.user.id,
            username: review.user.username,
          }
        : null,
      upvoteCount: upvotes.length,
      commentCount: comments.length,
      hasUpvoted: upvotes.some((upvote) => upvote.userId === currentUser.id),
      hasReported: reports.some((report) => report.reporterId === currentUser.id),
      canDelete: currentUser.type === UserType.ADMIN,
      comments: comments.map((comment) =>
        this.serializeComment(
          comment,
          currentUser,
          commentReportsByCommentId.get(comment.id) ?? [],
        ),
      ),
    };
  }

  private serializeComment(
    comment: ChallengeReviewComment,
    currentUser: User,
    reports: ChallengeReviewCommentReport[],
  ) {
    const isDeleted = !!comment.deletedAt;

    return {
      id: comment.id,
      reviewId: comment.reviewId,
      content: isDeleted ? '[deleted by admin]' : comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      deletedAt: comment.deletedAt,
      isDeleted,
      hasReported: reports.some((report) => report.reporterId === currentUser.id),
      canDelete: currentUser.type === UserType.ADMIN,
      author: comment.user
        ? {
            id: comment.user.id,
            username: comment.user.username,
          }
        : null,
    };
  }

  private serializeReviewForAdmin(
    review: ChallengeReview,
    comments: ChallengeReviewComment[],
  ) {
    const isDeleted = !!review.deletedAt;

    return {
      id: review.id,
      title: isDeleted ? '[deleted]' : review.title,
      content: isDeleted ? '[deleted by admin]' : review.content,
      createdAt: review.createdAt,
      deletedAt: review.deletedAt,
      isDeleted,
      challenge: review.challenge
        ? {
            id: review.challenge.id,
            title: review.challenge.title,
          }
        : null,
      author: review.user
        ? {
            id: review.user.id,
            username: review.user.username,
          }
        : null,
      comments: comments.map((comment) => this.serializeCommentForAdmin(comment)),
    };
  }

  private serializeCommentForAdmin(comment: ChallengeReviewComment) {
    const isDeleted = !!comment.deletedAt;

    return {
      id: comment.id,
      reviewId: comment.reviewId,
      content: isDeleted ? '[deleted by admin]' : comment.content,
      createdAt: comment.createdAt,
      deletedAt: comment.deletedAt,
      isDeleted,
      author: comment.user
        ? {
            id: comment.user.id,
            username: comment.user.username,
          }
        : null,
    };
  }
}
