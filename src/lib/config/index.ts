import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface AIModelConfig {
  modelId: string;
  displayName: string;
  maxTokens: number;
  temperature: number;
}

export interface AIProviderConfig {
  name: string;
  providerId: string;
  baseUrl: string;
  apiKey: string;
  models: AIModelConfig[];
}

export interface AIConfig {
  enabled: boolean;
  providers: AIProviderConfig[];
  defaultModel: string;
  timeout: number;
  maxRetries: number;
}

export interface AppConfig {
  app: {
    port: number;
    name: string;
    version: string;
    description: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    connectionLimit: number;
    charset: string;
  };
  mongodb: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    password: string;
    db: number;
  };
  security: {
    jwtSecret: string;
    jwtExpireDays: number;
    sessionCookieName: string;
    httpsEnabled: boolean;
  };
  cas: {
    enabled: boolean;
    serverUrl: string;
    pathPrefix: string;
    serviceUrl: string;
    version: string;
    strictSSL: boolean;
    loginPath: string;
    validatePath: string;
    attributeMapping: {
      username: string;
      email: string;
      name: string;
    };
    defaultRoleId: number;
  };
  wechat: {
    enabled: boolean;
    corpId: string;
    agentId: string;
    secret: string;
  };
  logging: {
    level: string;
    format: string;
    output: string;
  };
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  upload: {
    maxFileSize: number;
    allowedTypes: string[];
    storagePath: string;
  };
  mail: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpUsername: string;
    smtpPassword: string;
    fromAddress: string;
    fromName: string;
  };
  ai: AIConfig;
  apps?: {
    teacherTeaching?: {
      dataSourceId: string;
      semesterTableName: string;
      undergraduateTeachingInfoTableName: string;
      graduateTeachingInfoTableName: string;
      classroomDataTableName: string;
    };
    myTeaching?: {
      dataSourceId: string;
      semesterTableName: string;
      teachingInfoTableName: string;
    };
    courseCenter?: {
      dataSourceId: string;
      undergraduateCourseTableName: string;
      graduateCourseTableName: string;
      undergraduateTeachingTableName: string;
      graduateTeachingTableName: string;
      classroomStatsTableName: string;
      undergraduateTextbookTableName: string;
      supervisionRecordTableName: string;
      undergraduateGradeTableName: string;
      graduateGradeTableName: string;
      courseIdeologyTableName: string;
    };
    teacherCenter?: {
      configFile?: string;
    };
    dataObject?: {
      configFile?: string;
      ai?: {
        providerId?: string;
        model?: string;
      };
    };
  };
  features: {
    allowUserRegistration: boolean;
    enableCasLogin: boolean;
    enableWechatLogin: boolean;
    enableAuditLog: boolean;
    enableRateLimit: boolean;
    rateLimitPerMinute: number;
  };
}

let config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (config) {
    return config;
  }

  const configPath = path.join(process.cwd(), 'config', 'config.yaml');

  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const fileContents = fs.readFileSync(configPath, 'utf8');
  config = yaml.load(fileContents) as AppConfig;

  return config;
}

export function getConfig(): AppConfig {
  if (!config) {
    return loadConfig();
  }
  return config;
}

export default getConfig;
