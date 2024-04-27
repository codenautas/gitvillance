"use strict";

import {TableDefinition, TableContext} from "./types-principal";

var mainPrimaryKey = ['module']

export function modulesSource(params:{main?:boolean, version?:boolean, readonly?:boolean}){
    var def = {
        editable: !params.readonly && params.main,
        fields: [
            {name:'module'           , typeName:'text'    , nullable:false              },
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
        primaryKey: mainPrimaryKey,
        detailTables:[
            {table:'module_version', fields:mainPrimaryKey, abr:'V'}
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
        primaryKey: [...mainPrimaryKey, 'version'],
    };
}
