import { AppPrincipal } from "./app-principal";

// exposes APIs from this package
export * from "backend-plus";
export * from "pg-promise-strict";

declare module "backend-plus"{
    interface Context {
        forDump?:boolean
        es:{admin:boolean, oficina:boolean, puedePares:boolean}
    }
    interface ProcedureContext {
        be:AppPrincipal
    }
    interface ClientSetup {
        tableData:Record<string, Record<string, Record<string, any>>> // tableName -> json(pk) -> fieldName -> value
    }
    interface User {
        usuario:string
        rol:string
    }
    interface AppConfigBin {
        git: {
            cmd: string
        }
    }
    interface AppConfig {
        gitvillance: {
            "local-repo": string
        }
    }
}

export type Constructor<T> = new(...args: any[]) => T;