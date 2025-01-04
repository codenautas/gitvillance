"use strict";

import { ProcedureDef, ProcedureContext, RepoPk } from './types-principal'

import { promises as fs} from 'fs';


export async function importNodefetch(){
    return await import('node-fetch');
}

type NodeFetchType = Awaited<ReturnType<typeof importNodefetch>>;

var nodeFetch: NodeFetchType["default"]

setImmediate(async function(){
    nodeFetch = (await importNodefetch()).default;
})

export const ProceduresPrincipal:ProcedureDef[] = [
    {
        action: 'repo_download',
        parameters: [
            {name: 'host', typeName:'text'},
            {name: 'org' , typeName:'text'},
            {name: 'repo', typeName:'text'},
        ],
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:RepoPk) {
            const {be} = context;
            return be.repoDownload(parameters)
        }
    },
    {
        action: 'repo_sync',
        parameters: [
            {name: 'retry_failed', typeName:'boolean', defaultValue:false}
        ],
        progress:true,
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:{retry_failed:boolean}) {
            const {be} = context;
            if (parameters.retry_failed) {
                context.informProgress({message: 'Retrying...'})
                await context.client.query(`
                    update repos_vault
	                    set fetching = null 
	                    where fetched is null and fetching is not null;
                `).execute();
            }
            return be.allPending(context)
        }
    },
    {
        action: 'repos_auto_add',
        parameters: [
        ],
        coreFunction: async function coreFunction(context: ProcedureContext, _parameters:RepoPk) {
            const {be} = context;
            return be.reposAutoAdd()
        }
    },
    {
        action: 'repo_parse',
        parameters: [
            {name: 'host', typeName:'text'},
            {name: 'org' , typeName:'text'},
            {name: 'repo', typeName:'text'},
        ],
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:RepoPk) {
            const {be} = context;
            return be.repoParse(parameters)
        }
    },
    {
        action: 'repos_list',
        parameters: [
            {name: 'host', typeName:'text', defaultValue:'github.com', references:'hosts'},
        ],
        progress:true,
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:RepoPk) {
            const {be} = context;
            if (parameters.host != 'github.com') {
                throw new Error('not implemented')
            }
            const headers = {
                Authorization: 'token ' + (be.config.gitvillance["github-token"]),
                "User-Agent": `gitvillance v${be.config.package.version}`
            };
            var loaded = 0;
            var ref = {total:0};
            var toAwaitAllTogether:Promise<any>[] = []
            context.informProgress({idGroup:"fetching", message:'fetching', loaded:0, lengthComputable:true, total:1});
            do { 
                loaded++
            } while(await (async function(loaded:number, ref:{total:number}){
                var response = await nodeFetch('https://api.github.com/user/repos?page='+loaded, {headers});
                var data = await response.json() as any[]
                console.log('****************** FETCH LIST', parameters.host, loaded)
                await fs.writeFile('local-git-data-dump',JSON.stringify(data),'utf8')
                if (!ref.total) {
                    ref.total = Number(response?.headers.get("Link")?.match(/page=(\d+)>; rel="last"/)?.[1]) ?? loaded;
                    context.informProgress({idGroup:"saving", message:"saving", loaded: 0, lengthComputable:true, total: ref.total});
                }
                context.informProgress({idGroup:"fetching", loaded, lengthComputable:true, total: ref.total});
                // await fs.appendFile('grabo-todo.json', JSON.stringify(data)+'\r\n', 'utf8');
                if (data?.length) {
                    toAwaitAllTogether.push(
                        be.inDbClient(null, async client => {
                            await client.query(`
                                MERGE INTO repos_vault t
                                    USING (
                                            SELECT $1 as host, split_part(x->>'full_name','/',1) as org, x->>'name' as "name", x as "info"
                                                FROM json_array_elements($2) as x
                                        ) s
                                        ON s.host = t.host AND s.org = t.org AND s.name = t.repo
                                    WHEN MATCHED THEN
                                        UPDATE SET info_repo = s.info
                                    WHEN NOT MATCHED THEN
                                        INSERT     (  host,   org,   repo, info_repo)
                                            VALUES (s.host, s.org, s.name, s.info)
                            `, [parameters.host, JSON.stringify(data)]).execute();
                            context.informProgress({idGroup:"saving", loaded, lengthComputable:true, total: ref.total});
                            context.informProgress({message:"saving "+loaded});
                        })
                    )
                }
                return data?.length == 30 && response.status == 200;
            })(loaded, ref));
            context.informProgress({message:"waiting for saving"});
            await Promise.all(toAwaitAllTogether);
            return {ok:'ok'};
        }
    }
];
