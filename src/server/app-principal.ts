"use strict";

import { AppBackend, Context, Request, 
    Client, ClientModuleDefinition, OptsClientPage, MenuDefinition, MenuInfoBase, 
    RepoPk
} from "./types-principal";

import { usuarios                } from './table-usuarios';
import { hosts                   } from './table-hosts';
import { orgs                    } from './table-orgs';
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
import * as semver from "semver";

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

async function readJson<CurrentD extends Description>(description:CurrentD, path:string, opts:{nullWhenNoEnt:boolean}): Promise<DefinedType<CurrentD>|null>{
    const {nullWhenNoEnt} = opts
    try {
        const content = await fs.readFile(path, 'utf-8')
        const typedObject = guarantee(description, JSON.parse(content))
        return typedObject;
    } catch (err) {
        var error = expected(err);
        if (error.code == 'ENOENT' && nullWhenNoEnt) {
            return null;
        }
        throw err;
    }
}

export class AppPrincipal extends AppBackend{
    constructor(){
        super();
        new Promise(async ()=>{
            return 
            // this.nodeFetch = (await importNodefetch()).default;
        })
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
            {menuType:'table', name:'repos', table:'repos_vault'},
            {menuType:'table', name:'modules'},
            {menuType:'menu', name:'manual_update', menuContent:[
                {menuType:'proc', name:'repository sync', proc:'repo_sync'},
                {menuType:'proc', name:'repository list', proc:'repos_list'},
            ]}
        )
        if(context.user && context.user.rol=="admin"){
            menuContent.push(
                {menuType:'menu', name:'config', label:'configurar', menuContent:[
                    {menuType:'table', name:'hosts'},
                    {menuType:'table', name:'orgs'},
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
    override async checkDatabaseStructure(client: Client) {
        var be = this;
        await super.checkDatabaseStructure(client);
        var schema = be.config.db.schema;
        var infoRepoPath = await client.informationSchema.column(schema, 'hosts', 'repo_path')
        if (infoRepoPath == null) {
            console.error("-----------------------")
            console.error("--- FALTAN COLUMNAS ---")
            console.log("alter table hosts add column repo_path text;")
            console.log("alter table orgs  add column repo_path text;")
            console.log("alter table orgs  add column is_user boolean;")
            console.log(`alter table "repo_modules" drop constraint "version<>''";`);
            throw new Error(`Falta la columna repo.repo_path`)
        }
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
            ).fetchUniqueRow(`No se encuetra el repositorio ${repoPk.host} ${repoPk.org} ${repoPk.repo}`)
        )
    }
    async repoKeys(repoPk:RepoPk){
        var be = this;
        var {host, org, repo} = repoPk;
        var {row} = await be.inTransaction(null, client => client.query(`
            SELECT *, (SELECT repo_path FROM orgs o WHERE o.host = h.host AND o.org = $2) as org_repo_path
                FROM hosts h
                WHERE h.host = $1`
            , [host, org]
        ).fetchUniqueRow());
        var {base_url} = guarantee(
            is.object({
                base_url: is.string
            }),
            row
        );
        const url = new URL(Path.posix.join(org, repo), base_url)
        const path = Path.join(be.config.gitvillance["local-repo"], row.repo_path ?? url.hostname, row.org_repo_path ?? org, repo)
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
                    version: is.optional.string,
                    dependencies   : {optional:is.recordString.string},
                    devDependencies: {optional:is.recordString.string}
                }),
                Path.join(path, 'package.json'),
                {nullWhenNoEnt:true}
            ),
            lock: readJson(
                is.object({
                    packages: {optional:is.recordString.object({version: is.optional.string})},
                }),
                Path.join(path, 'package-lock.json'),
                {nullWhenNoEnt:true}
            )
        });
        var parsed = bestGlobals.datetime.now();
        var repoModulesData:{section:string, module:string, version:string, version_lock:string|null}[] = []
        if (packages.json != null) {
            var packageJson = packages.json;
            var section: keyof typeof packageJson;
            function isDependenciesSection(section: keyof typeof packageJson): section is 'dependencies' {
                return section.match(/dependencies$/i) != null
            }
            for (section in packageJson) {
                if (isDependenciesSection(section)) {
                    for (var module in packageJson[section]) {
                        const infoDep = packageJson[section];
                        if (infoDep != null) {
                            var version = infoDep[module];
                            // var version_lock = (packages.lock.packages as Record<string,string>)[`node_modules/${module}`];
                            const version_lock = packages?.lock?.packages?.[`node_modules/${module}`].version ?? null;
                            repoModulesData.push({section, module, version, version_lock})
                        }
                    }
                }
            }
        }
        await be.inTransaction(null, async client => {
            await client.query(`
                INSERT INTO repo_modules (host, org, repo, section, module, version, version_lock, parsed)
                    SELECT $1 as host, $2 as org, $3 as repo, j.section, j.module, coalesce(j.version,''), nullif(j.version_lock,''), $4 as parsed
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
        await be.inTransaction(null, client => client.query(`
            UPDATE repos_vault
                SET version = $4, parsed = $5
                WHERE host = $1 AND org = $2 AND repo = $3
                RETURNING 1`,
            [...arrayPk, packages.json?.version, parsed]
        ).fetchUniqueRow());
        return {version: packages.json?.version ?? null}
    }
    async npmUpdateFromRepo(repoPk:RepoPk){
        const be = this;
        const {arrayPk} = await be.repoKeys(repoPk);
        await be.inTransaction(null, async client => {
            const dependencies = guarantee(
                is.array.object({
                    module: is.string,
                    must_insert: is.boolean,
                    version: is.optional.string,
                    npm_latest: is.optional.string
                }),
                (await client.query(`
                    SELECT module, m.module is null must_insert, rm.version, m.npm_latest
                        FROM repos_vault r 
                            INNER JOIN repo_modules rm USING (host, org, repo, parsed)
                            LEFT JOIN modules m USING (module)
                        WHERE r.host = $1 AND r.org = $2 AND r.repo = $3
                            AND rm.version IS DISTINCT FROM m.npm_latest 
                        LIMIT 4`,
                    [repoPk.host, repoPk.org, repoPk.repo]
                ).fetchAll()).rows
            );
            await Promise.all(dependencies.map(async module=>{
                var mustRetryNpm = module.must_insert
                try {
                    mustRetryNpm ||= semver.gt(semver.minVersion(module.version ?? '*') ?? '', module.npm_latest ?? '')
                } catch (err) {
                    console.log('SEMVER err', err);
                }
                if (mustRetryNpm) {
                    const npmUrl = new URL(module.module, 'https://registry.npmjs.org/');
                    const request = await fetch(npmUrl);
                    const info = guarantee(
                        is.optional.object({
                            "dist-tags": is.optional.object({latest:is.string}),
                            versions: {recordString:{optional: is.object({
                                repository: {optional: is.object({type:is.optional.string, url:is.optional.string})}
                            })}}
                        }),
                        await request.json()
                    );
                    const latest = info?.["dist-tags"]?.latest
                    const repository_url  = info?.versions?.[latest ?? '']?.repository?.url
                    const repository_type = info?.versions?.[latest ?? '']?.repository?.type
                    var repository_host:string|undefined
                    var repository_org:string|undefined
                    var repository_repo:string|undefined
                    await fs.writeFile('local-log-info.json', JSON.stringify(info), 'utf8');
                    if (repository_url) {
                        const repoUrl = repository_url ? new URL(repository_url.replace(/^git\+/,'')) : null;
                        repository_host = repoUrl?.hostname
                        repository_org = repoUrl?.pathname.split('/')[1]
                        repository_repo = repoUrl?.pathname.split('/')[2]?.replace(/\.git$/,'');
                    }
                    await be.inTransaction(null, client => client.query(
                        module.must_insert 
                            ? `INSERT INTO modules (module, npm_latest, npm_info, repository_host, repository_org, repository_repo, repository_type, repository_url) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
                            : `UPDATE modules 
                                SET npm_latest = $2, npm_info = $3, repository_host = $4, repository_org =$5 , repository_repo =$6 , repository_type = $7, repository_url = $8
                                WHERE module = $1`, 
                        [ module.module, latest, info, repository_host, repository_org, repository_repo, repository_type, repository_url]
                    ).execute());
                }
            }));
        });
        var npmed = bestGlobals.datetime.now();
        await be.inTransaction(null, client => client.query(`
            UPDATE repos_vault
                SET npmed = $4
                WHERE host = $1 AND org = $2 AND repo = $3
                RETURNING 1`,
            [...arrayPk, npmed]
        ).fetchUniqueRow());
    }
    async pendingMachine(context:ProcedureContext, opts:{sql:string, params:any[], message:string, do: (repoPk:RepoPk) => Promise<any>}){
        var pendings = guarantee(
            is.array.object({
                host: is.string,
                org: is.string,
                repo: is.string,
            }),
            (await context.client.query(opts.sql, opts.params).fetchAll()).rows
        );
        var i = 0; 
        for (var repoPk of pendings) {
            context.informProgress({message: opts.message + ' ' + likeAr(repoPk).array().join(','), lengthComputable:true, loaded:i++, total:pendings.length})
            await opts.do(repoPk);
        }
        context.informProgress({message: opts.message + ' END!', lengthComputable:true, loaded:i, total:pendings.length});
        return {count: i}
    }
    async reposDownload(context:ProcedureContext){
        var be = this;
        var limit = bestGlobals.date.today().sub(bestGlobals.timeInterval.iso('1D'));
        return await be.pendingMachine(context, {
            sql:`SELECT host, org, repo
                FROM repos r INNER JOIN repos_vault v USING (host, org, repo)
                WHERE (fetching IS NULL OR fetching < $1) AND guard
                ORDER BY repo`,
            params:[limit],
            message: 'REPO',
            do: repoPk => be.repoDownload(repoPk)
        });
    }
    async reposParse(context:ProcedureContext){
        var be = this;
        return await be.pendingMachine(context, {
            sql:`SELECT host, org, repo
                FROM repos r INNER JOIN repos_vault v USING (host, org, repo)
                WHERE (parsed IS NULL OR parsed < COALESCE(fetched, fetching)) AND guard
                ORDER BY repo`,
            params:[],
            message: 'PARSE',
            do: repoPk => be.repoParse(repoPk)
        });
    }
    async npmsUpdateFromRepo(context:ProcedureContext){
        var be = this;
        return await be.pendingMachine(context, {
            sql:`SELECT host, org, repo
                FROM repos r INNER JOIN repos_vault v USING (host, org, repo)
                WHERE (npmed IS NULL OR npmed < COALESCE(fetched, fetching)) AND guard
                ORDER BY repo`,
            params:[],
            message: 'PARSE',
            do: repoPk => be.npmUpdateFromRepo(repoPk)
        });
    }
    async reposAutoAdd(){
        var be = this;
        var result = await be.inTransaction(null, async client=>client.query(`
            INSERT INTO repos_vault (host, org, repo)
                SELECT DISTINCT repository_host, repository_org, repository_repo
                    FROM modules m 
                        INNER JOIN orgs o       ON repository_host = o.host    AND repository_org = o.org
                        LEFT JOIN repos_vault x ON repository_host = x.host    AND repository_org = x.org     AND repository_repo = x.repo
                    WHERE x.host IS NULL       AND repository_host IS NOT NULL AND repository_org IS NOT NULL AND repository_repo IS NOT NULL
        `).execute());
        return {new_repos_inserted: result.rowCount}
    }
    async allPending(context:ProcedureContext){
        return {
            "repo": await this.reposDownload(context),
            "deps": await this.reposParse(context),
            "npm": await this.npmsUpdateFromRepo(context),
            "ins": await this.reposAutoAdd()
        }
    }
    override prepareGetTables(){
        super.prepareGetTables();
        this.getTableDefinition={
            ... this.getTableDefinition,
            usuarios                ,
            hosts                   ,
            orgs                    ,
            repos_vault             , 
            repos                   ,
            modules                 ,
            repo_modules            ,
        }
    }
}
