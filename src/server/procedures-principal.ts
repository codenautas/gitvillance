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
            {name: 'host', typeName:'text', defaultValue:'github'},
            {name: 'org' , typeName:'text'},
        ],
        progress:true,
        coreFunction: async function coreFunction(context: ProcedureContext, parameters:RepoPk) {
            const {be} = context;
            if (parameters.host != 'github') {
                throw new Error('not implemented')
            }
            const octokit = new Octokit({
                auth: be.config.gitvillance["github-token"],
                userAgent: `gitvillance v${be.config.package.version}`
            });
            var repos = [];
            var loaded = 0;
            var total = 1;
            do {
                context.informProgress({message:"fetching", loaded, lengthComputable:true, total});
                loaded++;
                var {data, ...result} = await octokit.rest.repos.listForOrg({
                    org: parameters.org,
                    page: loaded
                });
                if (data?.length) {
                    repos.push(...data)
                }
                total = Number(result?.headers?.link?.match(/page=(\d+)>; rel="last"/)?.[1]) ?? loaded + 1;
            } while (data?.length == 30 && result.status == 200)
            context.informProgress({message:"fetching", loaded, lengthComputable:true, total: loaded});
            // await be.inDbClient(null, async client => {
            //     
            // });
            return {...result, data: repos};
        }
    }
];
