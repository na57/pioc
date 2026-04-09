import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET() {
  try {
    const config = getConfig();
    
    const systemConfig = {
      name: config.app.name,
      shortName: 'PIOC',
      description: config.app.description,
      version: config.app.version,
      copyright: `©${new Date().getFullYear()} PIOC`,
    };

    return NextResponse.json({
      success: true,
      data: systemConfig,
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        name: '个人智慧运行中心',
        shortName: 'PIOC',
        description: 'Personal Intelligence Operation Center',
        version: '1.0.0',
        copyright: `©${new Date().getFullYear()} PIOC`,
      },
    });
  }
}
