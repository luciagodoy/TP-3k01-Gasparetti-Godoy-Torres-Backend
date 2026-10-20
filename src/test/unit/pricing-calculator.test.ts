import {describe, it, expect} from 'vitest';
import {AdjustmentType, PricingRuleType} from '../../entities/pricing-rule.entity';
import {PricingRuleData, priceForNight, selectRule} from '../../services/pricing-calculator';

const CATEGORY = 1;
const OTHER_CATEGORY = 2;

const rule = (overrides: Partial<PricingRuleData>): PricingRuleData => ({
  type: PricingRuleType.OCCUPANCY,
  from: 0,
  to: null,
  adjustmentType: AdjustmentType.PERCENTAGE,
  value: 0,
  categoryId: null,
  ...overrides
});

// The example tiers from the design: occupancy 50-80 % +15 %, 80 %+ +30 %;
// lead time under 7 days +20 %, more than 60 days -10 %.
const RULES: PricingRuleData[] = [
  rule({type: PricingRuleType.OCCUPANCY, from: 50, to: 80, value: 15}),
  rule({type: PricingRuleType.OCCUPANCY, from: 80, to: null, value: 30}),
  rule({type: PricingRuleType.LEAD_TIME, from: 0, to: 7, value: 20}),
  rule({type: PricingRuleType.LEAD_TIME, from: 61, to: null, value: -10})
];

describe('priceForNight', () => {
  it('keeps the base price when no rule matches', () => {
    expect(priceForNight(100, {occupancy: 10, leadDays: 30}, RULES, CATEGORY).price).toBe(100);
  });

  it('applies the occupancy tier the night falls in', () => {
    expect(priceForNight(100, {occupancy: 60, leadDays: 30}, RULES, CATEGORY).price).toBe(115);
  });

  it('multiplies the occupancy and lead-time percentages instead of adding them', () => {
    // 100 x 1.30 x 0.90 = 117 (adding them would give 120).
    expect(priceForNight(100, {occupancy: 90, leadDays: 90}, RULES, CATEGORY).price).toBe(117);
    // 100 x 1.30 x 1.20 = 156 (adding them would give 150).
    expect(priceForNight(100, {occupancy: 90, leadDays: 3}, RULES, CATEGORY).price).toBe(156);
  });

  it('treats "from" as inclusive and "to" as exclusive', () => {
    expect(priceForNight(100, {occupancy: 80, leadDays: 30}, RULES, CATEGORY).price).toBe(130);
    expect(priceForNight(100, {occupancy: 79.9, leadDays: 30}, RULES, CATEGORY).price).toBe(115);
    expect(priceForNight(100, {occupancy: 0, leadDays: 7}, RULES, CATEGORY).price).toBe(100);
    expect(priceForNight(100, {occupancy: 0, leadDays: 6}, RULES, CATEGORY).price).toBe(120);
  });

  it('a top tier without "to" covers a full hotel (100 %)', () => {
    expect(priceForNight(100, {occupancy: 100, leadDays: 30}, RULES, CATEGORY).price).toBe(130);
  });

  it('adds fixed amounts after applying the occupancy rule', () => {
    const rules = [
      rule({type: PricingRuleType.OCCUPANCY, from: 50, value: 10}),
      rule({type: PricingRuleType.LEAD_TIME, from: 0, to: 7, adjustmentType: AdjustmentType.FIXED, value: 25})
    ];
    // (100 x 1.10) + 25
    expect(priceForNight(100, {occupancy: 50, leadDays: 2}, rules, CATEGORY).price).toBe(135);
  });

  it('never goes below half the base price, whatever the rules combine to', () => {
    const rules = [
      rule({type: PricingRuleType.OCCUPANCY, from: 0, to: 30, value: -40}),
      rule({type: PricingRuleType.LEAD_TIME, from: 61, value: -40})
    ];
    // 100 x 0.6 x 0.6 = 36 -> floor at 50
    expect(priceForNight(100, {occupancy: 10, leadDays: 90}, rules, CATEGORY).price).toBe(50);
  });

  it('rounds each night to cents', () => {
    const rules = [rule({type: PricingRuleType.OCCUPANCY, from: 0, value: 33.33})];
    expect(priceForNight(99.99, {occupancy: 0, leadDays: 30}, rules, CATEGORY).price).toBe(133.32);
  });

  it('reports which adjustments were applied', () => {
    const night = priceForNight(100, {occupancy: 90, leadDays: 3}, RULES, CATEGORY);
    expect(night.occupancyRule?.value).toBe(30);
    expect(night.leadTimeRule?.value).toBe(20);
  });
});

describe('selectRule', () => {
  it('prefers the rule of the category over a global one for the same measure', () => {
    const rules = [
      rule({type: PricingRuleType.OCCUPANCY, from: 50, value: 10}),
      rule({type: PricingRuleType.OCCUPANCY, from: 50, value: 40, categoryId: CATEGORY})
    ];
    expect(selectRule(rules, PricingRuleType.OCCUPANCY, 70, CATEGORY)?.value).toBe(40);
  });

  it('ignores rules of other categories', () => {
    const rules = [rule({type: PricingRuleType.OCCUPANCY, from: 50, value: 40, categoryId: OTHER_CATEGORY})];
    expect(selectRule(rules, PricingRuleType.OCCUPANCY, 70, CATEGORY)).toBeNull();
  });
});
