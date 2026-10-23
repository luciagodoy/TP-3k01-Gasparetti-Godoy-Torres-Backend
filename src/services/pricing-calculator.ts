import {AdjustmentType, PricingRuleType} from '../entities/pricing-rule.entity';

// Aritmética de precios pura. El servicio
// de precios reúne los datos (reglas, ocupación, antelación) y este módulo sólo
// hace las cuentas, que es lo que cubren los tests unitarios.

export interface PricingRuleData {
  type: PricingRuleType;
  from: number;
  to: number | null;
  adjustmentType: AdjustmentType;
  value: number;
  categoryId: number | null;
}

export interface NightContext {
  occupancy: number; // % de las habitaciones de la categoría reservadas esa noche (0-100)
  leadDays: number; // días desde hoy hasta el check-in
}

export interface NightPrice<R extends PricingRuleData = PricingRuleData> {
  price: number;
  occupancyRule: R | null;
  leadTimeRule: R | null;
}

export const MIN_PRICE_RATIO = 0.5;

const round2 = (value: number): number => Math.round(value * 100) / 100;

// [from, to): `from` inclusive, `to` exclusivo, `to` null = sin límite superior.
const inRange = (rule: PricingRuleData, measure: number): boolean => measure >= rule.from && (rule.to === null || measure < rule.to);

// La regla que aplica a `measure`. Una regla de la categoría gana sobre una
// global (categoryId null) que cubra la misma medida.
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

// Precio de una noche. Primero se aplica el ajuste por ocupación y encima el de
// antelación, así que dos porcentajes se multiplican: +30 % y luego -10 % es
// x1,30 x0,90 = +17 %, no +20 %.
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
