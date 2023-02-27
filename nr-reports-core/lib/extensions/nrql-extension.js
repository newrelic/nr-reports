'use strict'

const nunjucks = require('nunjucks'),
  { createLogger } = require('../logger'),
  {
    NerdgraphClient,
  } = require('../nerdgraph'),
  { Context, requireAccountIds } = require('../util')

const logger = createLogger('nrql-extension')

function handleError(context, err, errorBody, callback) {
  logger.error(err)
  context.setVariable('error', err)

  if (errorBody) {
    callback(null, new nunjucks.runtime.SafeString(errorBody()))
    return
  }

  // eslint-disable-next-line node/callback-return
  callback(null, new nunjucks.runtime.SafeString('This chart could not be displayed.'))
}

function NrqlExtension(apiKey) {
  this.tags = ['nrql']
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
    context.setVariable('error', null)

    const env = context.env,
      callback = args.pop(),
      errorBody = args.pop(),
      body = args.pop()

    try {
      let query = null,
        options = {}

      logger.debug(log => {
        log('Extension args:')
        log(args)
      })

      args.forEach(arg => {
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
        logger.warn('missing query')
        callback(null, '')
        return
      }

      context.setVariable(options.var || 'result', null)

      const vars = context.getVariables(),
        newContext = new Context(vars, options),
        accountIds = requireAccountIds(newContext),
        nerdgraph = new NerdgraphClient()

      logger.debug(() => {
        newContext.dump('Extension render context')
      })

      const result = await nerdgraph.runNrql(
        this.apiKey,
        accountIds,
        env.renderString(query, newContext),
        {
          timeout: options.timeout || 5,
        },
      )

      context.setVariable(
        options.var || 'result',
        result,
      )

      body((err, src) => {
        if (err) {
          handleError(context, err, errorBody, callback)
          return
        }

        callback(null, src)
      })
    } catch (err) {
      handleError(context, err, errorBody, callback)
    }
  }
}

module.exports = NrqlExtension
