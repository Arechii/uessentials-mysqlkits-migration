import MySQL, { Pool } from "mysql2/promise";

export interface DatabaseCredentials {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string
}

export class DatabaseConnection {
  pool: Pool;

  constructor({ host, port, database, user, password }: DatabaseCredentials) {
    this.pool = MySQL.createPool({ host, port, database, user, password });
  }

  async query<T>(sql: string, ...args: any) {
    const [rows] = await this.pool.query(sql, args);
    return rows as unknown as T;
  }
}