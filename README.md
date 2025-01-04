# gitvillance
Synchronizing code repositories


![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/gitvillance.svg)](https://npmjs.org/package/gitvillance)
[![build](https://github.com/codenautas/gitvillance/actions/workflows/node.js.yml/badge.svg)](https://github.com/codenautas/gitvillance/actions/workflows/node.js.yml)
[![outdated-deps](https://img.shields.io/github/issues-search/codenautas/gitvillance?color=9cf&label=outdated-deps&query=is%3Apr%20author%3Aapp%2Fdependabot%20is%3Aopen)](https://github.com/codenautas/gitvillance/pulls/app%2Fdependabot)


language: ![English](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)
also available in:
[![Spanish](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)](LEEME.md)


# Main goal


   1. Keep the source code synchronized.
   2. Extract dependency information between your own and third-party modules.


# Definiciones


# Definitions


In this system we will call:
   1. ***hosts*** the servers that store source code. For example [*github.com*](https://github.com) and [*gitlab.com*](https://gitlab.com)
   2. ***orgs*** the first level of repository grouping, it can refer to both an organization or a user.
   3. ***repos*** each of the repositories (within a *host* and *org*)
   4. ***modules*** the modules that a repository depends on (probably registered in `npm`)
   5. ***syncro*** the synchronization process for each of the repositories in the *repos* table. It has the following steps:
      1. ***download***, *clone* or *pull* the source code
      2. ***repo parse***, checks the `package.json` file looking for modules and versions, updating the `repo_modules` table (also updates `repos_vault` which contains the information of the synchronized repositories; `repos` is the table of the repositories of interest)
      3. ***npm update***, downloads the information from `npm` and updates the `modules` table
      4. ***auto add***, adds to the `repos_vault` table the repositories that have been seen when checking the modules, correspond to the registered *orgs* and were not previously listed.


# Install


# Prerequisites

Have installed
   1. Latest LTS version of Node.js
   2. Latest LTS version of PostgreSQL
   3. GIT
   4. Have the PATH to be able to use them.


## Config File

First you need to create the application configuration file `local-config.yaml`.
To do this you can copy the `example-local-config.yaml` file and modify the configuration.



```yaml
server:
  port: 3000
  base-url: /gitvillance
db: # Parameters to connect to the database when the system is running
  description: base de prueba
  host: localhost
  port: 5432
  database: gitvillance_db
  schema: gitvillance
  user: gitvillance_admin
  password: cambiar_esta_clave
install:
  dump:
    drop-his: false
    db: # Parameters for creating the database during installation (manual process)
      owner: gitvillance_owner
client-setup:
  lang: en # interface language
devel:
  delay: 0
log:
  db:
    on-demand: true
gitvillance:
  local-repo: ../local-repo-gitvillance # where the source code will be stored
  github-token: github_pat_readonly-token # token that allows listing repositories, can be obtained at https://github.com/settings/personal-access-tokens
```


## Creating the database and installing the application

Downloading, compiling and creating the initial database


```sh
> git clone https://github.com/codenautas/gitvillance
> npm ci
> npm start -- --dump-db
> psql < local-create-db.sql
> psql < local-create-schema.sql
```


Starting
```sh
> npm start
```
For installation on a server, the service or cron must be scheduled.


# Manual usage

In the `manual update` menu option you will find the two processes that check the external repositories.
   * `repository sync` is in charge of doing `git clone` or `git pull`, then parsing the `package.json`
   and finally fetching information from `npmjs.org` (for example, what is the latest published version).
   * `repo list` checks the repositories of the user and the organizations to which they have access to find new repositories.
   In order for these new repositories to enter the next `respository sync` they must have the `guard` column set to `true`.






## License


[MIT](LICENSE)
