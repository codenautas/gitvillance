"use strict";

import {TableDefinition, TableContext, FieldDefinition} from "./types-principal";

export const modulesPk = ['module']

export const modulesPkFields = [
    {name:'module'           , typeName:'text'    , nullable:false              },
] satisfies FieldDefinition[]

export function modulesSource(params:{main?:boolean, version?:boolean, readonly?:boolean}){
    var def = {
        editable: !params.readonly && params.main,
        fields: [
            ...modulesPkFields,
            {name:'version'          , typeName:'text'    , nullable:!params.version    },
            {name:'guard'            , typeName:'boolean' , inTable: params.main        },
            {name:'fetched'          , typeName:'boolean' , inTable: params.version     },
            {name:'info'             , typeName:'boolean' , inTable: params.version     },
        ],
    } satisfies Partial<TableDefinition>;
    return def;
}

export function modules(_context:TableContext):TableDefinition{
    return {
        ...modulesSource({
            main:true
        }),
        name: 'modules',
        title: 'modules',
        primaryKey: modulesPk,
        detailTables:[
            {table:'module_version', fields:modulesPk, abr:'V'}
        ]
    }
}

export function module_version(_context:TableContext):TableDefinition{
    return {
        ...modulesSource({
            version:true
        }),
        name:'module_version',
        title: 'module versions',
        primaryKey: [...modulesPk, 'version'],
    };
}
