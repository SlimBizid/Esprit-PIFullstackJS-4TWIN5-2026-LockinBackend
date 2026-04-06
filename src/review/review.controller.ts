import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';

import { CreateChallengeReviewDto } from './dto/create-challenge-review.dto';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { CreateReviewReportDto } from './dto/create-review-report.dto';
import { ReviewService } from './review.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('challenges/:challengeId/reviews')
  listChallengeReviews(
    @Param('challengeId', ParseIntPipe) challengeId: number,
    @Request() req: { user: User },
  ) {
    return this.reviewService.listChallengeReviews(challengeId, req.user);
  }

  @Post('challenges/:challengeId/reviews')
  createChallengeReview(
    @Param('challengeId', ParseIntPipe) challengeId: number,
    @Body() dto: CreateChallengeReviewDto,
    @Request() req: { user: User },
  ) {
    return this.reviewService.createChallengeReview(challengeId, dto, req.user);
  }

  @Get('reviews/reports')
  listReports(@Request() req: { user: User }) {
    return this.reviewService.listReports(req.user);
  }

  @Delete('reviews/reports/:reportId')
  dismissReport(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Request() req: { user: User },
  ) {
    return this.reviewService.dismissReport(reportId, req.user);
  }

  @Post('reviews/:reviewId/comments')
  addComment(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateReviewCommentDto,
    @Request() req: { user: User },
  ) {
    return this.reviewService.addComment(reviewId, dto, req.user);
  }

  @Post('review-comments/:commentId/report')
  reportComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: CreateReviewReportDto,
    @Request() req: { user: User },
  ) {
    return this.reviewService.reportComment(commentId, dto, req.user);
  }

  @Delete('review-comments/:commentId')
  deleteComment(
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Request() req: { user: User },
  ) {
    return this.reviewService.deleteComment(commentId, req.user);
  }

  @Post('reviews/:reviewId/upvote')
  upvoteReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Request() req: { user: User },
  ) {
    return this.reviewService.upvoteReview(reviewId, req.user);
  }

  @Delete('reviews/:reviewId/upvote')
  removeUpvote(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Request() req: { user: User },
  ) {
    return this.reviewService.removeUpvote(reviewId, req.user);
  }

  @Post('reviews/:reviewId/report')
  reportReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: CreateReviewReportDto,
    @Request() req: { user: User },
  ) {
    return this.reviewService.reportReview(reviewId, dto, req.user);
  }

  @Delete('reviews/:reviewId')
  deleteReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Request() req: { user: User },
  ) {
    return this.reviewService.deleteReview(reviewId, req.user);
  }
}
