declare module '@deepseek-ai/cordis' {
  export interface Service<T extends string = string> {
    ctx: Context
    [key: string]: any
  }
  export class Service<T extends string = string> { constructor(ctx: any, name: T); static inject?: string[] }
  export interface Context {
    provide(name: string, value: any): void
    get<T = any>(name: string): T
    inject<T = any>(services: string[], factory: (scope: any) => T): void
    effect(fn: () => any, label?: string): void
    plugin<T>(plugin: new (...args: any[]) => any, config?: any): void
    on(event: string, fn: (...args: any[]) => void): void
    remote: { $on(event: string, fn: (...args: any[]) => void): void }
    slots: { inject(name: string, fn: () => any): void }
    locale: { register(ns: string, dicts: any): void; bind(ns: string): (key: string, params?: any) => string }
    commandUi: any
    connection: { api: { sessions: SessionsApi } }
    sessions: SessionsService
    modelDirectories: ModelDirectoryResolver
    baseUrl?: string
    logger: { warn(...args: any[]): void }
  }
  export interface SessionsApi {
    models(payload: { sessionId: any }): Promise<{ result: { ok: true; value: SessionModels } | { ok: false; error: { code: string; message: string } } }>
    selectModel(payload: { sessionId: any; provider: string; model: string; reasoningEffort?: string }): Promise<{ result: { ok: true; value: { selected: ModelSelection } } | { ok: false; error: { code: string; message: string } } }>
  }
  export interface SessionsService {
    scope(sessionId: any): any | undefined
    subagentAddress(sessionId: any): string | undefined
  }
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  export function createSnapshotStore<T>(initial: T): SnapshotStore<T>
  export interface SnapshotStore<T> {
    getSnapshot(): T
    subscribe(fn: () => void): () => void
    update(fn: (s: T) => void): void
  }
  export type SessionId = string
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  export interface SlotEntry {
    name: string
    locale?: string
    priority?: number
    key?: string
    id?: string
    order?: number
    inject?: (sessionId?: any) => any
  }
  export function register(options: SlotEntry, component: any): any
}

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  export function IconChevronDownOutline14(props: any): any
  export function IconChevronRightOutline14(props: any): any
  export function IconCheckOutline16(props: any): any
  export function IconWarningOutline16(props: any): any
  export function Toast(props: any): any
}

export interface ModelReasoningEffort { id: string; name: string; description?: string }
export interface ModelReasoning { efforts: ModelReasoningEffort[]; defaultEffort?: string }
export interface ModelCatalogModel { id: string; name: string; description?: string; reasoning?: ModelReasoning }
export interface ModelProviderGroup { id: string; name: string; models: ModelCatalogModel[] }
export interface ModelCatalogFailure { id: string; name: string; message: string }
export interface ModelSelection { provider: string; model: string; reasoningEffort?: string }
export interface SessionModels {
  current: ModelSelection | null
  routable: boolean | null
  groups: ModelProviderGroup[]
  failures: ModelCatalogFailure[]
}
export interface ModelDirectoryResolver {
  directoryFor(sessionId: any): {
    store: { getSnapshot(): any; subscribe(fn: () => void): () => void }
    load(): Promise<SessionModels>
    select(selection: ModelSelection): Promise<void>
  }
}
