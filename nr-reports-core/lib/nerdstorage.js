'use strict'

const { NerdgraphClient } = require("./nerdgraph"),
  { getNested } = require('./util')

async function readDoc(
  apiKey,
  nerdgraph,
  collectionName,
  documentId,
  accountId,
  nerdletPackageId,
) {
  const results = await nerdgraph.query(
      apiKey,
      `
      {
        actor {
          account(id: $accountId) {
            nerdStorage {
              document(documentId: $documentId, collection: $collectionId)
            }
          }
        }
      }
      `,
      {
        accountId: ['Int!', new Number(accountId)],
        collectionId: ['String!', collectionName],
        documentId: ['String!', documentId],
      },
      {
        headers: {
          'newrelic-package-id': nerdletPackageId,
        }
      }
    )

  return getNested(
    results[0],
    'actor.account.nerdStorage.document'
  )
}

async function readDocList(
  apiKey,
  nerdgraph,
  collectionName,
  accountId,
  nerdletPackageId,
) {
  const results = await nerdgraph.query(
      apiKey,
      `
      {
        actor {
          account(id: $accountId) {
            nerdStorage {
              collection(collection: $collectionId) {
                document
                id
              }
            }
          }
        }
      }
      `,
      {
        accountId: ['Int!', accountId],
        collectionId: ['String!', collectionName],
      },
      {
        headers: {
          'newrelic-package-id': nerdletPackageId,
        }
      }
    ),
    documents = getNested(
      results[0],
      'actor.account.nerdStorage.collection'
    )

  if (!documents || documents.length === 0) {
    return null
  }

  if (documents.length === 1) {
    return documents.document
  }

  return documents.reduce((a, x) => {
    return a.concat(x.document)
  }, [])
}

async function writeDoc(
  apiKey,
  nerdgraph,
  collectionName,
  documentId,
  accountId,
  data,
  nerdletPackageId,
) {
  await nerdgraph.query(
    apiKey,
    `
    {
      nerdStorageWriteDocument(
        collection: $collectionId,
        document: $document,
        documentId: $documentId,
        scope: {id: $accountId, name: ACCOUNT},
        scopeByActor: false
      )
    }
    `,
    {
      accountId: ['String!', new String(accountId)],
      collectionId: ['String!', collectionName],
      document: [
        'NerdStorageDocument!',
        JSON.stringify(data)
      ],
      documentId: ['String!', documentId],
    },
    {
      mutation: true,
      headers: {
        'newrelic-package-id': nerdletPackageId,
      }
    },
  )
}

class NerdstorageClient {
  constructor(
    apiKey,
    nerdletPackageId,
    accountId,
  ) {
    this.apiKey = apiKey
    this.nerdletPackageId = nerdletPackageId
    this.accountId = accountId
    this.nerdgraph = new NerdgraphClient()
  }

  async deleteCollection(
    collectionName
  ) {
    await this.nerdgraph.query(
      this.apiKey,
      `
      {
        nerdStorageDeleteCollection(
          collection: $collectionId,
          scope: {id: $accountId, name: ACCOUNT}
        ) {
          deleted
        }
      }`,
      {
        accountId: ['String!', new String(this.accountId)],
        collectionId: ['String!', collectionName],
      },
      {
        mutation: true,
        headers: {
          'newrelic-package-id': this.nerdletPackageId,
        },
      }
    )
  }

  async readDocument(
    collectionName,
    documentId,
  ) {
    return await readDoc(
      this.apiKey,
      this.nerdgraph,
      collectionName,
      documentId,
      this.accountId,
      this.nerdletPackageId,
    )
  }

  async readDocumentList(
    collectionName,
  ) {
    return await readDocList(
      this.apiKey,
      this.nerdgraph,
      collectionName,
      this.accountId,
      this.nerdletPackageId,
    )
  }

  async writeDocument(
    collectionName,
    documentId,
    document,
  ) {
    await writeDoc(
      this.apiKey,
      this.nerdgraph,
      collectionName,
      documentId,
      this.accountId,
      document,
      this.nerdletPackageId,
    )
  }

  async writeDocumentList(
    collectionName,
    docPrefix,
    data,
  ) {
    let done = false,
      curr = 0,
      index = 0,
      count = data.length

    while (!done) {
      const values = data.slice(curr, curr + 500),
        docId = `${docPrefix}--${index}`

      await writeDoc(
        this.apiKey,
        this.nerdgraph,
        collectionName,
        docId,
        this.accountId,
        values,
        this.nerdletPackageId,
      )

      curr += 500
      index += 1
      done = curr > count
    }
  }
}

module.exports = {
  NerdstorageClient,
}
