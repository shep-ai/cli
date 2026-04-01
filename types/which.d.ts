declare module 'which' {
  interface WhichOptions {
    nothrow?: boolean;
    all?: boolean;
    path?: string;
    pathExt?: string;
  }

  function which(cmd: string, options: { nothrow: true } & WhichOptions): Promise<string | null>;
  function which(cmd: string, options?: WhichOptions): Promise<string>;

  export default which;
}
