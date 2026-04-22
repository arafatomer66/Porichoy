import { AppDataSource } from '../../../config/database';
import { AccessReview } from '../../../entities/access-review.entity';
import { AccessReviewItem } from '../../../entities/access-review-item.entity';
import { IdentityRole } from '../../../entities/identity-role.entity';
import { AccessReviewStatus, ReviewDecision, IdentityRoleStatus } from '@porichoy/shared-types';
import { writeAudit } from '../../../middleware/audit.middleware';

export const ReviewsService = {
  async list() {
    return AppDataSource.getRepository(AccessReview).find({
      order: { createdAt: 'DESC' },
      relations: ['application', 'reviewer'],
    });
  },

  async get(uuid: string) {
    return AppDataSource.getRepository(AccessReview).findOne({
      where: { uuid },
      relations: ['application', 'reviewer'],
    });
  },

  async create(dto: {
    name: string;
    description?: string;
    applicationUuid?: string | null;
    reviewerUuid: string;
    dueDate: string;
  }, actorUuid?: string) {
    const repo = AppDataSource.getRepository(AccessReview);
    const review = await repo.save(repo.create({
      ...dto,
      applicationUuid: dto.applicationUuid ?? null,
      status: AccessReviewStatus.Open,
    }));

    await ReviewsService.populateItems(review.uuid, dto.applicationUuid ?? null);
    await writeAudit({ actorUuid, action: 'review.create', resourceType: 'access_review', resourceUuid: review.uuid });
    return review;
  },

  async populateItems(reviewUuid: string, applicationUuid: string | null) {
    const itemRepo = AppDataSource.getRepository(AccessReviewItem);
    const irRepo = AppDataSource.getRepository(IdentityRole);

    const query = irRepo.createQueryBuilder('ir')
      .innerJoin('ir.role', 'r')
      .where('ir.status = :status', { status: IdentityRoleStatus.Active });
    if (applicationUuid) query.andWhere('r.application_uuid = :applicationUuid', { applicationUuid });

    const assignments = await query.getMany();

    const items = assignments.map((ir) => itemRepo.create({
      reviewUuid,
      identityUuid: ir.identityUuid,
      roleUuid: ir.roleUuid,
      decision: ReviewDecision.Pending,
    }));

    if (items.length) await itemRepo.save(items);
  },

  async getItems(reviewUuid: string) {
    return AppDataSource.getRepository(AccessReviewItem).find({
      where: { reviewUuid },
      relations: ['identity', 'role'],
    });
  },

  async decide(itemUuid: string, decision: ReviewDecision, comments: string, decidedBy: string) {
    const itemRepo = AppDataSource.getRepository(AccessReviewItem);
    const item = await itemRepo.findOneBy({ uuid: itemUuid });
    if (!item) throw Object.assign(new Error('item_not_found'), { status: 404 });

    await itemRepo.update(itemUuid, { decision, comments, decidedBy, decidedAt: new Date() });

    if (decision === ReviewDecision.Revoke) {
      await AppDataSource.getRepository(IdentityRole).update(
        { identityUuid: item.identityUuid, roleUuid: item.roleUuid, status: IdentityRoleStatus.Active },
        { status: IdentityRoleStatus.Revoked }
      );
    }

    await writeAudit({ actorUuid: decidedBy, action: 'review.decide', resourceType: 'access_review_item', resourceUuid: itemUuid, details: { decision } });
    return itemRepo.findOneBy({ uuid: itemUuid });
  },

  async complete(reviewUuid: string, actorUuid?: string) {
    const pendingCount = await AppDataSource.getRepository(AccessReviewItem)
      .countBy({ reviewUuid, decision: ReviewDecision.Pending });

    const status = pendingCount === 0 ? AccessReviewStatus.Completed : AccessReviewStatus.InProgress;
    await AppDataSource.getRepository(AccessReview).update(reviewUuid, {
      status,
      completedAt: pendingCount === 0 ? new Date() : null,
    });
    await writeAudit({ actorUuid, action: 'review.complete', resourceType: 'access_review', resourceUuid: reviewUuid });
    return AppDataSource.getRepository(AccessReview).findOneBy({ uuid: reviewUuid });
  },

  async cancel(reviewUuid: string, actorUuid?: string) {
    await AppDataSource.getRepository(AccessReview).update(reviewUuid, { status: AccessReviewStatus.Cancelled });
    await writeAudit({ actorUuid, action: 'review.cancel', resourceType: 'access_review', resourceUuid: reviewUuid });
  },
};
