"use strict";

import {TableDefinition, TableContext} from "./types-principal";

var primaryKey = ['host']


export function hosts(_context:TableContext):TableDefinition{
    return {
        name: 'hosts',
        editable: true,
        fields: [
            {name:'host'            , typeName:'text'     , nullable:false              },
            {name:'base_url'        , typeName:'text'     , nullable:false, isName:true },
        ],
        primaryKey,
        detailTables:[
            {table:'repos', fields:primaryKey, abr:'R'}
        ]
    }
}
