"use strict";

import {TableDefinition, TableContext} from "./types-principal";

import { reposPk, reposPkFields } from './table-repos';
import { modulesPk, modulesPkFields } from './table-modules';

var mainPrimaryKey = [...reposPk, ...modulesPk, 'section'];

export function repo_modules(context:TableContext):TableDefinition{
    return {
        name: 'repo_modules',
        editable: context.forDump,
        fields: [
            ...reposPkFields,
            ...modulesPkFields,
            {name:'section',         typeName:'text',      nullable:false},
            {name:'version',         typeName:'text',      nullable:false, allowEmptyText:true},
            {name:'version_lock',    typeName:'text',                    },
            {name:'parsed',          typeName:'timestamp',               }
        ],
        primaryKey: mainPrimaryKey,
        softForeignKeys:[
            {references:'modules', fields:modulesPk, displayFields:['npm_latest','repository_host','repository_org','repository_repo'], displayAfterFieldName:'parsed'}
        ],
        detailTables:[
            {table:'repo_modules', fields:modulesPk, abr:'R'}
        ]
    };
}
