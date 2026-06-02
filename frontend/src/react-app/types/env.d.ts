interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID_WEB?: string;
  readonly VITE_GOOGLE_CLIENT_ID_ANDROID?: string;
  readonly VITE_GOOGLE_CLIENT_ID_IOS?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
  readonly VITE_REACT_APP_BACKEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __FUEL_PRO_GOOGLE_CLIENT_ID?: string;
}

declare module '@capacitor/share' {
  export const Share: {
    share(options: {
      title?: string;
      text?: string;
      url?: string;
      files?: string[];
      dialogTitle?: string;
    }): Promise<void>;
  };
}

declare module 'drizzle-orm' {
  export const eq: any;
  export const and: any;
  export const or: any;
  export const desc: any;
  export const asc: any;
  export const sql: any;
  export const isNull: any;
  export const gte: any;
  export const lte: any;
  export const inArray: any;
  export const relations: any;
  const drizzleOrm: any;
  export default drizzleOrm;
}

declare module 'drizzle-orm/mysql2' {
  export function drizzle<T = any>(...args: any[]): any;
}

declare module 'drizzle-orm/mysql-core' {
  export const mysqlTable: any;
  export const mysqlEnum: any;
  export const varchar: any;
  export const text: any;
  export const timestamp: any;
  export const int: any;
  export const bigint: any;
  export const decimal: any;
  export const boolean: any;
  export const json: any;
  export const serial: any;
  export const index: any;
  export const uniqueIndex: any;
}
