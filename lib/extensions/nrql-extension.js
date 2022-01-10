'use strict'

const nunjucks = require('nunjucks'),
  { createLogger } = require('../logger'),
  {
    NerdgraphClient,
  } = require('../nerdgraph')

function NrqlExtension(apiKey) {
  this.tags = ['nrql']
  this.logger = createLogger('nrql-extension')
  this.apiKey = apiKey

  this.parse = function(parser, nodes, lexer) {

    // get the tag token
    const tok = parser.nextToken()

    // parse the args and move after the block end. passing true
    // as the second arg is required if there are no parentheses
    const args = parser.parseSignature(null, true)

    parser.advanceAfterBlockEnd(tok.value)

    // parse the body and possibly the error block, which is optional
    const body = parser.parseUntilBlocks('error', 'endnrql')
    let errorBody = null

    if (parser.skipSymbol('error')) {
      parser.skip(lexer.TOKEN_BLOCK_END)
      errorBody = parser.parseUntilBlocks('endnrql')
    }

    parser.advanceAfterBlockEnd()

    // See above for notes about CallExtension
    return new nodes.CallExtensionAsync(this, 'run', args, [body, errorBody])
  }

  this.run = async function(context, ...args) {
    const vars = context.getVariables(),
      nerdgraph = new NerdgraphClient(),
      callback = args[args.length - 1],
      errorBody = args[args.length - 2],
      body = args[args.length - 3],
      rest = args.slice(0, -3)
    let query = null,
      options = {}

    rest.forEach(arg => {
      if (!query && typeof arg === 'string') {
        query = arg
      // eslint-disable-next-line no-underscore-dangle
      } else if (arg && typeof arg === 'object' && arg.__keywords) {
        options = arg
        if (options.query) {
          query = options.query
        }
      }
    })

    if (!query) {
      this.logger.warn('missing query')
      callback(null, '')
      return
    }

    const accountId = options.accountId || vars.accountId

    if (!accountId) {
      this.logger.warn('missing account ID')
      callback(null, '')
      return
    }

    context.setVariable('error', null)
    context.setVariable(options.var || 'result', null)

    try {
      const result = await nerdgraph.runNrql(
        this.apiKey,
        accountId,
        query,
      )

      context.setVariable(
        options.var || 'result',
        result.length > 1 ? result : result[0],
      )

      callback(null, new nunjucks.runtime.SafeString(body()))
      return
    } catch (err) {
      this.logger.error(err)
      context.setVariable('error', err)

      if (errorBody) {
        callback(null, new nunjucks.runtime.SafeString(errorBody()))
        return
      }

      // eslint-disable-next-line node/callback-return
      callback(null, new nunjucks.runtime.SafeString('This chart could not be displayed.'))
    }
  }
}

module.exports = NrqlExtension
