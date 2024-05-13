"use strict";

import { ProcedureDef, ProcedureContext, RepoPk } from './types-principal'

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
    }
];
