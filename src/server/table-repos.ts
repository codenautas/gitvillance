"use strict";

import {TableDefinition, TableContext} from "./types-principal";

var mainPrimaryKey = ['host', 'org', 'repo']

export function reposSource(params:{main?:boolean, vault?:boolean, editable?:boolean}){
    var def = {
        editable: params.editable ?? params.main,
        fields: [
            {name:'host'             , typeName:'text'     , nullable:false              },
            {name:'org'              , typeName:'text'     , nullable:false              },
            {name:'repo'             , typeName:'text'     , nullable:false              },
            {name:'guard'            , typeName:'boolean'  , inTable: params.main        },
            {name:'fetched'          , typeName:'timestamp', inTable: params.vault       },
            {name:'fetching'         , typeName:'timestamp', inTable: params.vault       },
            {name:'fetch_result'     , typeName:'text'     , inTable: params.vault       },
        ],
        primaryKey: mainPrimaryKey,
    } satisfies Partial<TableDefinition>;
    return def;
}

export function repos(_context:TableContext):TableDefinition{
    return {
        ...reposSource({
            main:true
        }),
        name: 'repos',
        title: 'repositories',
        foreignKeys:[
            {references: 'hosts'      , fields: ['host']},
            {references: 'repos_vault', fields: mainPrimaryKey},
        ],
        detailTables:[
            {table:'modules_ver', fields:mainPrimaryKey, abr:'V'}
        ]
    }
}

export function repos_vault(context:TableContext):TableDefinition{
    return {
        ...reposSource({
            vault:true,
            editable: context.forDump
        }),
        name:'repos_vault',
        title: 'repository vault',
    };
}
