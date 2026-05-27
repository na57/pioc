/**
 * 实体解析服务 - 处理用户输入与数据库实体的模糊匹配
 */

import { query } from '@/lib/database/connection';

export interface EntityMatch {
  type: 'room' | 'cabinet' | 'device';
  original: string;      // 用户输入的原始值
  matched: string;       // 数据库匹配到的值
  id: string;           // 实体ID
  confidence: number;   // 匹配置信度 (0-1)
}

export interface EntityResolutionResult {
  room?: EntityMatch;
  cabinet?: EntityMatch;
  device?: EntityMatch;
  hasAmbiguity: boolean;
  candidates: EntityMatch[];
}

export class EntityResolver {
  /**
   * 解析用户问题中的实体
   */
  async resolveEntities(
    roomName?: string,
    cabinetName?: string,
    deviceName?: string
  ): Promise<EntityResolutionResult> {
    const result: EntityResolutionResult = {
      hasAmbiguity: false,
      candidates: [],
    };

    if (roomName) {
      const roomMatch = await this.resolveRoom(roomName);
      if (roomMatch) {
        if (roomMatch.confidence >= 0.8) {
          result.room = roomMatch;
        } else if (roomMatch.confidence >= 0.5) {
          result.hasAmbiguity = true;
          result.candidates.push(roomMatch);
        }
      }
    }

    if (cabinetName) {
      const cabinetMatch = await this.resolveCabinet(cabinetName);
      if (cabinetMatch) {
        if (cabinetMatch.confidence >= 0.8) {
          result.cabinet = cabinetMatch;
        } else if (cabinetMatch.confidence >= 0.5) {
          result.hasAmbiguity = true;
          result.candidates.push(cabinetMatch);
        }
      }
    }

    if (deviceName) {
      const deviceMatch = await this.resolveDevice(deviceName);
      if (deviceMatch) {
        if (deviceMatch.confidence >= 0.8) {
          result.device = deviceMatch;
        } else if (deviceMatch.confidence >= 0.5) {
          result.hasAmbiguity = true;
          result.candidates.push(deviceMatch);
        }
      }
    }

    return result;
  }

  /**
   * 模糊匹配机房名称
   */
  async resolveRoom(partialName: string): Promise<EntityMatch | null> {
    const sql = `
      SELECT id, name 
      FROM pioc_idc_room 
      WHERE status = 1 
      AND (name LIKE ? OR name LIKE ? OR ? LIKE CONCAT('%', name, '%'))
      ORDER BY 
        CASE 
          WHEN name = ? THEN 3
          WHEN name LIKE CONCAT(?, '%') THEN 2
          WHEN name LIKE CONCAT('%', ?, '%') THEN 1
          ELSE 0
        END DESC
      LIMIT 5
    `;
    
    const results = await query(sql, [
      `%${partialName}%`,
      `${partialName}%`,
      partialName,
      partialName,
      partialName,
      partialName,
    ]);

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const matches = results as Array<{ id: string; name: string }>;
    const bestMatch = matches[0];
    const confidence = this.calculateConfidence(partialName, bestMatch.name);

    return {
      type: 'room',
      original: partialName,
      matched: bestMatch.name,
      id: bestMatch.id,
      confidence,
    };
  }

  /**
   * 模糊匹配机柜名称
   */
  async resolveCabinet(partialName: string): Promise<EntityMatch | null> {
    const sql = `
      SELECT c.id, c.name, r.name as room_name
      FROM pioc_idc_cabinet c
      JOIN pioc_idc_room r ON c.room_id = r.id
      WHERE c.status = 1 
      AND (c.name LIKE ? OR c.code LIKE ? OR c.name LIKE ?)
      ORDER BY 
        CASE 
          WHEN c.name = ? THEN 3
          WHEN c.name LIKE CONCAT(?, '%') THEN 2
          WHEN c.name LIKE CONCAT('%', ?, '%') THEN 1
          ELSE 0
        END DESC
      LIMIT 5
    `;
    
    const results = await query(sql, [
      `%${partialName}%`,
      `%${partialName}%`,
      `${partialName}%`,
      partialName,
      partialName,
      partialName,
    ]);

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const matches = results as Array<{ id: string; name: string; room_name: string }>;
    const bestMatch = matches[0];
    const confidence = this.calculateConfidence(partialName, bestMatch.name);

    return {
      type: 'cabinet',
      original: partialName,
      matched: `${bestMatch.name} (${bestMatch.room_name})`,
      id: bestMatch.id,
      confidence,
    };
  }

  /**
   * 模糊匹配设备名称
   */
  async resolveDevice(partialName: string): Promise<EntityMatch | null> {
    const sql = `
      SELECT d.id, d.name, c.name as cabinet_name, r.name as room_name
      FROM pioc_idc_device d
      JOIN pioc_idc_cabinet c ON d.cabinet_id = c.id
      JOIN pioc_idc_room r ON c.room_id = r.id
      WHERE d.status = 1 
      AND (d.name LIKE ? OR d.asset_no LIKE ? OR d.name LIKE ?)
      ORDER BY 
        CASE 
          WHEN d.name = ? THEN 3
          WHEN d.name LIKE CONCAT(?, '%') THEN 2
          WHEN d.name LIKE CONCAT('%', ?, '%') THEN 1
          ELSE 0
        END DESC
      LIMIT 5
    `;
    
    const results = await query(sql, [
      `%${partialName}%`,
      `%${partialName}%`,
      `${partialName}%`,
      partialName,
      partialName,
      partialName,
    ]);

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const matches = results as Array<{ 
      id: string; 
      name: string; 
      cabinet_name: string;
      room_name: string;
    }>;
    const bestMatch = matches[0];
    const confidence = this.calculateConfidence(partialName, bestMatch.name);

    return {
      type: 'device',
      original: partialName,
      matched: `${bestMatch.name} (${bestMatch.room_name} / ${bestMatch.cabinet_name})`,
      id: bestMatch.id,
      confidence,
    };
  }

  /**
   * 计算匹配置信度
   */
  private calculateConfidence(input: string, matched: string): number {
    const inputLower = input.toLowerCase().trim();
    const matchedLower = matched.toLowerCase().trim();

    // 完全匹配
    if (inputLower === matchedLower) return 1.0;

    // 输入被包含在匹配结果中
    if (matchedLower.includes(inputLower)) {
      // 计算覆盖比例
      const coverage = inputLower.length / matchedLower.length;
      return 0.7 + coverage * 0.2;
    }

    // 匹配结果被包含在输入中
    if (inputLower.includes(matchedLower)) {
      return 0.6;
    }

    // 计算编辑距离相似度（简化版）
    const distance = this.levenshteinDistance(inputLower, matchedLower);
    const maxLength = Math.max(inputLower.length, matchedLower.length);
    const similarity = 1 - distance / maxLength;

    return Math.max(0.3, similarity * 0.8);
  }

  /**
   * 计算Levenshtein编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

// 导出单例
export const entityResolver = new EntityResolver();
