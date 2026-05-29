import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import fs from 'fs';
import path from 'path';

function getPackageVersion(): string {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageContent = fs.readFileSync(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

export async function GET() {
  try {
    const config = getConfig();
    const packageVersion = getPackageVersion();

    const systemConfig = {
      name: config.app.name,
      shortName: 'PIOC',
      description: config.app.description,
      version: packageVersion,
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
        version: getPackageVersion(),
        copyright: `©${new Date().getFullYear()} PIOC`,
      },
    });
  }
}
