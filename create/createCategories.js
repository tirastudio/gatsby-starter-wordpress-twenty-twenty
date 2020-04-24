const {normalizePath} = require("../src/utils/normalize-path");
const {resolve} = require(`path`)
const chunk = require(`lodash/chunk`)


module.exports = async ({actions, graphql}, options) => {
    const {perPage} = options


    const {data: categoryData} = await graphql(`
    {  
      allWpTermNode {
        nodes {
          ... on WpCategory {
            name
            uri
            databaseId
          }
        }
      }
    }`)

    if (!categoryData.allWpTermNode.nodes || categoryData.allWpTermNode.nodes.length === 0) return

    await Promise.all(
        categoryData.allWpTermNode.nodes.map(async (category, index) => {

            const {data} = await graphql(`
            {
                allWpPost(filter: {categories: {nodes: {elemMatch: {databaseId: {eq: ${category.databaseId} }}}}}, sort: { fields: date, order: DESC }) {
                    nodes {
                        uri
                        id
                        date
                    }
                }
            }
          `)

            if (!data.allWpPost.nodes || data.allWpPost.nodes.length === 0) return


            const chunkedContentNodes = chunk(data.allWpPost.nodes, perPage)

            const categoryPath = normalizePath(category.uri)

            await Promise.all(
                chunkedContentNodes.map(async (nodesChunk, index) => {
                    const firstNode = nodesChunk[0]


                    await actions.createPage({
                        component: resolve(`./src/templates/archive.js`),
                        path: index === 0 ? categoryPath : `${categoryPath}page/${index + 1}/`,
                        context: {
                            firstId: firstNode.id,
                            archiveType: 'category',
                            archivePath: categoryPath,
                            categoryDatabaseId: category.databaseId,
                            offset: perPage * index,
                            pageNumber: index + 1,
                            totalPages: chunkedContentNodes.length,
                            perPage,
                        },
                    })
                })
            )
        })
    )
}