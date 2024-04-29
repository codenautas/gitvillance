"use strict";

import { AppBackend, Context, Request, 
    ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase, 
    RepoPk
} from "./types-principal";

import { usuarios                } from './table-usuarios';
import { hosts                   } from './table-hosts';
import { repos_vault             } from './table-repos';
import { repos                   } from './table-repos';
import { modules                 } from './table-modules';
import { repo_modules            } from './table-repo_modules';

import {staticConfigYaml} from './def-config';
import { ProceduresPrincipal } from './procedures-principal';

import {promises as fs} from 'fs'
import * as Path from 'path'
import { simpleGit } from 'simple-git'
import { expected } from 'cast-error'
import * as JSON4all from 'json4all'
import {strict as likeAr} from 'like-ar';
import { guarantee, is, Description, DefinedType } from "guarantee-type";
import * as bestGlobals from 'best-globals'
import { ProcedureContext } from "backend-plus";

async function pathExists(path:string){
    try {
        await fs.stat(path);
        return true;
    } catch (err) {
        var error = expected(err);
        if (error.code == 'ENOENT') return false;
        throw err;
    }
}

async function objectAwaiter<T>(object: T): Promise<{[k in keyof T]: Awaited<T[k]>}>{
    var acum: Partial< {[k in keyof T]: Awaited<T[k]>} > = {}
    for (var k in object) {
        acum[k] = await object[k];
    }
    return acum as {[k in keyof T]: Awaited<T[k]>};
}

// @ts-expect-error infinite Type instantiation is excessively deep and possibly infinite
async function readJson<CurrentD extends Description>(description:CurrentD, path:string): Promise<DefinedType<CurrentD>>{
    const content = await fs.readFile(path, 'utf-8')
    const typedObject = guarantee(description, JSON.parse(content))
    return typedObject;
}

