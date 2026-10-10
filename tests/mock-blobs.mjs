// In-memory adapter for local tests only. No Netlify network access.
const stores = new Map();
export const getStore = (name) => {
  if (!stores.has(name)) stores.set(name,new Map());
  const data=stores.get(name);
  return {
    async setJSON(key,value) { data.set(key,structuredClone(value)); },
    async get(key) { return structuredClone(data.get(key) ?? null); },
    async list({prefix}) {return {blobs:[...data.keys()].filter(key=>key.startsWith(prefix)).map(key=>({key}))};},
    async set(key,value) {data.set(key,value);}
  };
};
