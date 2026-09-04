import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConfigured = Boolean(
  rawUrl &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('placeholder') &&
  rawKey &&
  !rawKey.includes('placeholder')
);

// Initial Mock Seed Data
const INITIAL_USERS = [
  {
    id: 'user-admin-001',
    email: 'admin@msugensan.edu.ph',
    full_name: 'Admin User',
    role: 'admin',
    is_active: true,
  },
  {
    id: 'user-faculty-001',
    email: 'faculty@msugensan.edu.ph',
    full_name: 'Engr. Juan Dela Cruz',
    role: 'end_user',
    is_active: true,
  },
];

const INITIAL_PRS = [
  {
    pr_no: 'PR-2026-0001',
    purpose: 'IT Equipment and Desktop Workstations for Computer Science Laboratory',
    total: 485000,
    current_stage: 'po_issued',
    department: 'College of Science and Mathematics',
    user_id: 'user-faculty-001',
    printed_name: 'Engr. Juan Dela Cruz',
    designation: 'Department Chairperson',
    section: 'Computer Science Department',
    pr_date: '2026-02-15',
    created_at: '2026-02-15T08:30:00.000Z',
    updated_at: '2026-02-25T11:00:00.000Z',
    sai_no: 'SAI-2026-014',
    alobs_no: 'ALOBS-2026-089',
  },
  {
    pr_no: 'PR-2026-0002',
    purpose: 'Laboratory Reagents and Borosilicate Glassware for Chemistry Department',
    total: 178500,
    current_stage: 'budget_office',
    department: 'College of Natural Sciences',
    user_id: 'user-faculty-001',
    printed_name: 'Dr. Maria Santos',
    designation: 'Laboratory Custodian',
    section: 'Chemistry Laboratory',
    pr_date: '2026-02-28',
    created_at: '2026-02-28T09:15:00.000Z',
    updated_at: '2026-02-28T09:15:00.000Z',
    sai_no: 'SAI-2026-022',
    alobs_no: 'ALOBS-2026-112',
  },
  {
    pr_no: 'PR-2026-0003',
    purpose: 'Procurement of Continuous Ink Cartridges and A4 Bond Papers for University Records',
    total: 54200,
    current_stage: 'completed',
    department: 'Office of the Registrar',
    user_id: 'user-faculty-001',
    printed_name: 'Mr. Roberto Gomez',
    designation: 'Administrative Officer',
    section: 'Records & Archives Section',
    pr_date: '2026-01-20',
    created_at: '2026-01-20T10:00:00.000Z',
    updated_at: '2026-02-05T16:00:00.000Z',
    sai_no: 'SAI-2026-005',
    alobs_no: 'ALOBS-2026-015',
  },
];

const INITIAL_ITEMS = [
  {
    id: 'item-1',
    pr_no: 'PR-2026-0001',
    item_description: 'High-Performance Workstation (Intel Core i7 14th Gen, 32GB RAM, 1TB NVMe)',
    quantity: 10,
    unit: 'units',
    unit_cost: 45000,
    total_cost: 450000,
  },
  {
    id: 'item-2',
    pr_no: 'PR-2026-0001',
    item_description: '24-inch IPS Monitor 100Hz Full HD with DisplayPort/HDMI',
    quantity: 10,
    unit: 'units',
    unit_cost: 3500,
    total_cost: 35000,
  },
  {
    id: 'item-3',
    pr_no: 'PR-2026-0002',
    item_description: 'Analytical Grade Hydrochloric Acid (HCl 37%) 2.5L Glass Bottle',
    quantity: 6,
    unit: 'bottles',
    unit_cost: 4250,
    total_cost: 25500,
  },
  {
    id: 'item-4',
    pr_no: 'PR-2026-0002',
    item_description: 'Borosilicate Glass Beaker Assorted Set (100ml, 250ml, 500ml, 1000ml)',
    quantity: 15,
    unit: 'sets',
    unit_cost: 10200,
    total_cost: 153000,
  },
];

