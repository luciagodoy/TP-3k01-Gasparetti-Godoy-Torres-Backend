import {AdjustmentType, PricingRuleType} from '../entities/pricing-rule.entity';

// Pure pricing arithmetic: no database, no dates, no Express. The pricing
// service gathers the inputs (rules, occupancy, lead time) and this module only
// does the maths, which is what the unit tests cover.

export interface PricingRuleData {
  type: PricingRuleType;
  from: number;
  to: number | null;
  adjustmentType: AdjustmentType;
  value: number;
  categoryId: number | null;
}

export interface NightContext {
  occupancy: number; // % of the category's rooms booked that night (0-100)
  leadDays: number; // days from today until the check-in
}

export interface NightPrice<R extends PricingRuleData = PricingRuleData> {
  price: number;
  occupancyRule: R | null;
  leadTimeRule: R | null;
}

// No combination of rules can sell a night below half its base price.
export const MIN_PRICE_RATIO = 0.5;

const round2 = (value: number): number => Math.round(value * 100) / 100;

// [from, to): `from` inclusive, `to` exclusive, `to` null = no upper limit.
const inRange = (rule: PricingRuleData, measure: number): boolean => measure >= rule.from && (rule.to === null || measure < rule.to);

// The rule that applies to `measure`. A rule of the category wins over a
// global one (categoryId null) covering the same measure.
export const selectRule = <R extends PricingRuleData>(rules: R[], type: PricingRuleType, measure: number, categoryId: number): R | null => {
  const matching = rules.filter(
    (rule) => rule.type === type && inRange(rule, measure) && (rule.categoryId === null || rule.categoryId === categoryId)
  );
  return matching.find((rule) => rule.categoryId === categoryId) ?? matching[0] ?? null;
};

const applyAdjustment = (price: number, rule: PricingRuleData | null): number => {
  if (!rule) return price;
  return rule.adjustmentType === AdjustmentType.PERCENTAGE ? price * (1 + rule.value / 100) : price + rule.value;
};

// Price of one night. The occupancy adjustment is applied first and the lead
// time one on top of it, so two percentages multiply: +30 % then -10 % is
// x1.30 x0.90 = +17 %, not +20 %.
export const priceForNight = <R extends PricingRuleData>(
  basePrice: number,
  {occupancy, leadDays}: NightContext,
  rules: R[],
  categoryId: number
): NightPrice<R> => {
  const occupancyRule = selectRule(rules, PricingRuleType.OCCUPANCY, occupancy, categoryId);
  const leadTimeRule = selectRule(rules, PricingRuleType.LEAD_TIME, leadDays, categoryId);
  const adjusted = applyAdjustment(applyAdjustment(basePrice, occupancyRule), leadTimeRule);
  return {
    price: round2(Math.max(adjusted, basePrice * MIN_PRICE_RATIO)),
    occupancyRule,
    leadTimeRule
  };
};
