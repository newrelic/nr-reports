'use strict'

const nunjucks = require('nunjucks'),
  { createLogger, logTrace } = require('../../../logger'),
  {
    NerdgraphClient,
  } = require('../../../nerdgraph'),
  { Context, requireAccountId, toNumber } = require('../../../util')

const logger = createLogger('chart-extension')

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

function ChartExtension(apiKey) {
  this.tags = ['chart']
  this.apiKey = apiKey

  this.parse = function(parser, nodes, lexer) {

    // get the tag token
    const tok = parser.nextToken()

    // parse the args and move after the block end. passing true
    // as the second arg is required if there are no parentheses
    const args = parser.parseSignature(null, true)

    parser.advanceAfterBlockEnd(tok.value)

    // parse the body and possibly the error block, which is optional
    const body = parser.parseUntilBlocks('error', 'endchart')
    let errorBody = null

    if (parser.skipSymbol('error')) {
      parser.skip(lexer.TOKEN_BLOCK_END)
      errorBody = parser.parseUntilBlocks('endchart')
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

      logTrace(logger, log => {
        log(args, 'Extension args:')
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
        logger.warn('Missing query')
        callback(null, '')
        return
      }

      context.setVariable(options.var || 'chartUrl', null)

      const vars = context.getVariables(),
        newContext = new Context(vars, options),
        accountId = requireAccountId(newContext),
        chartOptions = {
          type: options.type,
          format: options.format,
          width: options.width ? toNumber(options.width) : 640,
          height: options.height ? toNumber(options.height) : 480,
        },
        nerdgraph = new NerdgraphClient()

      logTrace(logger, log => {
        log(newContext, 'Extension render context')
      })

      const result = await nerdgraph.getShareableChartUrl(
        this.apiKey,
        accountId,
        env.renderString(query, newContext),
        chartOptions,
        {
          timeout: options.timeout || 5,
        },
      )

      context.setVariable(options.var || 'chartUrl', result)

      body((err, src) => {
        if (err) {
          handleError(context, err, errorBody, callback)
          return
        }

        let source = src

        if (!source || source.trim().length === 0) {
          source = new nunjucks.runtime.SafeString((
            vars.isMarkdown ? `![](${result})` : `
              <img ${options.class ? `class="${options.class}"` : ''} src="${result}"
                width="${chartOptions.width}"
                height="${chartOptions.height}"
              />
            `
          ))
        }

        callback(null, source)
      })
    } catch (err) {
      handleError(context, err, errorBody, callback)
    }
  }
}

module.exports = ChartExtension