const INITIAL_STAGES = [
  {
    id: 'stage-1',
    pr_no: 'PR-2026-0001',
    stage_key: 'draft',
    stage_name: 'Draft',
    status: 'completed',
    completed_at: '2026-02-15T08:30:00.000Z',
    notes: 'Purchase request created and items verified',
    assigned_to: 'Engr. Juan Dela Cruz',
  },
  {
    id: 'stage-2',
    pr_no: 'PR-2026-0001',
    stage_key: 'pending',
    stage_name: 'Pending Endorsement',
    status: 'completed',
    completed_at: '2026-02-16T10:00:00.000Z',
    notes: 'Endorsed by College Dean',
    assigned_to: 'Dean Office',
  },
  {
    id: 'stage-3',
    pr_no: 'PR-2026-0001',
    stage_key: 'budget_office',
    stage_name: 'Budget Office Certification',
    status: 'completed',
    completed_at: '2026-02-18T14:20:00.000Z',
    notes: 'Funds certified available under RA 12009 GAA allocation',
    assigned_to: 'Budget Officer',
  },
  {
    id: 'stage-4',
    pr_no: 'PR-2026-0001',
    stage_key: 'po_issued',
    stage_name: 'Purchase Order Issued',
    status: 'completed',
    completed_at: '2026-02-25T11:00:00.000Z',
    notes: 'PO #2026-042 officially transmitted to supplier',
    assigned_to: 'Procurement Office',
  },
];

const INITIAL_INQUIRIES = [
  {
    id: 'inq-1',
    user_id: 'user-faculty-001',
    user_name: 'Engr. Juan Dela Cruz',
    user_department: 'CSM',
    pr_no: 'PR-2026-0001',
    user_message: 'What are the competitive bidding requirements under RA 12009 for IT Equipment?',
    bot_response: 'Under RA 12009 (New Government Procurement Act), procurement projects exceeding the designated small-value threshold require Competitive Bidding with transparent electronic posting and standard qualification criteria.',
    inquiry_type: 'ra_12009',
    created_at: '2026-02-26T14:30:00.000Z',
    updated_at: '2026-02-26T14:30:00.000Z',
  },
];

// Memory store for tables
const memoryStore: Record<string, any[]> = {
  users: [...INITIAL_USERS],
  purchase_requests: [...INITIAL_PRS],
  pr_items: [...INITIAL_ITEMS],
  pr_stages_completed: [...INITIAL_STAGES],
  monitor_inquiries: [...INITIAL_INQUIRIES],
  chat_sessions: [],
  chat_messages: [],
  document_chunks: [],
};

