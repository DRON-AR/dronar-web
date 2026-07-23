/**
 * Fake mínimo del query builder de supabase-js para pruebas unitarias.
 * No es un mock exhaustivo del cliente real — solo soporta los métodos
 * encadenados que usa el código de este proyecto (select/eq/neq/lt/lte/
 * gte/not/in/is + maybeSingle/single, insert/update/upsert). Suficiente
 * para probar comportamiento (¿se crea la alerta o no?), no para probar
 * la sintaxis exacta de PostgREST.
 */

type Result = { data?: unknown; error?: unknown };

function fakeThenable(result: Result) {
  return {
    then: (resolve: (r: Result) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
}

function unwrapToSingle(result: Result): Result {
  if (Array.isArray(result.data)) {
    return { data: result.data[0] ?? null, error: result.error };
  }
  return result;
}

function makeQuery(result: Result) {
  const query: any = { ...fakeThenable(result) };
  const chainMethods = ["select", "eq", "neq", "lt", "lte", "gte", "not", "in", "is", "order", "limit"];
  for (const m of chainMethods) {
    query[m] = () => query;
  }
  query.maybeSingle = async () => unwrapToSingle(result);
  query.single = async () => unwrapToSingle(result);
  return query;
}

export interface FakeTableConfig {
  selectResult?: Result;
  insertResult?: Result;
  updateResult?: Result;
  upsertResult?: Result;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onUpsert?: (payload: any) => void;
}

export function makeFakeTable(config: FakeTableConfig = {}) {
  return {
    select: () => makeQuery(config.selectResult ?? { data: [], error: null }),
    insert: (payload: any) => {
      config.onInsert?.(payload);
      return fakeThenable(config.insertResult ?? { error: null });
    },
    update: (payload: any) => {
      config.onUpdate?.(payload);
      return makeQuery(config.updateResult ?? { data: null, error: null });
    },
    upsert: (payload: any, _opts?: unknown) => {
      config.onUpsert?.(payload);
      return fakeThenable(config.upsertResult ?? { error: null });
    },
  };
}

export function makeFakeSupabase(tables: Record<string, ReturnType<typeof makeFakeTable>>) {
  return {
    from: (name: string) => tables[name] ?? makeFakeTable(),
  } as any;
}
