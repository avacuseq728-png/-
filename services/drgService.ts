import { DrgRule, ValidationResult } from '../types';

/**
 * DRG Validation Service
 * 
 * NOTE FOR JAVA DEVELOPERS:
 * In a real backend environment (Spring Boot), this logic would reside in a Service class.
 * Example: `public class DrgValidationService { ... }`
 * The `validateRecord` function would be a method: `public ValidationResult validate(...)`
 */
export const DrgService = {
  validateRecord: (
    rule: DrgRule,
    metrics: Record<string, number>,
    cost: number
  ): ValidationResult => {
    const messages: string[] = [];
    let isValid = true;

    // 1. Cost Validation
    // Java: if (cost > rule.getMaxCost()) { ... }
    if (cost > rule.maxCost) {
      isValid = false;
      messages.push(`当前费用 ¥${cost} 超出 ${rule.diseaseName} 的DRG付费上限 ¥${rule.maxCost}。`);
    }

    // 2. Required Metrics & Range Validation
    // Java: rule.getRequiredMetrics().stream().forEach(...)
    rule.requiredMetrics.forEach((metric) => {
      const value = metrics[metric.key];

      // Check existence (assuming 0 is a valid value, check for undefined/null/NaN)
      if (value === undefined || value === null || isNaN(value)) {
        isValid = false;
        messages.push(`缺少必填项: ${metric.label}。`);
        return;
      }

      // Check Range
      if (value < metric.min || value > metric.max) {
        isValid = false;
        messages.push(
          `${metric.label} 数值 (${value} ${metric.unit}) 超出合理范围 (${metric.min}-${metric.max} ${metric.unit})。`
        );
      }
    });

    return { isValid, messages };
  }
};