import {AdjustmentType, PricingRule, PricingRuleType} from '../entities';
import {pricingRuleRepository} from '../repositories/pricing-rule.repository';
import {BadRequestError, ConflictError, NotFoundError} from '../shared/errors';
import {pickDefined} from '../shared/http';
import {BaseService} from './base.service';

export interface PricingRuleInput {
  type: PricingRuleType;
  from: number;
  to?: number | null;
  adjustmentType: AdjustmentType;
  value: number;
  active?: boolean;
  categoryId?: number | null;
}

type PricingRuleData = Required<PricingRuleInput>;

const EDITABLE_FIELDS = ['type', 'from', 'to', 'adjustmentType', 'value', 'active', 'categoryId'] as const;

const RULE_TYPES: string[] = Object.values(PricingRuleType);
const ADJUSTMENT_TYPES: string[] = Object.values(AdjustmentType);

const invalid = (detail: string) => new BadRequestError('Regla de tarifa inválida', detail);

const describeRange = (from: number, to: number | null) => (to === null ? `desde ${from}` : `${from} a ${to}`);


const rangesOverlap = (a: {from: number; to: number | null}, b: {from: number; to: number | null}): boolean =>
  a.from < (b.to ?? Infinity) && b.from < (a.to ?? Infinity);

class PricingRuleService extends BaseService<PricingRule> {
  protected readonly notFoundMessage = 'Regla de tarifa no encontrada';
  protected readonly deleteBlockedMessage = 'La regla tiene registros asociados.';

  constructor(private readonly rules = pricingRuleRepository) {
    super(rules);
  }

  list(categoryId?: number): Promise<PricingRule[]> {
    return this.rules.findAllWithCategory(categoryId);
  }

  async getWithCategory(id: number): Promise<PricingRule> {
    const rule = await this.rules.findByIdWithCategory(id);
    if (!rule) throw new NotFoundError(this.notFoundMessage);
    return rule;
  }

  async create(input: PricingRuleInput): Promise<PricingRule> {
    const data: PricingRuleData = {
      type: input.type,
      from: input.from,
      to: input.to ?? null,
      adjustmentType: input.adjustmentType,
      value: input.value,
      active: input.active ?? true,
      categoryId: input.categoryId ?? null
    };
    await this.assertValid(data);
    return this.rules.create(data);
  }

  async update(id: number, input: Partial<PricingRuleInput>): Promise<PricingRule> {
    const rule = await this.getById(id);
    const data: PricingRuleData = {
      type: rule.type,
      from: rule.from,
      to: rule.to,
      adjustmentType: rule.adjustmentType,
      value: rule.value,
      active: rule.active,
      categoryId: rule.categoryId,
      ...pickDefined(input, EDITABLE_FIELDS)
    };
    await this.assertValid(data, id);
    return this.rules.update(rule, data);
  }

  private async assertValid(data: PricingRuleData, excludeId?: number): Promise<void> {
    if (!data.type || !data.adjustmentType || data.from === undefined || data.from === null || data.value === undefined) {
      throw new BadRequestError('Datos incompletos', 'type, from, adjustmentType y value son obligatorios.');
    }
    if (!RULE_TYPES.includes(data.type)) throw invalid(`El tipo debe ser uno de: ${RULE_TYPES.join(', ')}.`);
    if (!ADJUSTMENT_TYPES.includes(data.adjustmentType)) {
      throw invalid(`El tipo de ajuste debe ser uno de: ${ADJUSTMENT_TYPES.join(', ')}.`);
    }
    if (!Number.isInteger(data.from) || data.from < 0) throw invalid('"Desde" debe ser un entero mayor o igual a 0.');
    if (data.to !== null && (!Number.isInteger(data.to) || data.to <= data.from)) {
      throw invalid('"Hasta" debe ser un entero mayor que "desde", o quedar vacío para no tener tope.');
    }
    if (data.type === PricingRuleType.OCCUPANCY && (data.from > 100 || (data.to !== null && data.to > 100))) {
      throw invalid('La ocupación es un porcentaje: el rango tiene que estar entre 0 y 100.');
    }
    if (typeof data.value !== 'number' || Number.isNaN(data.value)) throw invalid('El valor debe ser un número.');
    if (data.adjustmentType === AdjustmentType.PERCENTAGE && data.value <= -100) {
      throw invalid('Un descuento porcentual tiene que ser menor al 100 %.');
    }
.
    const sameScope = await this.rules.findSameScope(data.type, data.categoryId, excludeId);
    const clash = sameScope.find((other) => rangesOverlap(data, other));
    if (clash) {
      throw new ConflictError(
        'Ya existe una regla para ese rango',
        `Se superpone con la regla #${clash.id} (${describeRange(clash.from, clash.to)}).`
      );
    }
  }
}

export const pricingRuleService = new PricingRuleService();
