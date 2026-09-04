import * as fs from 'fs';
import * as path from 'path';

/**
 * AliceLabs Universal Storage v11.1 (PRO-LEVEL)
 * - Persistent JSON storage (zero native deps)
 * - Firestore-like collection API with REAL in-RAM query engine
 *   (where / orderBy / limit now actually execute)
 * - Atomic-ish persistence on every write
 */

const DB_FILE = path.join(
    process.env.ALICE_DB_PATH || process.cwd(),
    '.alice_db.json'
);

interface Schema {
    knowledge: any[];
    files: any[];
    cron_jobs: any[];
    skills: any[];
    messages: any[];
    memory_summaries: any[];
}

let store: Schema = {
    knowledge: [],
    files: [],
    cron_jobs: [],
    skills: [],
    messages: [],
    memory_summaries: []
};

// ---------- Persistence ----------

export function initDb() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const content = fs.readFileSync(DB_FILE, 'utf-8');
            const data = JSON.parse(content);
            store = { ...store, ...data };
            console.log('✅ Local Database LOADED from .alice_db.json');
        }
    } catch (e) {
        console.warn('⚠️ Could not load database file, using in-memory only');
    }
}

export function persist() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
        // Fail silently in environments like Vercel where Disk is read-only
    }
}

// Ensure loaded at import
initDb();

// ---------- Query engine ----------

type WhereOp = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'contains';
type SortDir = 'asc' | 'desc';

interface WhereClause { field: string; op: WhereOp; value: any; }
interface OrderClause { field: string; dir: SortDir; }

function matches(item: any, c: WhereClause): boolean {
    const v = item?.[c.field];
    switch (c.op) {
        case '==': return v === c.value;
        case '!=': return v !== c.value;
        case '>': return v > c.value;
        case '>=': return v >= c.value;
        case '<': return v < c.value;
        case '<=': return v <= c.value;
        case 'in': return Array.isArray(c.value) && c.value.includes(v);
        case 'contains':
            return typeof v === 'string' && v.includes(String(c.value));
        default: return false;
    }
}

export class Collection {
    private colName: keyof Schema;
    private wheres: WhereClause[] = [];
    private orders: OrderClause[] = [];
    private limitN: number | null = null;

    constructor(name: keyof Schema) {
        this.colName = name;
    }

    private clone(): Collection {
        const c = new Collection(this.colName);
        c.wheres = [...this.wheres];
        c.orders = [...this.orders];
        c.limitN = this.limitN;
        return c;
    }

    where(field: string, op: WhereOp, value: any): Collection {
        const c = this.clone();
        c.wheres.push({ field, op, value });
        return c;
    }

    orderBy(field: string, dir: SortDir = 'asc'): Collection {
        const c = this.clone();
        c.orders.push({ field, dir });
        return c;
    }

    limit(n: number): Collection {
        const c = this.clone();
        c.limitN = n;
        return c;
    }

    private execute(): any[] {
        let rows = [...store[this.colName]];

        for (const w of this.wheres) rows = rows.filter(r => matches(r, w));

        for (const o of [...this.orders].reverse()) {
            rows.sort((a, b) => {
                const av = a?.[o.field];
                const bv = b?.[o.field];
                let cmp = 0;
                if (av === bv) cmp = 0;
                else if (av === undefined) cmp = 1;
                else if (bv === undefined) cmp = -1;
                else if (av < bv) cmp = -1;
                else cmp = 1;
                return o.dir === 'desc' ? -cmp : cmp;
            });
        }

        if (this.limitN !== null) rows = rows.slice(0, this.limitN);
        return rows;
    }

    // ---------- Reads ----------

    async get() {
        const rows = this.execute();
        return {
            docs: rows.map(item => ({
                id: item.id,
                exists: true,
                data: () => item
            })),
            size: rows.length,
            empty: rows.length === 0
        };
    }

    // ---------- Writes ----------

    async add(data: any) {
        const id = `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const newItem = { id, ...data };
        store[this.colName].push(newItem);
        persist();
        return { id };
    }

    doc(id: string) {
        return {
            get: async () => {
                const item = store[this.colName].find(i => i.id === id);
                return { exists: !!item, data: () => item || null };
            },
            delete: async () => {
                store[this.colName] = store[this.colName].filter(i => i.id !== id);
                persist();
            },
            update: async (updates: any) => {
                const idx = store[this.colName].findIndex(i => i.id === id);
                if (idx !== -1) {
                    store[this.colName][idx] = { ...store[this.colName][idx], ...updates };
                    persist();
                }
            },
            set: async (data: any) => {
                const idx = store[this.colName].findIndex(i => i.id === id);
                if (idx !== -1) {
                    Object.assign(store[this.colName][idx], data);
                } else {
                    store[this.colName].push({ id, ...data });
                }
                persist();
            }
        };
    }
}

export const db = {
    collection: (name: keyof Schema) => new Collection(name)
};

export const getIsMock = () => false;

/**
 * OpenGravity v10 — PRO Tool Integration
 */
export async function saveFile(name: string, folder: string, content: string): Promise<string> {
    try {
        const fullPath = path.join(process.cwd(), folder, name);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf-8');

        // Registrar en la DB local
        await db.collection('files').add({
            name,
            path: folder,
            fullPath,
            size: content.length,
            createdAt: new Date().toISOString()
        });

        return `✓ Archivo '${name}' guardado en ${folder}`;
    } catch (e: any) {
        throw new Error(`Error al guardar archivo: ${e.message}`);
    }
}

export async function saveKnowledge(userId: string, data: any): Promise<void> {
    await db.collection('knowledge').add({
        ...data,
        userId,
        createdAt: new Date().toISOString()
    });
}
