const nunjucks = require('nunjucks')

nunjucks.configure(process.argv[2])
console.log(nunjucks.render(process.argv[3]))

