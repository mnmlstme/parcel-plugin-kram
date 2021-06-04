const { Asset } = require('parcel-bundler')
const marked = require('marked')
const path = require('path')
const frontMatter =  require('front-matter')
const serializeObject = require('parcel-bundler/src/utils/serializeObject')

module.exports = class KramAsset extends Asset {
  constructor(name, options) {
    super(name, options)
    this.type = 'js'
  }

  parse (code) {
    const { body, attributes } = frontMatter(code)
    const { platform } = attributes

    const doc = marked.lexer(body).map( function (token, index) {
      if ( token.type === "code" ) {
        const assign = {
          id: `krumb-${index}`,
          lang: token.lang || platform
        }
        return Object.assign(token, assign)
      } else {
        return token
      }
    })

    return { front: attributes, doc }
  }

  collectDependencies() {
    const name = this.name
    const kramDir = path.dirname(name)
    const kramFile = path.basename(name)
    const pkg = path.basename(name, '.kr')
    const { front, doc } = this.ast
    const { platform } = front
    const code = doc.filter( t => t.type === "code")
    const languages = code.map( t => t.lang )
      .reduce(
        (accum, next) => accum.includes(next) ?
          accum : accum.concat([next]),
        []
       )
    const dependences = languages.map( lang => `./${pkg}.${lang}` )
    this.dependences = dependences
    dependences.forEach( d => this.addDependency(d) )
  }

  generate () {
    const name = this.name
    const kramDir = path.dirname(name)
    const kramFile = path.basename(name)
    const pkg = path.basename(name, '.kr')
    const { front, doc } = this.ast
    const { platform } = front
    const code = doc.filter( t => t.type === "code")
    const languages = code.map( t => t.lang )
      .reduce(
        (accum, next) => accum.includes(next) ?
          accum : accum.concat([next]),
        []
       )
    const lang = languages[0] || platform

    // TODO: plugins
    const generator = require(`./generators/${platform}.js`)
    const generated = generator(pkg, front, code)
    const html = marked.parser(doc)

    this.name = `${kramDir}/${pkg}.${lang}`

    const object = JSON.stringify( Object.assign(
        this.ast, {
          name,
          html,
          languages,
          code,
          [lang]: generated,
          dependences: this.dependences
        }
      )).replace(/\}$/, `,"promise":import('./${pkg}.${lang}')}`)

    return [
      {
        type: lang,
        value: generated
      },
      {
        type: 'js',
        value: `module.exports=${object}`
      }
    ]
  }

};
