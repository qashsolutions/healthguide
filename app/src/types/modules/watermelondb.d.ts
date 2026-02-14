declare module '@nozbe/watermelondb' {
  export class Database {
    adapter: any;
    constructor(options: {
      adapter: any;
      modelClasses: any[];
    });
    get<T>(tableName: string): any;
    write<T>(callback: () => Promise<T>): Promise<T>;
    action<T>(callback: () => Promise<T>): Promise<T>;
    unsafeResetDatabase(): Promise<void>;
  }

  export class Model {
    id: string;
    _raw: any;
    static table: string;
    static associations?: Record<string, any>;
    update(callback: (record: any) => void): Promise<void>;
    markAsDeleted(): Promise<void>;
    destroyPermanently(): Promise<void>;
  }

  export class Collection<T extends Model> {
    find(id: string): Promise<T>;
    query(...conditions: any[]): Query<T>;
    create(callback: (record: any) => void): Promise<T>;
  }

  export class Query<T extends Model> {
    fetch(): Promise<T[]>;
    fetchCount(): Promise<number>;
    observe(): any;
    observeWithColumns(columns: string[]): any;
  }

  export function appSchema(schema: { version: number; tables: any[] }): any;
  export function tableSchema(schema: { name: string; columns: any[] }): any;

  export const Q: {
    where(column: string, value: any): any;
    eq(value: any): any;
    gt(value: any): any;
    gte(value: any): any;
    lt(value: any): any;
    lte(value: any): any;
    like(value: string): any;
    on(table: string, column: string, value: any): any;
    sortBy(column: string, order?: 'asc' | 'desc'): any;
    take(count: number): any;
    skip(count: number): any;
    and(...conditions: any[]): any;
    or(...conditions: any[]): any;
    oneOf(values: any[]): any;
    notEq(value: any): any;
    between(low: any, high: any): any;
    notIn(values: any[]): any;
  };
}

declare module '@nozbe/watermelondb/adapters/sqlite' {
  export default class SQLiteAdapter {
    constructor(options: {
      schema: any;
      migrations?: any;
      dbName?: string;
      jsi?: boolean;
      onSetUpError?: (error: any) => void;
    });
    unsafeResetDatabase(): Promise<void>;
  }
}

declare module '@nozbe/watermelondb/decorators' {
  export function field(columnName: string): PropertyDecorator;
  export function text(columnName: string): PropertyDecorator;
  export function date(columnName: string): PropertyDecorator;
  export function readonly(): PropertyDecorator;
  export function json(columnName: string, sanitizer: (json: any) => any): PropertyDecorator;
  export function relation(tableName: string, foreignKey: string): PropertyDecorator;
  export function children(tableName: string): PropertyDecorator;
  export function immutableRelation(tableName: string, foreignKey: string): PropertyDecorator;
  export function lazy(): PropertyDecorator;
  export function nochange(): PropertyDecorator;
  export function writer(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
}
