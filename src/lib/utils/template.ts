export interface TemplateField {
  name: string;
  fullPath: string;
  start: number;
  end: number;
}

export interface ParseResult {
  template: string;
  fields: TemplateField[];
  isValid: boolean;
  error?: string;
}

// 解析模板，提取字段
export function parseTemplate(template: string): ParseResult {
  const fields: TemplateField[] = [];
  const fieldPattern = /\{\{([^}]+)\}\}/g;
  let match;
  let error: string | undefined;

  while ((match = fieldPattern.exec(template)) !== null) {
    const fieldName = match[1].trim();

    if (!fieldName) {
      error = '模板中存在空字段名称';
      continue;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(fieldName)) {
      error = `字段名称 "${fieldName}" 格式不正确`;
    }

    fields.push({
      name: fieldName,
      fullPath: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return {
    template,
    fields,
    isValid: fields.length > 0 && !error,
    error,
  };
}

// 渲染模板
export function renderTemplate(template: string, data: Record<string, any>): string {
  if (!template) return '';

  try {
    let result = template;
    const fieldPattern = /\{\{([^}]+)\}\}/g;

    result = result.replace(fieldPattern, (match, fieldName) => {
      const trimmedName = fieldName.trim();
      if (!trimmedName) return '';

      const keys = trimmedName.split('.');
      let value: any = data;

      for (const key of keys) {
        if (value === null || value === undefined) return '';
        value = value[key];
      }

      return value === null || value === undefined ? '' : String(value);
    });

    return result;
  } catch (error) {
    console.error('模板渲染失败:', error);
    return template;
  }
}

// 验证模板
export function validateTemplate(template: string): { valid: boolean; message?: string } {
  if (!template || template.trim() === '') {
    return { valid: false, message: '模板不能为空' };
  }

  const result = parseTemplate(template);

  if (!result.isValid) {
    return { valid: false, message: result.error };
  }

  if (result.fields.length === 0) {
    return { valid: false, message: '模板中未找到字段，请使用 {{字段名}} 格式' };
  }

  return { valid: true };
}

// 预览模板
export function previewTemplate(
  template: string,
  sampleData: Record<string, any>[],
  maxPreviews: number = 5
): { template: string; previews: string[] } {
  const previews = sampleData.slice(0, maxPreviews).map((data) => renderTemplate(template, data));

  return { template, previews };
}

// 从数据中提取字段建议
export function getFieldSuggestions(data: Record<string, any>): string[] {
  const fields = new Set<string>();

  function traverse(obj: any, prefix: string = '') {
    if (obj === null || obj === undefined || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      if (obj.length > 0 && typeof obj[0] === 'object') {
        traverse(obj[0], prefix);
      }
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      fields.add(fullPath);

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, fullPath);
      }
    }
  }

  traverse(data);
  return Array.from(fields).sort();
}
