"use strict";

import {TableDefinition, TableContext} from "./types-principal";

import { reposPk, reposPkFields } from './table-repos';
import { modulesPk, modulesPkFields } from './table-modules';

var mainPrimaryKey = [...reposPk, ...modulesPk];

export function repo_modules(_context:TableContext):TableDefinition{
    return {
        name: 'repo_modules',
        fields: [
            ...reposPkFields,
            ...modulesPkFields,
            {name:'version',         typeName:'text',      nullable:false},
            {name:'version_lock',    typeName:'text',      nullable:false}
        ],
        primaryKey: mainPrimaryKey,
        detailTables:[
            {table:'module_version', fields:mainPrimaryKey, abr:'V'}
        ]
    };
}
