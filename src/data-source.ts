import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

config();

const databaseUrl = process.env.DATABASE_URL;

const connectionOptions: DataSourceOptions = databaseUrl
  ? {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      entities: ['src/**/*.entity{.ts,.js}'],
      migrations: ['src/migrations/*{.ts,.js}'],
      synchronize: false,
    }
  : {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'medbridge',
      entities: ['src/**/*.entity{.ts,.js}'],
      migrations: ['src/migrations/*{.ts,.js}'],
      synchronize: false,
    };

export const AppDataSource = new DataSource(connectionOptions);
export default AppDataSource;