"use strict";

import {TableDefinition, TableContext} from "./types-principal";

import * as hosts from "./table-hosts";

var primaryKey = ['host', 'org']


export function orgs(_context:TableContext):TableDefinition{
    return {
        name: 'orgs',
        title: 'organizations',
        editable: true,
        fields: [
            {name:'host'            , typeName:'text'     , nullable:false              },
            {name:'org'             , typeName:'text'     , nullable:false              },
            {name:'repo_path'       , typeName:'text'     },
            {name:'is_user'         , typeName:'boolean'  },
        ],
        primaryKey,
        foreignKeys:[
            {references:'hosts', fields:hosts.primaryKey}
        ],
        detailTables:[
            {table:'repos', fields:primaryKey, abr:'R'}
        ]
    }
}
