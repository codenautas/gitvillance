"use strict";

import { ProcedureDef, ProcedureContext, RepoPk } from './types-principal'

import { Octokit } from "@octokit/rest";

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
        action: 'update_db',
        parameters: [
        ],
        coreFunction: async function coreFunction(context: ProcedureContext, _parameters:RepoPk) {
            const {be} = context;
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
            {name: 'host', typeName:'text', defaultValue:'github.com', references:'repos'},
            {name: 'org' , typeName:'text', references:'orgs'},
        ],
        progress:true,
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:RepoPk) {
            const {be} = context;
            if (parameters.host != 'github.com') {
                throw new Error('not implemented')
            }
            const octokit = new Octokit({
                auth: be.config.gitvillance["github-token"],
                userAgent: `gitvillance v${be.config.package.version}`
            });
            var loaded = 0;
            var ref = {total:0};
            var toAwaitAllTogether:Promise<any>[] = []
            context.informProgress({idGroup:"fetching", message:'fetching', loaded:0, lengthComputable:true, total:1});
            do { 
                loaded++
            } while(await (async function(loaded:number, ref:{total:number}){
                var {data, ...result} = await octokit.rest.repos.listForOrg({
                    org: parameters.org,
                    page: loaded
                });
                if (!ref.total) {
                    ref.total = Number(result?.headers?.link?.match(/page=(\d+)>; rel="last"/)?.[1]) ?? loaded;
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
                                            SELECT * 
                                                FROM orgs o CROSS JOIN json_to_recordset($3) as x(name text, owner jsonb)
                                                WHERE o.host = $1 AND o.org = $2
                                        ) s
                                        ON s.host = t.host AND s.org = t.org AND s.name = t.repo
                                    WHEN MATCHED THEN
                                        UPDATE SET info_repo = s.owner
                                    WHEN NOT MATCHED THEN
                                        INSERT     (  host,   org,   repo, info_repo)
                                            VALUES (s.host, s.org, s.name, s.owner)
                            `, [parameters.host, parameters.org, JSON.stringify(data)]).execute();
                            context.informProgress({idGroup:"saving", loaded, lengthComputable:true, total: ref.total});
                            context.informProgress({message:"saving "+loaded});
                        })
                    )
                }
                return data?.length == 30 && result.status == 200;
            })(loaded, ref));
            context.informProgress({message:"waiting for saving"});
            await Promise.all(toAwaitAllTogether);
            return {ok:'ok'};
        }
    }
];
