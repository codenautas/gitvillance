"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-principal";

export const modulesPk = ['module']

export const modulesPkFields = [
    {name:'module'           , typeName:'text'    , nullable:false              },
] satisfies FieldDefinition[]


export function modules(context:TableContext):TableDefinition{
    return {
        name: 'modules',
        title: 'modules',
        editable: context.forDump,
        fields: [
            ...modulesPkFields,
            {name:'npm_latest'      , typeName:'text'  ,      description:'registered last version'},
            {name:'npm_info'        , typeName:'jsonb' ,      allow:{select: context.forDump}},
            {name:'repository_host' , typeName:'text'  ,      title:'repo host'   },
            {name:'repository_org'  , typeName:'text'  ,      title:'repo org'    },
            {name:'repository_repo' , typeName:'text'  ,      title:'repo repo'   },
            {name:'repository_type' , typeName:'text'  ,      title:'repo type'   },
            {name:'repository_url'  , typeName:'text'  ,      title:'repo url'    },
        ],
        primaryKey: modulesPk,
        detailTables:[
            {table:'repo_modules', fields:modulesPk, abr:'v', label:'versions in dependencies'}
        ]
    }
}

