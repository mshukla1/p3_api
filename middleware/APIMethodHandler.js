var solrjs = require("solrjs");
var media = require("../middleware/media");
var config = require("../config");
var SOLR_URL=config.get("solr").url;
var debug = require('debug')('p3api-server:APIMethodHandler');
var when = require("promised-io/promise").when;

var streamQuery = function(req, res, next) {
		if (req.call_method!="stream"){ next(); }


		var query = req.call_params[0];
		debug("querySOLR() req.params", req.call_params);
		var solr = new solrjs(SOLR_URL + "/" + req.call_collection);
		debug("querySOLR() query: ", query);
		when(solr.stream(query), function(results) {
			console.log("APIMethodHandler solr.streamQuery results: ", results)
			res.results = results;
			next();
		}, function(err){
			debug("Error StreamingQuery SOLR: ", err);
			next(err);
		})
}

var querySOLR = function(req, res, next) {
		if (req.call_method!="query"){ next(); }


		var query = req.call_params[0];
		debug("querySOLR() req.params", req.call_params);
		var solr = new solrjs(SOLR_URL + "/" + req.call_collection);
		debug("querySOLR() query: ", query);
		when(solr.query(query), function(results) {
			// console.log("APIMethodHandler solr.query results: ", results)
			if (!results){
				res.results=[];
			}else if (results.response){
				res.results = results;
			}else if (results.grouped){
				res.results=results;
			}else{
				res.results=[];
			}
			next();
		}, function(err){
			debug("Error Querying SOLR: ", err);
			next(err);
		})
}
var getSOLR = function(req, res, next) {
	var solr = new solrjs(SOLR_URL + "/" + req.call_collection);
	when(solr.get(req.call_params[0]), function(sresults) {
		if (sresults && sresults.doc) {
			var results = sresults.doc;

			if (results.public || (req.publicFree.indexOf(req.call_collection)>=0) || (results.owner==(req.user)) || (results.user_read && results.user_read.indexOf(req.user)>=0)) {		
				res.results = sresults;
//				console.log("Results: ", results);
				next();
			}else{
				if (!req.user){
					console.log("User not logged in, permission denied");
					res.sendStatus(401);
				}else{
					console.log("User forbidden from private data");
					res.sendStatus(403);
				}
			}
		}else{
			next();
		} 
	},function(err){
		console.log("Error in SOLR Get: ", err);
		next(err);
	});
}

module.exports = function(req,res,next){

	if (req.cacheHit && res.results){
		next();
		return;
	}
	console.log("API Method MIDDLEWARE");
	var def;			


	res.queryStart = new Date();
	//console.log("query START: ",res.queryStart);
	switch(req.call_method) {
		case "query": 
			return querySOLR(req,res,next);
			break;
		case "get":
			return getSOLR(req,res,next)
			break;
		case "stream":
			return streamQuery(req,res,next)
			break;
	}
}
