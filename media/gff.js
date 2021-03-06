var debug = require("debug")("media");
var when = require("promised-io/promise").when;
var es = require("event-stream");
var wrap = require("../util/linewrap");


function serializeRow(type,o){
	var row=[]
	if (o.feature_type=="source") {
		o.feature_type="region"
	}
	if (o.feature_type=="misc_RNA"){
		o.feature_type="transcript"
	}

	if (o.feature_type=="region") {
		row.push("##sequence-region\taccn|" + o.accession + "\t" + o.start + "\t" + o.end + "\n");
		return;
	}

	row.push( "accn|" + o.accession+ "\t"+o.annotation+ "\t" + o.feature_type + "\t" + o.start+ "\t" + o.end + "\t.\t" + o.strand+"\t0\t");
	switch(o.annotation) {
		case "PATRIC":
			row.push("ID=" + o.patric_id);
			break;
		case "RefSeq":
			row.push("ID=" + o.refseq_locus_tag);
			break;
	}	

	if (o.refseq_locus_tag) {
		row.push(";locus_tag=" + o.refseq_locus_tag);
	}

	if (o.product) {
		row.push(";product=" +o.product);
	}

	if (o.gene) {
		row.push(";gene=" + o.gene);
	}	
	
	if (o.go) {
		row.push(";Ontology_term=" + o.go);
	}

	if (o.ec) {
		row.push(";ec_number=" + o.ec.join("|"));
	}
		
	return row.join("") + "\n"

}


module.exports = {
	contentType: "application/gff",
	serialize: function(req,res,next){
		debug("application/sralign+dna+fasta")

		if (req.isDownload){
			res.attachment('patric3_' + req.call_collection + '.gff');
			// res.set("content-disposition", "attachment; filename=patric_genomes.fasta");
		}

		if (req.call_method=="stream"){
			when(res.results, function(results){
				debug("res.results: ", results)
				var docCount=0;
				var head;
				
				if (!results.stream){
					throw Error("Expected ReadStream in Serializer")
				}

				results.stream.pipe(es.mapSync(function(data){
			            if (!head){
			                    head = data;
			            }else{
		                    // console.log(JSON.stringify(data));
		                    if (docCount<1){
								res.write("##gff-version 3\n");
								res.write("#Genome: " + data.genome_id + "\t" + data.genome_name);
								if (data.product) {
									res.write(" " + data.product);
								}
		                    }
		                   res.write(serializeRow(req.call_collection,data));
		                   docCount++;
			            }
			    })).on('end', function(){
			    	console.log("Exported " + docCount + " Documents");
			    	res.end();
			    })
			});
		}else{

			if (res.results && res.results.response && res.results.response.docs && res.results.response.docs.length>0) {
				res.write("##gff-version 3\n");
				res.write("#Genome: " + res.results.response.docs[0].genome_id + "\t" + res.results.response.docs[0].genome_name);
				if (res.results.response.docs[0].product) {
					res.write(" " + res.results.response.docs[0].product);
				}
				res.write("\n");
				res.results.response.docs.forEach(function(o){
					res.write(serializeRow(req.call_collection,o));
				});
			}
			res.end();
		}
	}
}
