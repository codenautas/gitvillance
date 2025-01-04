"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-principal";

import {quoteIdent, quoteLiteral} from 'pg-promise-strict';

export const reposPk = ['host', 'org', 'repo']
export const reposPkFields = [
    {name:'host'             , typeName:'text'     , nullable:false          },
    {name:'org'              , typeName:'text'     , nullable:false          },
    {name:'repo'             , typeName:'text'     , nullable:false          },
] satisfies FieldDefinition[]

export function reposSource(params:{main?:boolean, vault?:boolean, editable?:boolean}){
    var fields = ([
            ...(reposPkFields.map(field=>({...field, table:'repos_vault'}))),
            {name:'guard'            , typeName:'boolean'  , inTable: params.main  , table: 'repos' },
            {name:'visibility'       , typeName:'text'     , inTable: false        , editable:false , serverSide:true},
            {name:'private'          , typeName:'boolean'  , inTable: false        , editable:false , serverSide:true},
            {name:'description'      , typeName:'text'     , inTable: false        , editable:false , serverSide:true},
            {name:'created_at'       , typeName:'timestamp', inTable: false        , editable:false , serverSide:true},
            {name:'updated_at'       , typeName:'timestamp', inTable: false        , editable:false , serverSide:true},
            {name:'size'             , typeName:'bigint'   , inTable: false        , editable:false , serverSide:true},
            {name:'archived'         , typeName:'boolean'  , inTable: false        , editable:false , serverSide:true},
            {name:'disabled'         , typeName:'boolean'  , inTable: false        , editable:false , serverSide:true},
            {name:'fetched'          , typeName:'timestamp', inTable: params.vault , editable:false },
            {name:'fetching'         , typeName:'timestamp', inTable: params.vault , editable:false },
            {name:'fetch_result'     , typeName:'text'     , inTable: params.vault , editable:false },
            {name:'version'          , typeName:'text'     , inTable: params.vault , editable:false },
            {name:'parsed'           , typeName:'timestamp', inTable: params.vault , editable:false , description:'parsed the package.json to look for dependencies (modules)'},
            {name:'npmed'            , typeName:'timestamp', inTable: params.vault , editable:false , description:'look for the repo of each module'},
            {name:'info_repo'        , typeName:'jsonb'    , inTable: params.vault , editable:false }
        ] as FieldDefinition[])
    var def = {
        editable: true,
        fields,
        primaryKey: reposPk,
        detailTables:[
            {table:'repo_modules', fields:reposPk, abr:'D', label:'dependencies'},
            {table:'modules'     , fields:[
                {source:'host',target:'repository_host'},{source:'org',target:'repository_org'},{source:'repo',target:'repository_repo'}
            ], abr:'M', label:'modules'}
        ],
        sql: {
            isTable:true,
            from:`(SELECT ${fields.map(({name, typeName, serverSide})=>{
                    if (serverSide) {   
                        return `(info_repo ->> ${quoteLiteral(name)})::${typeName} as ${quoteIdent(name)}` 
                    } else {
                        return name
                    }
                }).join(', ')}
                FROM repos r RIGHT JOIN repos_vault v USING (host, org, repo)
                ORDER BY host, org, repo
            )`,            
            otherTableDefs:{
                repos:{
                    sql:{
                        insertIfNotUpdate:true,
                    }
                }
            }
        }
    } satisfies Partial<TableDefinition>;
    return def;
}

export function repos(_context:TableContext):TableDefinition{
    var def:TableDefinition = {
        ...reposSource({
            main:true,
            vault:false
        }),
        name: 'repos',
        title: 'repositories',
        foreignKeys:[
            {references: 'hosts'      , fields: ['host']},
            {references: 'repos_vault', fields: reposPk, onDelete:'cascade'},
        ]
    }
    return def;
}

export function repos_vault(context:TableContext):TableDefinition{
    return {
        ...reposSource({
            main:false,
            vault:true,
            editable: context.forDump
        }),
        name:'repos_vault',
        title: 'repository vault',
    };
}
