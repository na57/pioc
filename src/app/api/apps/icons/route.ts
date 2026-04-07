import { NextResponse } from 'next/server';
import { findAll } from '@/lib/database/models/app';

/**
 * 获取所有应用使用的图标列表
 * 用于前端动态加载图标
 */
export async function GET() {
  try {
    const apps = await findAll();
    
    // 提取所有唯一的图标名称
    const iconNames = [...new Set(apps
      .map(app => app.icon)
      .filter((icon): icon is string => !!icon)
    )];
    
    return NextResponse.json({ 
      success: true, 
      data: iconNames 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch app icons', 
        error: String(error) 
      },
      { status: 500 }
    );
  }
}
