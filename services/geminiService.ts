import { DrgRule } from "../types";

/**
 * 本地模拟智能提取服务 (无 API 版本)
 * 使用正则表达式匹配文本中的关键词和数值
 */
export const extractClinicalData = async (
  note: string, 
  rule: DrgRule
): Promise<Record<string, number> | null> => {
  
  // 模拟 AI 思考的延迟，提供更好的交互感
  await new Promise(resolve => setTimeout(resolve, 800));

  try {
    const result: Record<string, number> = {};
    const normalizedNote = note.replace(/\s+/g, ''); // 去除所有空格以便匹配

    // 1. 提取诊疗费用
    // 匹配规则：寻找 "费用"、"金额"、"花费" 后面跟随的数字
    const costRegex = /(?:费用|金额|花费|总价|合计)[:：]?(\d+(\.\d+)?)/;
    const costMatch = normalizedNote.match(costRegex);
    if (costMatch) {
      result['cost'] = parseFloat(costMatch[1]);
    }

    // 2. 提取 DRG 规则中定义的必要指标
    rule.requiredMetrics.forEach(metric => {
      // 构建更灵活的正则：
      // 1. 匹配指标名称 (如 "收缩压")
      // 2. 可选匹配冒号
      // 3. 匹配数字
      // 4. 处理一些常见别名
      
      let keywords = [metric.label];
      
      // 添加一些常见医学别名映射
      if (metric.key === 'systolic') keywords.push('高压', '上压');
      if (metric.key === 'diastolic') keywords.push('低压', '下压');
      if (metric.key === 'temperature') keywords.push('温度', 'T');
      if (metric.key === 'weight') keywords.push('体重');
      if (metric.key === 'fastingGlucose') keywords.push('血糖', '空腹');
      if (metric.key === 'hba1c') keywords.push('糖化');

      // 构造正则：(关键词1|关键词2)[:：]?(\d+(\.\d+)?)
      const pattern = `(${keywords.join('|')})[:：]?(\\d+(\\.\\d+)?)`;
      const regex = new RegExp(pattern);
      
      const match = normalizedNote.match(regex);
      if (match) {
        // match[2] 是捕获的数字部分
        result[metric.key] = parseFloat(match[2]);
      }
    });

    // 如果没有任何数据被提取到，返回 null
    if (Object.keys(result).length === 0) {
      return null;
    }

    return result;

  } catch (error) {
    console.error("Local Extraction Error:", error);
    return null;
  }
};