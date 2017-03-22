ElasticSear Loader
---
Script desarrollado para cargar estructuras de datos en ElasticSearch

Uso
---
```
$ npm install git+https://bitbucket.org/conicytdev/elastic-search-loader.git --save
```

Ejemplo
---

```js
const elasticsearchConfig = require('elastic-search-loader')

// estructura de mapeo de los datos
const mapping = {
		properties: {
			campo1: {
				type: 'text',
				fielddata: true							
			},
			campo2: {
				type: 'text',
				fielddata: true,
				analyzer: 'folding_spanish',
				fields: {
					raw: {
						type: 'text',
						index: 'not_analyzed'
					}
				}
			},
			campo3: {
				type: 'text',
				fielddata: true,
				analyzer: 'folding_spanish',
				fields: {
					raw: {
						type: 'text',
						index: 'not_analyzed'
					}
				}
			}
		}
	}
const settings = {
		analysis: {
		    analyzer: {
				folding_spanish: {
					tokenizer: 'keyword',
					filter:  [ 'asciifolding','lowercase','uppercase','standard']
				}
		    }
	  	}
	}

const data = [
	{campo1: 'Valor campo 1', campo2:'Valor campo 2', campo3: 'Valor campo 3'},
	{campo1: 'Valor campo 1', campo2:'Valor campo 2', campo3: 'Valor campo 3'},
	{campo1: 'Valor campo 1', campo2:'Valor campo 3', campo3: 'Valor campo 3'},
]

var elasticInstance = new elasticsearchConfig.Client({
	host: 'IP:PORT',
	indice: 'nombre_indice',
	type: 'tipo_indice',
	settings: settings,
	mapping: mapping,
	bulkLimit: 2,
	data: data,
	debug: true
})

elasticInstance.createIndice(function (err) {
	if(error) throw new Error(err)
	console.log('DONE')
	process.exit()
})

elasticInstance.load(function (err) {
	if(err) throw new Error(err)
	else console.log('LISTO')
	process.exit()
})

```