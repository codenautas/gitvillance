"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export const primaryKey = ['host']

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
            {table:'orgs' , fields:primaryKey, abr:'O'},
            {table:'repos', fields:primaryKey, abr:'R'}
        ]
    }
}
