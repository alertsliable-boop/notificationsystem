import { Pool } from 'pg';
import { nanoid } from 'nanoid';

// PostgreSQL Connection Pool
let globalPool: Pool | null = null;

function getPool(): Pool {
  if (!globalPool) {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    globalPool = new Pool({
      connectionString,
      ssl: connectionString && !connectionString.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return globalPool;
}

interface Filter {
  type: 'eq' | 'neq' | 'in' | 'is' | 'gt' | 'gte' | 'lt' | 'lte' | 'ilike';
  column: string;
  value: any;
}

interface OrderBy {
  column: string;
  ascending: boolean;
}

class QueryBuilder<T = any> {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectCols: string = '*';
  private selectOptions?: { count?: 'exact'; head?: boolean };
  private insertData: any = null;
  private updateData: any = null;
  private filters: Filter[] = [];
  private orderClauses: OrderBy[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(cols: string = '*', options?: { count?: 'exact'; head?: boolean }): QueryBuilder<any> {
    this.selectCols = cols;
    this.selectOptions = options;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data: any, options?: any) {
    this.action = 'upsert';
    this.insertData = data;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, value: any[]) {
    this.filters.push({ type: 'in', column, value });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ type: 'ilike', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderClauses.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitCount = 1;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.limitCount = 1;
    return this;
  }

  // Parse nested relations from selectCols string
  private parseRelations(selectStr: string) {
    const relations: Array<{ alias: string; table: string; fields: string }> = [];
    const relationRegex = /([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\(([^)]*)\)/g;
    let match;
    while ((match = relationRegex.exec(selectStr)) !== null) {
      relations.push({
        alias: match[1],
        table: match[2],
        fields: match[3].trim() || '*',
      });
    }
    return relations;
  }

  private getColumnSql(col: string, op: string, valExpr: string): string {
    if (col.includes('.')) {
      const [rel, field] = col.split('.');
      if (this.tableName === 'SmsMessage' && rel.toLowerCase() === 'notification') {
        return `"notificationId" IN (SELECT "id" FROM "Notification" WHERE "${field}" ${op} ${valExpr})`;
      }
      if (this.tableName === 'Notification' && rel.toLowerCase() === 'endpoint') {
        return `"endpointId" IN (SELECT "id" FROM "InboundEndpoint" WHERE "${field}" ${op} ${valExpr})`;
      }
      if (this.tableName === 'EndpointRecipient' && rel.toLowerCase() === 'recipient') {
        return `"recipientId" IN (SELECT "id" FROM "PhoneRecipient" WHERE "${field}" ${op} ${valExpr})`;
      }
    }
    return `"${col}" ${op} ${valExpr}`;
  }

  private buildWhereClause(params: any[]): string {
    if (this.filters.length === 0) return '';
    const clauses = this.filters.map((f) => {
      if (f.type === 'eq') {
        if (f.value === null) {
          if (f.column.includes('.')) {
            const [rel, field] = f.column.split('.');
            if (this.tableName === 'SmsMessage' && rel.toLowerCase() === 'notification') {
              return `"notificationId" IN (SELECT "id" FROM "Notification" WHERE "${field}" IS NULL)`;
            }
          }
          return `"${f.column}" IS NULL`;
        }
        params.push(f.value);
        return this.getColumnSql(f.column, '=', `$${params.length}`);
      } else if (f.type === 'neq') {
        if (f.value === null) {
          if (f.column.includes('.')) {
            const [rel, field] = f.column.split('.');
            if (this.tableName === 'SmsMessage' && rel.toLowerCase() === 'notification') {
              return `"notificationId" IN (SELECT "id" FROM "Notification" WHERE "${field}" IS NOT NULL)`;
            }
          }
          return `"${f.column}" IS NOT NULL`;
        }
        params.push(f.value);
        return this.getColumnSql(f.column, '!=', `$${params.length}`);
      } else if (f.type === 'in') {
        if (!Array.isArray(f.value) || f.value.length === 0) {
          return '1=0';
        }
        const placeholders = f.value.map((v: any) => {
          params.push(v);
          return `$${params.length}`;
        });
        return this.getColumnSql(f.column, 'IN', `(${placeholders.join(', ')})`);
      } else if (f.type === 'is') {
        return this.getColumnSql(f.column, 'IS', f.value === null ? 'NULL' : f.value);
      } else if (f.type === 'gt') {
        params.push(f.value);
        return this.getColumnSql(f.column, '>', `$${params.length}`);
      } else if (f.type === 'gte') {
        params.push(f.value);
        return this.getColumnSql(f.column, '>=', `$${params.length}`);
      } else if (f.type === 'lt') {
        params.push(f.value);
        return this.getColumnSql(f.column, '<', `$${params.length}`);
      } else if (f.type === 'lte') {
        params.push(f.value);
        return this.getColumnSql(f.column, '<=', `$${params.length}`);
      } else if (f.type === 'ilike') {
        params.push(f.value);
        return this.getColumnSql(f.column, 'ILIKE', `$${params.length}`);
      }
      return '1=1';
    });
    return `WHERE ${clauses.join(' AND ')}`;
  }

  private buildOrderClause(): string {
    if (this.orderClauses.length === 0) return '';
    const orders = this.orderClauses.map(
      (o) => `"${o.column}" ${o.ascending ? 'ASC' : 'DESC'}`
    );
    return `ORDER BY ${orders.join(', ')}`;
  }

  // Populate relations for query results
  private async populateRelations(pool: Pool, rows: any[], relations: Array<{ alias: string; table: string; fields: string }>) {
    if (rows.length === 0 || relations.length === 0) return rows;

    for (const rel of relations) {
      const { alias, table, fields } = rel;
      
      // Known relationships
      // 1. One-to-Many or Many-to-One
      if (table === 'Company' && (this.tableName === 'Membership' || this.tableName === 'InboundEndpoint' || this.tableName === 'User')) {
        const companyIds = Array.from(new Set(rows.map(r => r.companyId).filter(Boolean)));
        if (companyIds.length > 0) {
          const compRes = await pool.query(`SELECT * FROM "Company" WHERE "id" = ANY($1)`, [companyIds]);
          const compMap = new Map(compRes.rows.map(c => [c.id, c]));
          rows.forEach(r => {
            r[alias] = compMap.get(r.companyId) || null;
          });
        } else {
          rows.forEach(r => { r[alias] = null; });
        }
      } else if (table === 'SubscriptionPlan' && this.tableName === 'CompanySubscription') {
        const planIds = Array.from(new Set(rows.map(r => r.planId).filter(Boolean)));
        if (planIds.length > 0) {
          const planRes = await pool.query(`SELECT * FROM "SubscriptionPlan" WHERE "id" = ANY($1)`, [planIds]);
          const planMap = new Map(planRes.rows.map(p => [p.id, p]));
          rows.forEach(r => {
            r[alias] = planMap.get(r.planId) || null;
          });
        } else {
          rows.forEach(r => { r[alias] = null; });
        }
      } else if (table === 'Membership' && this.tableName === 'User') {
        const userIds = rows.map(r => r.id).filter(Boolean);
        if (userIds.length > 0) {
          const memRes = await pool.query(`SELECT * FROM "Membership" WHERE "userId" = ANY($1)`, [userIds]);
          rows.forEach(r => {
            r[alias] = memRes.rows.filter(m => m.userId === r.id);
          });
        }
      } else if (table === 'User' && this.tableName === 'Membership') {
        const userIds = Array.from(new Set(rows.map(r => r.userId).filter(Boolean)));
        if (userIds.length > 0) {
          const uRes = await pool.query(`SELECT id, name, email, "createdAt" FROM "User" WHERE "id" = ANY($1)`, [userIds]);
          const uMap = new Map(uRes.rows.map(u => [u.id, u]));
          rows.forEach(r => {
            r[alias] = uMap.get(r.userId) || null;
          });
        }
      } else if (table === 'Domain' && this.tableName === 'InboundEndpoint') {
        const domainIds = Array.from(new Set(rows.map(r => r.domainId).filter(Boolean)));
        if (domainIds.length > 0) {
          const dRes = await pool.query(`SELECT * FROM "Domain" WHERE "id" = ANY($1)`, [domainIds]);
          const dMap = new Map(dRes.rows.map(d => [d.id, d]));
          rows.forEach(r => {
            r[alias] = dMap.get(r.domainId) || null;
          });
        } else {
          rows.forEach(r => { r[alias] = null; });
        }
      } else if (table === 'Customer' && (this.tableName === 'InboundEndpoint' || this.tableName === 'Site')) {
        const custIds = Array.from(new Set(rows.map(r => r.customerId).filter(Boolean)));
        if (custIds.length > 0) {
          const cRes = await pool.query(`SELECT * FROM "Customer" WHERE "id" = ANY($1)`, [custIds]);
          const cMap = new Map(cRes.rows.map(c => [c.id, c]));
          rows.forEach(r => {
            r[alias] = cMap.get(r.customerId) || null;
          });
        } else {
          rows.forEach(r => { r[alias] = null; });
        }
      } else if (table === 'Site' && (this.tableName === 'InboundEndpoint' || this.tableName === 'Customer')) {
        if (this.tableName === 'InboundEndpoint') {
          const siteIds = Array.from(new Set(rows.map(r => r.siteId).filter(Boolean)));
          if (siteIds.length > 0) {
            const sRes = await pool.query(`SELECT * FROM "Site" WHERE "id" = ANY($1)`, [siteIds]);
            const sMap = new Map(sRes.rows.map(s => [s.id, s]));
            rows.forEach(r => {
              r[alias] = sMap.get(r.siteId) || null;
            });
          } else {
            rows.forEach(r => { r[alias] = null; });
          }
        } else if (this.tableName === 'Customer') {
          const custIds = rows.map(r => r.id).filter(Boolean);
          if (custIds.length > 0) {
            const sRes = await pool.query(`SELECT * FROM "Site" WHERE "customerId" = ANY($1)`, [custIds]);
            rows.forEach(r => {
              r[alias] = sRes.rows.filter(s => s.customerId === r.id);
            });
          }
        }
      } else if (table === 'InboundEndpoint' && (this.tableName === 'Customer' || this.tableName === 'Site')) {
        const parentCol = this.tableName === 'Customer' ? 'customerId' : 'siteId';
        const parentIds = rows.map(r => r.id).filter(Boolean);
        if (parentIds.length > 0) {
          const epRes = await pool.query(`SELECT * FROM "InboundEndpoint" WHERE "${parentCol}" = ANY($1)`, [parentIds]);
          rows.forEach(r => {
            r[alias] = epRes.rows.filter(ep => ep[parentCol] === r.id);
          });
        }
      } else if (table === 'InboundEndpoint' && this.tableName === 'Notification') {
        const epIds = Array.from(new Set(rows.map(r => r.endpointId).filter(Boolean)));
        if (epIds.length > 0) {
          const epRes = await pool.query(`SELECT * FROM "InboundEndpoint" WHERE "id" = ANY($1)`, [epIds]);
          const dRes = await pool.query(`SELECT * FROM "Domain" WHERE "id" = ANY($1)`, [Array.from(new Set(epRes.rows.map(e => e.domainId).filter(Boolean)))]);
          const dMap = new Map(dRes.rows.map(d => [d.id, d]));
          epRes.rows.forEach(e => {
            e.domain = dMap.get(e.domainId) || null;
          });
          const epMap = new Map(epRes.rows.map(e => [e.id, e]));
          rows.forEach(r => {
            r[alias] = epMap.get(r.endpointId) || null;
          });
        } else {
          rows.forEach(r => { r[alias] = null; });
        }
      } else if (table === 'NotificationPayload' && this.tableName === 'Notification') {
        const notifIds = rows.map(r => r.id).filter(Boolean);
        if (notifIds.length > 0) {
          const pRes = await pool.query(`SELECT * FROM "NotificationPayload" WHERE "notificationId" = ANY($1)`, [notifIds]);
          const pMap = new Map(pRes.rows.map(p => [p.notificationId, p]));
          rows.forEach(r => {
            r[alias] = pMap.get(r.id) || null;
          });
        }
      } else if (table === 'SmsMessage' && this.tableName === 'Notification') {
        const notifIds = rows.map(r => r.id).filter(Boolean);
        if (notifIds.length > 0) {
          const mRes = await pool.query(`SELECT * FROM "SmsMessage" WHERE "notificationId" = ANY($1)`, [notifIds]);
          rows.forEach(r => {
            r[alias] = mRes.rows.filter(m => m.notificationId === r.id);
          });
        }
      } else if (table === 'EndpointRecipient' && this.tableName === 'InboundEndpoint') {
        const epIds = rows.map(r => r.id).filter(Boolean);
        if (epIds.length > 0) {
          const erRes = await pool.query(`SELECT * FROM "EndpointRecipient" WHERE "endpointId" = ANY($1)`, [epIds]);
          const recipientIds = Array.from(new Set(erRes.rows.map(er => er.recipientId).filter(Boolean)));
          let prMap = new Map();
          if (recipientIds.length > 0) {
            const prRes = await pool.query(`SELECT * FROM "PhoneRecipient" WHERE "id" = ANY($1)`, [recipientIds]);
            prMap = new Map(prRes.rows.map(pr => [pr.id, pr]));
          }
          erRes.rows.forEach(er => {
            er.recipient = prMap.get(er.recipientId) || null;
          });
          rows.forEach(r => {
            r[alias] = erRes.rows.filter(er => er.endpointId === r.id);
          });
        }
      } else if (table === 'EndpointRecipient' && this.tableName === 'PhoneRecipient') {
        const recIds = rows.map(r => r.id).filter(Boolean);
        if (recIds.length > 0) {
          const erRes = await pool.query(`SELECT * FROM "EndpointRecipient" WHERE "recipientId" = ANY($1)`, [recIds]);
          rows.forEach(r => {
            r[alias] = erRes.rows.filter(er => er.recipientId === r.id);
          });
        }
      } else {
        // Fallback generic relation check
        try {
          const foreignKey = `${this.tableName.toLowerCase()}Id`;
          const ids = rows.map(r => r.id).filter(Boolean);
          if (ids.length > 0) {
            const res = await pool.query(`SELECT * FROM "${table}" WHERE "${foreignKey}" = ANY($1)`, [ids]);
            rows.forEach(r => {
              r[alias] = res.rows.filter(item => item[foreignKey] === r.id);
            });
          }
        } catch {
          rows.forEach(r => { if (r[alias] === undefined) r[alias] = null; });
        }
      }
    }
    return rows;
  }

  async execute(retryCount = 0): Promise<{ data: any; count: number | null; error: any }> {
    const pool = getPool();
    const params: any[] = [];

    try {
      if (this.action === 'select') {
        const relations = this.parseRelations(this.selectCols);
        const whereClause = this.buildWhereClause(params);
        const orderClause = this.buildOrderClause();

        let count: number | null = null;
        if (this.selectOptions?.count === 'exact') {
          const countSql = `SELECT COUNT(*)::int as count FROM "${this.tableName}" ${whereClause}`;
          const countRes = await pool.query(countSql, params);
          count = countRes.rows[0]?.count ?? 0;
          if (this.selectOptions.head) {
            return { data: null, count, error: null };
          }
        }

        let limitOffset = '';
        if (this.limitCount !== undefined) {
          limitOffset += ` LIMIT ${this.limitCount}`;
        }
        if (this.offsetCount !== undefined) {
          limitOffset += ` OFFSET ${this.offsetCount}`;
        }

        const sql = `SELECT * FROM "${this.tableName}" ${whereClause} ${orderClause} ${limitOffset}`;
        const res = await pool.query(sql, params);
        let rows = res.rows;

        if (relations.length > 0) {
          rows = await this.populateRelations(pool, rows, relations);
        }

        if (this.isSingle) {
          if (rows.length === 0) {
            return { data: null, count, error: { message: 'Row not found', code: 'PGRST116' } };
          }
          return { data: rows[0], count, error: null };
        }

        if (this.isMaybeSingle) {
          return { data: rows[0] || null, count, error: null };
        }

        return { data: rows, count, error: null };

      } else if (this.action === 'insert') {
        const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
        if (items.length === 0) return { data: [], count: 0, error: null };

        const insertedRows: any[] = [];
        for (const item of items) {
          const itemCopy = { ...item };
          if (!itemCopy.id) {
            itemCopy.id = nanoid();
          }
          if (itemCopy.createdAt === undefined && this.tableName !== 'EndpointRecipient' && this.tableName !== 'Membership' && this.tableName !== 'Domain' && this.tableName !== 'Customer' && this.tableName !== 'Site' && this.tableName !== 'PhoneRecipient' && this.tableName !== 'Notification' && this.tableName !== 'NotificationPayload') {
            itemCopy.createdAt = new Date().toISOString();
          }
          if (itemCopy.updatedAt === undefined && (this.tableName === 'Company' || this.tableName === 'InboundEndpoint' || this.tableName === 'SmsMessage')) {
            itemCopy.updatedAt = new Date().toISOString();
          }

          const cols = Object.keys(itemCopy);
          const vals = Object.values(itemCopy);
          const colNames = cols.map(c => `"${c}"`).join(', ');
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

          const sql = `INSERT INTO "${this.tableName}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
          const res = await pool.query(sql, vals);
          insertedRows.push(res.rows[0]);
        }

        const data = Array.isArray(this.insertData) ? insertedRows : (this.isSingle ? insertedRows[0] : (insertedRows[0] || null));
        return { data, count: insertedRows.length, error: null };

      } else if (this.action === 'update') {
        const whereClause = this.buildWhereClause(params);
        const updateKeys = Object.keys(this.updateData);
        if (updateKeys.length === 0) return { data: null, count: 0, error: null };

        const setStatements = updateKeys.map(k => {
          params.push(this.updateData[k]);
          return `"${k}" = $${params.length}`;
        });

        if (this.tableName === 'Company' || this.tableName === 'InboundEndpoint' || this.tableName === 'SmsMessage') {
          if (!updateKeys.includes('updatedAt')) {
            setStatements.push(`"updatedAt" = NOW()`);
          }
        }

        const sql = `UPDATE "${this.tableName}" SET ${setStatements.join(', ')} ${whereClause} RETURNING *`;
        const res = await pool.query(sql, params);
        const data = this.isSingle ? (res.rows[0] || null) : res.rows;
        return { data, count: res.rowCount, error: null };

      } else if (this.action === 'delete') {
        const whereClause = this.buildWhereClause(params);
        const sql = `DELETE FROM "${this.tableName}" ${whereClause} RETURNING *`;
        const res = await pool.query(sql, params);
        return { data: res.rows, count: res.rowCount, error: null };

      } else if (this.action === 'upsert') {
        const item = Array.isArray(this.insertData) ? this.insertData[0] : this.insertData;
        const cols = Object.keys(item);
        const vals = Object.values(item);
        const colNames = cols.map(c => `"${c}"`).join(', ');
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const updateSets = cols.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');

        const sql = `INSERT INTO "${this.tableName}" (${colNames}) VALUES (${placeholders}) ON CONFLICT ("id") DO UPDATE SET ${updateSets} RETURNING *`;
        const res = await pool.query(sql, vals);
        return { data: res.rows[0], count: 1, error: null };
      }

      return { data: null, count: null, error: null };
    } catch (err: any) {
      if (retryCount < 1 && (err.message?.includes('terminat') || err.message?.includes('socket') || err.message?.includes('Connection') || err.message?.includes('timeout') || err.message?.includes('read ECONNRESET'))) {
        console.warn(`[DB Stale Connection] Retrying query on ${this.tableName}...`);
        globalPool = null;
        return this.execute(retryCount + 1);
      }
      console.error(`[DB Query Error on ${this.tableName}]`, err);
      return { data: null, count: null, error: { message: err.message, code: err.code } };
    }
  }

  // Promise support: allows `await supabase.from(...)` directly
  then(resolve: (value: { data: any; count: number | null; error: any }) => any, reject?: (reason: any) => any) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  }
};

export const getAdminClient = () => {
  return supabase;
};