// Helper to get table data (backed by localStorage in browser)
function getTableData(tableName: string): any[] {
  if (!isBrowser) {
    return memoryStore[tableName] || [];
  }
  const key = `procurematesu_table_${tableName}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = memoryStore[tableName] || [];
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return memoryStore[tableName] || [];
  }
}

function setTableData(tableName: string, data: any[]): void {
  memoryStore[tableName] = data;
  if (isBrowser) {
    try {
      localStorage.setItem(`procurematesu_table_${tableName}`, JSON.stringify(data));
    } catch {
      // ignore
    }
  }
}

function getStoredUser(): any | null {
  if (!isBrowser) {
    return memoryStore['current_user'] || null;
  }
  try {
    const raw = localStorage.getItem('procurematesu_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: any | null): void {
  memoryStore['current_user'] = user;
  if (isBrowser) {
    try {
      if (user) {
        localStorage.setItem('procurematesu_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('procurematesu_current_user');
      }
    } catch {
      // ignore
    }
  }
}

// Chainable mock query builder
class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(row: any) => boolean> = [];
  private orderFn?: (a: any, b: any) => number;
  private limitCount?: number;
  private isSingle = false;
  private selectCols = '*';
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns = '*'): this {
    this.selectCols = columns;
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  ilike(column: string, pattern: string): this {
    const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
    this.filters.push((row) => {
      const val = String(row[column] || '').toLowerCase();
      return val.includes(cleanPattern);
    });
    return this;
  }

  textSearch(column: string, query: string): this {
    const terms = query.split('&').map((t) => t.trim().toLowerCase()).filter(Boolean);
    this.filters.push((row) => {
      const val = String(row[column] || '').toLowerCase();
      return terms.some((term) => val.includes(term));
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const ascending = options?.ascending !== false;
    this.orderFn = (a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (valA < valB) return ascending ? -1 : 1;
      if (valA > valB) return ascending ? 1 : -1;
      return 0;
    };
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): this {
    this.isSingle = true;
    return this;
  }

  insert(data: any): this {
    this.operation = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any): this {
    this.operation = 'update';
    this.payload = data;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      let currentTable = [...getTableData(this.tableName)];
      let resultData: any = null;
      let error: any = null;

      if (this.operation === 'insert') {
        const records = Array.isArray(this.payload) ? this.payload : [this.payload];
        const newRecords = records.map((item, idx) => ({
          id: item.id || `rec_${Date.now()}_${idx}`,
          created_at: item.created_at || new Date().toISOString(),
          ...item,
        }));
        currentTable = [...newRecords, ...currentTable];
        setTableData(this.tableName, currentTable);
        resultData = this.isSingle ? newRecords[0] : newRecords;
      } else if (this.operation === 'update') {
        currentTable = currentTable.map((row) => {
          const match = this.filters.every((f) => f(row));
          if (match) {
            return { ...row, ...this.payload, updated_at: new Date().toISOString() };
          }
          return row;
        });
        setTableData(this.tableName, currentTable);
        resultData = this.payload;
      } else if (this.operation === 'delete') {
        currentTable = currentTable.filter((row) => !this.filters.every((f) => f(row)));
        setTableData(this.tableName, currentTable);
        resultData = [];
      } else {
        // select
        let filtered = currentTable.filter((row) => this.filters.every((f) => f(row)));
        if (this.orderFn) {
          filtered.sort(this.orderFn);
        }
        if (this.limitCount !== undefined) {
          filtered = filtered.slice(0, this.limitCount);
        }
        if (this.isSingle) {
          resultData = filtered.length > 0 ? filtered[0] : null;
          if (!resultData) {
            error = { code: 'PGRST116', message: 'No rows found' };
          }
        } else {
          resultData = filtered;
        }
      }

      const res = { data: resultData, error, count: Array.isArray(resultData) ? resultData.length : 1 };
      return onfulfilled ? onfulfilled(res) : (res as any);
    } catch (err: any) {
      const res = { data: null, error: err };
      return onrejected ? onrejected(err) : onfulfilled ? onfulfilled(res) : (res as any);
    }
  }
}

function createMockSupabaseClient() {
  return {
    auth: {
      async getUser() {
        const user = getStoredUser();
        return { data: { user }, error: null };
      },
      async signInWithPassword({ email }: { email: string; password?: string }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const role = cleanEmail.includes('admin') ? 'admin' : 'end_user';
        const namePart = cleanEmail.split('@')[0];
        const fullName = namePart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const user = {
          id: `usr_${namePart}`,
          email: cleanEmail,
          role,
          user_metadata: { full_name: fullName || 'MSU User' },
        };

        // ensure user exists in users table
        const users = getTableData('users');
        const existingIdx = users.findIndex((u) => u.id === user.id || u.email === cleanEmail);
        if (existingIdx >= 0) {
          users[existingIdx] = { ...users[existingIdx], role };
        } else {
          users.push({ ...user, is_active: true });
        }
        setTableData('users', users);

        setStoredUser(user);
        return {
          data: {
            user,
            session: { user, access_token: 'mock_jwt_token' },
          },
          error: null,
        };
      },
      async signOut() {
        setStoredUser(null);
        return { error: null };
      },
      async updateUser(attributes: any) {
        const user = getStoredUser();
        if (user) {
          const updated = { ...user, ...attributes };
          setStoredUser(updated);
          return { data: { user: updated }, error: null };
        }
        return { data: { user: null }, error: { message: 'Not logged in' } };
      },
    },
    from(tableName: string) {
      return new MockQueryBuilder(tableName);
    },
    async rpc(name: string, _args?: any) {
      return { data: [], error: null };
    },
  };
}

export const createClient = () => {
  if (isConfigured) {
    try {
      return createSupabaseClient(rawUrl!, rawKey!);
    } catch (err) {
      console.warn('⚠️ Supabase client initialization failed, using mock client:', err);
      return createMockSupabaseClient() as any;
    }
  }
  return createMockSupabaseClient() as any;
};

export const supabase = createClient();
