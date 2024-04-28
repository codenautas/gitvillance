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
            return be.repoDownload(context.client, parameters)
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
            return be.repoParse(context.client, parameters)
        }
    }
];
