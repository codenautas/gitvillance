"use strict";

import { ProcedureDef, ProcedureContext, RepoPk } from './types-principal'

import { promises as fs} from 'fs';

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
            {name: 'org' , typeName:'text', references:'orgs'},
        ],
        progress:true,
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:RepoPk) {
            const {be} = context;
            if (parameters.host != 'github.com') {
                throw new Error('not implemented')
            }
            const {Octokit} = await import("@octokit/rest");
            const octokit = new Octokit({
                auth: be.config.gitvillance["github-tokens"]?.[parameters.org] ?? be.config.gitvillance["github-token"],
                userAgent: `gitvillance v${be.config.package.version}`
            });
            var loaded = 0;
            var ref = {total:0};
            var toAwaitAllTogether:Promise<any>[] = []
            var {row:{is_user}} = await context.client.query(
                `select is_user from orgs where host = $1 and org = $2`,
                [parameters.host, parameters.org]
            ).fetchUniqueRow()
            context.informProgress({idGroup:"fetching", message:'fetching', loaded:0, lengthComputable:true, total:1});
            do { 
                loaded++
            } while(await (async function(loaded:number, ref:{total:number}){
                var {data, ...result} = is_user ? await octokit.rest.repos.listForUser({
                    username: parameters.org,
                    page: loaded
                }) : await octokit.rest.repos.listForOrg({
                    org: parameters.org,
                    page: loaded
                });
                console.log('****************** FETCH LIST', parameters.org, loaded)
                await fs.writeFile('local-git-data-dump',JSON.stringify(data),'utf8')
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
                                            SELECT o.*, x->>'name' as "name", x as "info"
                                                FROM orgs o CROSS JOIN json_array_elements($3) as x
                                                WHERE o.host = $1 AND o.org = $2
                                        ) s
                                        ON s.host = t.host AND s.org = t.org AND s.name = t.repo
                                    WHEN MATCHED THEN
                                        UPDATE SET info_repo = s.info
                                    WHEN NOT MATCHED THEN
                                        INSERT     (  host,   org,   repo, info_repo)
                                            VALUES (s.host, s.org, s.name, s.info)
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
