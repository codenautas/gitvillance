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
            {name:'npm_info'        , typeName:'jsonb' ,      },
            {name:'repository_host' , typeName:'text'  ,      },
            {name:'repository_org'  , typeName:'text'  ,      },
            {name:'repository_repo' , typeName:'text'  ,      },
            {name:'repository_type' , typeName:'text'  ,      },
            {name:'repository_url'  , typeName:'text'  ,      },
        ],
        primaryKey: modulesPk,
        detailTables:[
            {table:'module_version', fields:modulesPk, abr:'V'}
        ]
    }
}

