"use strict";

import {TableDefinition, TableContext} from "./types-principal";

export function repos(context:TableContext):TableDefinition{
    var admin = context.user.rol==='admin';
    return {
        name:'repos',
        title:'repositorios',
        editable:admin,
        fields:[
            {name:'host'             , typeName:'text'    , nullable:false  },
            {name:'org'              , typeName:'text'    , nullable:false  },
            {name:'repo'             , typeName:'text'    , nullable:false  },
            {name:'bajar'            , typeName:'boolean' },
        ],
        primaryKey:['host', 'org', 'repo']
    };
}
