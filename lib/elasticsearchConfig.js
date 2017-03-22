/** 
 * @author Manuel Villafañe <mvillafane@conicyt.cl>
 * @file lib/elasticsearchConfig
 * @module lib/elasticsearchConfig
 */

/** @constant
    @type {object}
    @default
*/
const elasticsearch = require('elasticsearch')

/** @constant
    @type {object}
    @default
*/
const async         = require('async') 

/** @constant
    @type {object}
    @default
*/
const path = require('path')

/** @constant
    @type {object}
    @default
*/
const fs = require('fs')

/** @constant
    @type {object}
    @default
*/
const validateip = require('validate-ip')

module.exports = elasticsearchConfig

function elasticsearchConfig (conf) {
		
	if(!conf.host) throw new Error('Debe especificar el HOST de ElasticSearch')
	this.host = conf.host
		
	this.elastic = elasticsearch.Client({
		host: conf.host
	})
	
	
	if(!conf.indice) throw new Error('Debe especificar el indice en ElasticSearch')
	this.indice = conf.indice

	if(!conf.type) throw new Error('Debe especificar el tipo')
	this.type    = conf.type
	
	if(conf.mapping && !conf.settings) throw new Error('Debe especificar la propiedad settings')
	
	if(!conf.mapping && conf.settings) throw new Error('Debe especificar la propiedad mapping')

	this.mapping  = conf.mapping || false
	this.debug    = conf.debug || false
	this.settings = conf.settings || false
}

elasticsearchConfig.prototype.createIndice = function (callback) {
	var esHost      = this.host
	var esIndice    = this.indice
	var elastic     = this.elastic
	var debug       = this.debug
	var esSettings  = this.settings
	var esType      = this.type
	var esMapping   = this.mapping	
	var esBulkLimit = this.bulkLimit
	var pathLog     = path.dirname(require.main.filename) + '/elasticSearchLoader.log'
	var initBulk    = 0

	async.waterfall(
		[
			serverPing,
			existsIndice,
			deleteIndice,
			createIndice,
			setSettings,
			setMapping
		],
		function (err) {
			if(err) throw new Error(err)
			else callback(null)
		}
	)

	/** @function 
		@description Escribe las salidas de los log del script
	*/
	function writeLog(strLog) {
		fs.appendFile(pathLog, strLog + "\n", function(err) {
			if(err) return console.log(err)			
		})		
	}

	/** @function 
		@description Verifica si el server de ElasticSearch especificado esta en linea
		@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
		@returns {function} callback
	*/
	function serverPing(callback) {
		writeLog("\n______________________________________________________________________________\n")
		if(debug) writeLog('Consultando host: ' + esHost + "\t" + new Date())
		elastic.ping(
			{ requestTimeout: 3000 },
			function (err) {
				if (err) throw new Error(err)
				else callback(null)
			})
	}

	/** @function 
		@description Verifica si el indice existe en ElasticSearch
		@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
		@returns {function} callback
	*/
	function existsIndice(callback) {
		if(debug) writeLog('Consultando indice: '+ esIndice + "\t" + new Date())
		elastic.indices.exists(
			{ index: esIndice },
			function (err, resp) {
				if (err) throw new Error(err)
				else callback(null, resp)
			})
	}

	/** @function 
	@description Elimina el indice en ElasticSearch
	@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
	@returns {function} callback
	*/
	function deleteIndice(eliminar, callback) {
		if(debug) writeLog('Eliminando indice: ' + esIndice + "\t" + new Date())
		if(eliminar){
			elastic.indices.delete(
									{ index: esIndice }, 
									function (err, resp) {
										if (err) throw new Error(err)
										else callback(null)
									})
		}else callback(null)
	}

	/** @function 
		@description Crea el indice en ElasticSearch
		@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
		@returns {function} callback
	*/
	function createIndice(callback) {
		if(debug) writeLog('Creando indice: ' + esIndice + "\t" + new Date())
		elastic.indices.create(
									{ index: esIndice }, 
									function (err, resp) {
										if (err) throw new Error(err)
										else callback(null)
									})
		
	}

	/** @function 
		@description Aplica la propiedad settings del indice
		@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
		@returns {function} callback
	*/

	function setSettings(callback) {
		if(esSettings && esMapping){			
			if(debug) writeLog('Creando los settings' + "\t" + new Date())
			elastic.indices.close({index: esIndice}, function (err, resp) {
				if(err) throw new Error(err)
				else{
					elastic.indices.putSettings({
						index: esIndice,
						body: esSettings
					}, function (err, resp) {
						if (err) throw new Error(err)
						else{
							elastic.indices.open({index: esIndice}, function (err, resp) {
								if(err) throw new Error(err)
								else callback(null)
								
							})
						}
					})
				}
			})
		}else callback(null)
	}

	/** @function 
		@description Crea el mapping de los datos en ElasticSearch
		@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
		@returns {function} callback
	*/
	function setMapping(callback) {
		esBulkLimit = esBulkLimit - 1
		if(esMapping && esSettings){
			if(debug) writeLog('Creando el mapping' + "\t\t" + new Date())
			elastic.indices.putMapping({
											index: 	esIndice,
											type: 	esType,
											body: 	esMapping
										}, function (err, resp) {
											if (err) throw new Error(err)
										    else callback(null, 0, esBulkLimit)
										})			
		}else callback(null, 0, esBulkLimit)

	}
}


elasticsearchConfig.prototype.load = function (data, callback) {	
	var esIndice    = this.indice
	var esType      = this.type
	var elastic     = this.elastic
	var esData      = data

	async.waterfall(
		[
			bulkData
		],
		function (err) {
			if(err) throw new Error(err)
			else callback(null)
		}
	)


	/** @function 
	@description Consulta los datos en MSSQL a travez de WSO2, esta es una función recursiva, y se ejecuta hasta que el resultado de la busqueda en MSSQL no retorna datos
	@param {string} token de autorización
	@param {number} valor de inicio para el offset de datos en MSSQL
	@param {number} valor de fin para el offset de datos en MSSQL
	@param {function} callback Recibe como parametro una función callback, la cual se invoca para continuar a la siguiente función o gatillar un error
	*/

	function bulkData(callback) {
		var dataBulk = []
		esData.forEach(function (item) {
			dataBulk.push({
				index: {
							_index: esIndice, 
							_type: 	esType, 
							_id: 	(item.id !== undefined) ? item.id : null
						},
			})
			dataBulk.push(item)
		})

		insertInElastic(dataBulk, function (err) {
			if(err) throw new Error(err)
			else{
				callback(null)
			}
		})
	}

	function insertInElastic(dataBulk, callback) {
		elastic.bulk({
			body: dataBulk
		},function (err, resp) {
			if(resp.errors) {
				callback(JSON.stringify(resp))
			}else if(err) {
				console.log(JSON.stringify(dataBulk))
				callback(err)
			}
			else callback(null)
		})
	}
	
}

