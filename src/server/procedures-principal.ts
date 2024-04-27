"use strict";

import { ProcedureDef, ProcedureContext } from './types-principal'
import * as Path from 'path'
import {promises as fs} from 'fs'
import { simpleGit } from 'simple-git'
import { expected } from 'cast-error'

async function pathExists(path:string){
    try {
        await fs.stat(path);
        return true;
    } catch (err) {
        var error = expected(err);
        if (error.code == 'ENOENT') return false;
        throw err;
    }
}

export const ProceduresPrincipal:ProcedureDef[] = [
    {
        action: 'repo_download',
        parameters: [
            {name: 'host', typeName:'text'},
            {name: 'org' , typeName:'text'},
            {name: 'repo', typeName:'text'},
        ],
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:{host:string, org:string, repo:string}) {
            const {be} = context;
            const {host, org, repo} = parameters;
            const url = new URL(Path.posix.join(org, repo), host)
            const path = Path.join(be.config.gitvillance["local-repo"], url.hostname, org, repo)
            if (await pathExists(path)) {
                const git = simpleGit(path);
                return (await git.pull()).summary;
            } else {
                const git = simpleGit();
                await fs.mkdir(path, {recursive:true});
                return await git.clone(url.toString(), path);
            }
        }
    }
];
