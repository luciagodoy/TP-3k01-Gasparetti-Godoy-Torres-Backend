import {Op, Transaction, WhereOptions} from 'sequelize';
import {PricingRule, PricingRuleType, RoomCategory} from '../entities';
import {BaseRepository} from './base.repository';

const withCategory = [{model: RoomCategory, as: 'category'}];

class PricingRuleRepository extends BaseRepository<PricingRule> {
  constructor() {
    super(PricingRule);
  }

  findAllWithCategory(categoryId?: number): Promise<PricingRule[]> {
    return this.findAll({
      where: categoryId !== undefined ? {categoryId} : undefined,
      include: withCategory,
      order: [
        ['type', 'ASC'],
        ['from', 'ASC']
      ]
    });
  }

  findByIdWithCategory(id: number): Promise<PricingRule | null> {
    return this.findById(id, {include: withCategory});
  }

  // Reglas activas que pueden aplicar a estas categorías: las propias y las globales.
  findActiveFor(categoryIds: number[], transaction?: Transaction): Promise<PricingRule[]> {
    return this.findAll({
      where: {active: true, [Op.or]: [{categoryId: null}, {categoryId: categoryIds}]},
      transaction
    });
  }

  // Reglas del mismo tipo y alcance (misma categoría, o ambas globales).
  findSameScope(type: PricingRuleType, categoryId: number | null, excludeId?: number): Promise<PricingRule[]> {
    const where: WhereOptions<PricingRule> = {
      type,
      categoryId,
      ...(excludeId !== undefined && {id: {[Op.ne]: excludeId}})
    };
    return this.findAll({where});
  }
}

export const pricingRuleRepository = new PricingRuleRepository();
