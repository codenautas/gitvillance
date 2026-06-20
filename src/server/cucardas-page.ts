import { is, DefinedType } from "guarantee-type"
import { html } from "js-to-html"

export const cucardas_info = is.object({
    host: is.string,
    org: is.string,
    repo: is.string,
    group: is.string
})

export async function cucardasPage(repo:string, infoRepos: DefinedType<typeof cucardas_info>[]){
    console.log(infoRepos);
    console.log(repo)
    var content = infoRepos.map(info => {
        var {host, org, repo} = info;
        return html.div({class: 'repo-line'}, [
            html.a({class: 'repo-link', href: `https://${host}/${org}/${repo}`}, repo),
            html.span({class: 'temporary-dump'}, JSON.stringify(info))
        ]);
    })
    var groupContent = [html.div([
        html.div({class: 'group-title'}, 'BP'),
        html.div({class: 'group-conent'}, content)
    ])]
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
    console.log(page)
    console.log(page.toHtmlDoc({},{}))
    return page.toHtmlDoc({},{})
}