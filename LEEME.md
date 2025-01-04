<!--multilang v0 es:LEEME.md en:README.md -->
# gitvillance
<!--lang:es-->
Sincronización de repositorios de código

<!--lang:en--]
Synchronizing code repositories

[!--lang:*-->

<!-- cucardas -->
![extending](https://img.shields.io/badge/stability-extending-orange.svg)
[![npm-version](https://img.shields.io/npm/v/gitvillance.svg)](https://npmjs.org/package/gitvillance)
[![build](https://github.com/codenautas/gitvillance/actions/workflows/node.js.yml/badge.svg)](https://github.com/codenautas/gitvillance/actions/workflows/node.js.yml)
[![outdated-deps](https://img.shields.io/github/issues-search/codenautas/gitvillance?color=9cf&label=outdated-deps&query=is%3Apr%20author%3Aapp%2Fdependabot%20is%3Aopen)](https://github.com/codenautas/gitvillance/pulls/app%2Fdependabot)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->

# Objetivo

<!--lang:en--]

# Main goal

[!--lang:es-->

   1. Tener sincronizado el código fuente.
   2. Extraer la información de dependencias entre módulos propios y de terceros. 

<!--lang:en--]

   1. Keep the source code synchronized.
   2. Extract dependency information between your own and third-party modules.

[!--lang:*-->

# Definiciones

<!--lang:en--]

# Definitions

[!--lang:es-->

En este sistema vamos a llamar:
   1. ***hosts*** a los servidores que almacenan código fuente. Por ejemplo [*github.com*](https://github.com) y [*gitlab.com*](https://gitlab.com)
   2. ***orgs*** al primer nivel de agrupamiento de repositorios, se puede referir tanto a una organización como a un usuario.
   3. ***repos*** a cada uno de los repositorios (dentro de un *host* y *org*)
   4. ***modules*** los módulos de los que un repositorio depende (probablemente registrados en `npm`)
   5. ***syncro*** el proceso de sincronización de cada uno de los repositorios de la tabla *repos*. Tiene los siguientes pasos:
      1. ***download***, *clone* o *pull* del código fuente
      2. ***repo parse***, revisa el archivo `package.json` buscando módulos y versiones actualizando la tabla `repo_modules` (también actualizar `repos_vault` que contiene la información de los repositorios sincronizados; `repos` es la tabla de los repositorios de interés)
      3. ***npm update***, baja la información de `npm` y actualiza la tabla `modules`
      4. ***auto add***, agregar en la tabla `repos_vault` repositorios que han sido vistos al revisar los módulos, corresponden a los *orgs* registrados y no figuraban previamente. 

<!--lang:en--]

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

[!--lang:*-->
<!--lang:es-->

# Instalación

<!--lang:en--]

# Install

[!--lang:*-->
<!--lang:es-->

# Prerrequisitos

Tener instalado
   1. Última versión LTS de Node.js 
   2. ültima versión LTS de PostgreSQL
   3. GIT
   4. Tener el PATH para poder usuarlos. 

<!--lang:en--]

# Prerequisites

Have installed
   1. Latest LTS version of Node.js
   2. Latest LTS version of PostgreSQL
   3. GIT
   4. Have the PATH to be able to use them.

[!--lang:es-->

## Archivo de confguración

Primero hay que crear el archivo de configuración de la aplicación `local-config.yaml`. 
Para eso se puede copiar el archivo `example-local-config.yaml` y modificar la configuración. 

<!--lang:en--]

## Config File 

First you need to create the application configuration file `local-config.yaml`.
To do this you can copy the `example-local-config.yaml` file and modify the configuration.

[!--lang:es-->

```yaml
server:
  port: 3000
  base-url: /gitvillance
db: # Parámetros para conectarse a la base de datos cuando el sistema esté corriendo
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
    db: # Parámetros para la creación de la base de datos durante la instalación (proceso manual)
      owner: gitvillance_owner
client-setup: 
  lang: es # idioma de la interface
devel:
  delay: 0
log:
  db:
    on-demand: true
gitvillance:
  local-repo: ../local-repo-gitvillance # lugar donde se almacenará el código fuente
  github-token: github_pat_readonly-token # token que permita listar repositorios, se puede obtener en https://github.com/settings/personal-access-tokens
```

<!--lang:en--]


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

[!--lang:es-->

## Creación de la base de datos e instalación de la aplicación

Bajada, compilación y creación de la base de datos inicial

<!--lang:en--]

## Creating the database and installing the application

Downloading, compiling and creating the initial database

[!--lang:*-->

```sh
> git clone https://github.com/codenautas/gitvillance
> npm ci
> npm start -- --dump-db
> psql < local-create-db.sql
> psql < local-create-schema.sql
```

<!--lang:es-->

Arranque. 
```sh
> npm start
```
Para la instalación en un servidor debe programarse el servicio o el cron.

<!--lang:en--]

Starting 
```sh
> npm start
```
For installation on a server, the service or cron must be scheduled.

[!--lang:es-->

# Operación manual

En la opción de menú `manual update` se encuentran los dos procesos que revisan los repositorios externos.
   * `repository sync` se encarga de hacer `git clone` o `git pull`, luego parsear el `package.json` 
   y finalmente traer información de `npmjs.org` (por ejemplo cuál es la última versión publicada)
   * `repo list` revisa los respositorios del usuario y de las organizaciones a las que tiene acceso
   para encontrar nuevos repositorios. Para que esos nuevos respositorios entren en el proximo `respository sync`
   tienen que tener la columna `guard` en `true`.

<!--lang:en--]

# Manual usage

In the `manual update` menu option you will find the two processes that check the external repositories.
   * `repository sync` is in charge of doing `git clone` or `git pull`, then parsing the `package.json` 
   and finally fetching information from `npmjs.org` (for example, what is the latest published version).
   * `repo list` checks the repositories of the user and the organizations to which they have access to find new repositories. 
   In order for these new repositories to enter the next `respository sync` they must have the `guard` column set to `true`.

[!--lang:es-->


<!--lang:en--]


[!--lang:es-->


<!--lang:en--]


[!--lang:es-->

## Licencia

<!--lang:en--]

## License

[!--lang:*-->

[MIT](LICENSE)