export class AppPrincipal extends AppBackend{
    constructor(){
        super();
    }
    override configStaticConfig(){
        super.configStaticConfig();
        this.setStaticConfig(staticConfigYaml);
    }
    override async getProcedures(){
        return [
            ...await super.getProcedures(),
            ...ProceduresPrincipal
        ]
    }
    override getMenu(context:Context):MenuDefinition{
        var menuContent:MenuInfoBase[]=[];
        menuContent.push(
            {menuType:'table', name:'repos'},
            {menuType:'proc', name:'repos_download'},
        )
        if(context.user && context.user.rol=="admin"){
            menuContent.push(
                {menuType:'menu', name:'config', label:'configurar', menuContent:[
                    {menuType:'table', name:'usuarios'  },
                ]}
            )
        };
        return {menu:menuContent};
    }
    override clientIncludes(req:Request|null, opts:OptsClientPage):ClientModuleDefinition[]{
        var UsandoREact = false;
        var menuedResources:ClientModuleDefinition[]=req && opts && !opts.skipMenu ? [
            { type:'js' , src:'client.js' },
        ]:[
        ];
        var list: ClientModuleDefinition[] = [
            ...(UsandoREact?[
                { type: 'js', module: 'react', modPath: 'umd', fileDevelopment:'react.development.js', file:'react.production.min.js' },
                { type: 'js', module: 'react-dom', modPath: 'umd', fileDevelopment:'react-dom.development.js', file:'react-dom.production.min.js' },
                { type: 'js', module: '@mui/material', modPath: 'umd', fileDevelopment:'material-ui.development.js', file:'material-ui.production.min.js' },
                { type: 'js', module: 'material-styles', fileDevelopment:'material-styles.development.js', file:'material-styles.production.min.js' },
                { type: 'js', module: 'clsx', file:'clsx.min.js' },
                { type: 'js', module: 'redux', modPath:'../dist', fileDevelopment:'redux.js', file:'redux.min.js' },
                { type: 'js', module: 'react-redux', modPath:'../dist', fileDevelopment:'react-redux.js', file:'react-redux.min.js' },
            ]:[]) satisfies ClientModuleDefinition[],
            ...super.clientIncludes(req, opts),
            ...(UsandoREact?[
                { type: 'js', module: 'redux-typed-reducer', modPath:'../dist', file:'redux-typed-reducer.js' },
                { type: 'js', src: 'adapt.js' },
            ]:[])  satisfies ClientModuleDefinition[],
            { type: 'css', file: 'menu.css' },
            ... menuedResources
        ] satisfies ClientModuleDefinition[];
        return list;
    }
    async updateRepoFetchingInfo(repoPk:RepoPk, changeExpressions:{fetching?:bestGlobals.DateTime, fetch_result:string|null, fetched?:bestGlobals.DateTime}){
        var q = this.db.quoteNullable;
        await this.inTransaction(null, client =>
            client.query(`
                UPDATE repos_vault r
                    SET ${likeAr(changeExpressions).map((value, key)=>(value !== undefined ? `${key} = ${q(value)}` : undefined)).join(', ')}
                    FROM hosts h
                    WHERE r.host = $1 AND org = $2 AND repo = $3 AND h.host = r.host
                    RETURNING 1
                    `
                , [repoPk.host, repoPk.org, repoPk.repo]
            ).fetchUniqueRow()
        )
    }
    async repoKeys(repoPk:RepoPk){
        var be = this;
        var {host, org, repo} = repoPk;
        var result = await be.inTransaction(null, client => client.query(`
            SELECT *
                FROM hosts h
                WHERE h.host = $1`
            , [host]
        ).fetchUniqueRow());
        var {base_url} = guarantee(
            is.object({
                base_url: is.string
            }),
            result.row
        );
        const url = new URL(Path.posix.join(org, repo), base_url)
        const path = Path.join(be.config.gitvillance["local-repo"], url.hostname, org, repo)
        return {base_url, url, path, arrayPk:[host, org, repo]};
    }
    async repoDownload(repoPk:RepoPk){
        var be = this;
        var {path, url} = await be.repoKeys(repoPk);
        await be.updateRepoFetchingInfo(repoPk, {fetching: bestGlobals.datetime.now(), fetch_result:null})
        try {
            var result:string|undefined;
            if (await pathExists(path)) {
                const git = simpleGit(path);
                var {summary} = await git.pull();
                result = JSON4all.toUrl(summary)
            } else {
                const git = simpleGit();
                await fs.mkdir(path, {recursive:true});
                result = await git.clone(url.toString(), path);
            }
            await be.updateRepoFetchingInfo(repoPk, {fetched: bestGlobals.datetime.now(), fetch_result:result || null})
        } catch (err) {
            const error = expected(err);
            result = error.message
            await be.updateRepoFetchingInfo(repoPk, {fetch_result:result || 'Error type ' + err})
        }
        return result;
    }
    async repoParse(repoPk:RepoPk){
        const be = this;
        const {path, arrayPk} = await be.repoKeys(repoPk);
        const packages = await objectAwaiter({
            json: readJson(
                is.object({
                    version: is.string,
                    dependencies   : is.recordString.string,
                    devDependencies: is.recordString.string
                }),
                Path.join(path, 'package.json')
            ),
            lock: readJson(
                is.object({
                    packages: is.recordString.object({version: is.string}),
                }),
                Path.join(path, 'package-lock.json')
            )
        });
        var parsed = bestGlobals.datetime.now();
        await be.inTransaction(null, client => client.query(`
            UPDATE repos_vault
                SET version = $4, parsed = $5
                WHERE host = $1 AND org = $2 AND repo = $3
                RETURNING 1`,
            [...arrayPk, packages.json.version, parsed]
        ).fetchUniqueRow());
        var repoModulesData:{section:string, module:string, version:string, version_lock:string}[] = []
        var section: keyof typeof packages.json;
        function isDependenciesSection(section: keyof typeof packages.json): section is 'dependencies' {
            return section.match(/dependencies$/i) != null
        }
        for (section in packages.json) {
            if (isDependenciesSection(section)) {
                for (var module in packages.json[section]) {
                    var version = packages.json[section][module];
                    // var version_lock = (packages.lock.packages as Record<string,string>)[`node_modules/${module}`];
                    var version_lock = packages.lock.packages[`node_modules/${module}`].version;
                    repoModulesData.push({section, module, version, version_lock})
                }
            }
        }
        await be.inTransaction(null, async client => {
            await client.query(`
                INSERT INTO repo_modules (host, org, repo, section, module, version, version_lock, parsed)
                    SELECT $1 as host, $2 as org, $3 as repo, j.*, $4 as parsed
                        FROM json_to_recordset( $5::json ) as j(section text, module text, version text, version_lock text)
                    ON CONFLICT (host, org, repo, module, section) DO UPDATE
                        SET version = excluded.version, version_lock = excluded.version_lock, parsed = excluded.parsed
                    `,
                [...arrayPk, parsed, JSON.stringify(repoModulesData)]
            ).execute()
            await client.query(`
                DELETE FROM repo_modules 
                    WHERE host = $1 AND org = $2 AND repo = $3 AND parsed <> $4
                    `,
                [...arrayPk, parsed]
            ).execute()
        });
        return {version: packages.json.version}
    }
    async reposDownload(context:ProcedureContext){
        var be = this;
        var limit = bestGlobals.date.today().sub(bestGlobals.timeInterval.iso('1D'));
        var pendings = guarantee(
            is.array.object({
                host: is.string,
                org: is.string,
                repo: is.string,
            }),
            (await context.client.query(
                `SELECT host, org, repo
                    FROM repos r INNER JOIN repos_vault v USING (host, org, repo)
                    WHERE (fetching IS NULL OR fetching < $1) AND guard
                    ORDER BY repo`,
                [limit]
            ).fetchAll()).rows
        );
        var i = 0; 
        for (var repoPk of pendings) {
            context.informProgress({message: likeAr(repoPk).array().join(','), lengthComputable:true, loaded:i++, total:pendings.length})
            await be.repoDownload(repoPk);
            await be.repoParse(repoPk);
        }
        context.informProgress({message: 'DONE!', lengthComputable:true, loaded:pendings.length, total:pendings.length})
        return 'OK';
    }
    override prepareGetTables(){
        super.prepareGetTables();
        this.getTableDefinition={
            ... this.getTableDefinition,
            usuarios                ,
            hosts                   ,
            repos_vault             , 
            repos                   ,
            modules                 ,
            repo_modules            ,
        }
    }
}
