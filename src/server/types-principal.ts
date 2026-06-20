import { AppPrincipal } from "./app-principal";
import * as Path from "path"

// exposes APIs from this package
export * from "backend-plus";
export * from "pg-promise-strict";

export type RepoPk = {host:string, org:string, repo:string}

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
            "github-token"?: string
            "github-tokens"?: Record<string, string>
            [hostUsername: `${string}-username`]: string | undefined
        }
    }
}

export type Constructor<T> = new(...args: any[]) => T;

export function repoKeysFromRow(localRepo: string, params: {host:string, org:string, repo:string, base_url:string, repo_path:string|null, org_repo_path:string|null}){
    var {host, org, repo, base_url, repo_path, org_repo_path} = params;
    const url = new URL(Path.posix.join(org, repo), base_url)
    const path = Path.join(localRepo, repo_path ?? url.hostname, org_repo_path ?? org, repo)
    return {base_url, url, path, arrayPk:[host, org, repo]};
}
