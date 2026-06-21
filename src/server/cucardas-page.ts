import { is, DefinedType } from "guarantee-type"
import { html } from "js-to-html"
import { Remarkable } from "remarkable"
import { promises as fs } from "fs"
import * as Path from "path"
import { expected } from "cast-error"
import { repoKeysFromRow } from "./types-principal"

export const cucardas_info = is.object({
    host: is.string,
    org: is.string,
    repo: is.string,
    group: is.string,
    base_url: is.string,
    repo_path: is.nullable.string,
    org_repo_path: is.nullable.string
})

async function readFirstExisting(dir:string, fileNames:string[]){
    for (var fileName of fileNames) {
        try {
            return await fs.readFile(Path.join(dir, fileName), 'utf8');
        } catch (err) {
            var error = expected(err);
            if (error.code != 'ENOENT') throw err;
        }
    }
    return null;
}

function extractCucardasSection(markdown:string){
    var lines = markdown.split(/\r?\n/);
    var start = lines.findIndex(line => line.trim() == '<!-- cucardas -->');
    if (start == -1) return null;
    var section:string[] = [];
    for (var i = start + 1; i < lines.length && lines[i].trim() != ''; i++) {
        section.push(lines[i]);
    }
    return section.length ? section.join('\n') : null;
}

export async function cucardasPage(localRepo:string, infoRepos: DefinedType<typeof cucardas_info>[]){
    var md = new Remarkable();
    async function repoLine(info:DefinedType<typeof cucardas_info>){
        var {host, org, repo} = info;
        var {path} = repoKeysFromRow(localRepo, info);
        var markdown = await readFirstExisting(path, ['LEEME.md', 'README.md']);
        var cucardas = markdown == null ? null : extractCucardasSection(markdown);
        return html.div({class: 'repo-line'}, [
            html.a({class: 'repo-link', href: `https://${host}/${org}/${repo}`}, repo),
            html.span({class: 'temporary-dump'}, cucardas == null ? [] : [html.includeHtml(md.render(cucardas))])
        ]);
    }
    var groups = new Map<string, DefinedType<typeof cucardas_info>[]>();
    for (var info of infoRepos) {
        var list = groups.get(info.group);
        if (list == null) { list = []; groups.set(info.group, list); }
        list.push(info);
    }
    var groupContent = await Promise.all([...groups].map(async ([group, infos]) =>
        html.div([
            html.div({class: 'group-title'}, group),
            html.div({class: 'group-conent'}, await Promise.all(infos.map(repoLine)))
        ])
    ))
    var title = 'QA-CONTROL - cucardas of main repos'
    var page = html.html([
        html.head([
            html.title(title),
            html.link({href: './css/cucardas-page.css', media:'all', rel:'stylesheet'})
        ]),
        html.body([
            html.div({class: 'page-title'}, title),
            groupContent
        ])
    ])
    return page.toHtmlDoc({},{})
}
