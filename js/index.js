var pb_url = "playbook_json/"
var current_playbook = null;
var current_intrusion_set = null;
var total_indicators = null;
var total_attackpatterns = null;
var total_campaigns = null;


String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.split(search).join(replacement);
};


function addDescription(report, playbook) {
	if (report == null) {
		var reports = getByType("report", playbook['objects']);
		for (report in reports) {
			if (reports[report].description != undefined) {
				$('.description').html(reports[report].description.replaceAll("\r\n", "</br>"));
			}
		}
	} else if (report.description != undefined) {
		$('.description').html(report.description.replace("\n", "</br>"));
	}
}


function getObjectFromPlaybook(id_in, playbook) {
	return playbook.objects.find(function(obj) {
		if (id_in == obj.id) {
			return obj
		}
	});
}

function getTypeFromPlaybook(type, playbook) {
	var return_array = [];
	for (var i = 0; i < playbook.objects.length; i++) {
		if (playbook.objects[i].type == type) {
			return_array.push(playbook.objects[i]);
		}
	}
	return return_array;

}


function getTypeFromReport(type, report, playbook) {
	var return_array = [];
	for (item in report.object_refs) {
		if (report.object_refs[item].startsWith(type)) {
			return_array.push(getObjectFromPlaybook(report.object_refs[item], playbook));
		}
	}
	return return_array;
}

jQuery(document).ready(function($) {

});



$('#playbook_button').on('click' , function() {
	var pb_file = $(this).attr("pb_file");
	var playbook;
	loadPlaybook(pb_url + pb_file, playbook);
});


$(document).on('click touchstart', '.btn-report', function(event) {
	var report_id = $(this).attr("report_id");
	highlightLink(report_id);
	displayReportByID(report_id, current_playbook);

});


function getRelatedIndicators(in_id, playbook) {

	all_rels = getByType("relationship", playbook['objects'])
	var related_indicators = [];
	related_references = all_rels.filter(function(obj) {
		if (obj.source_ref.startsWith("indicator--") && obj.target_ref == in_id) {
			return obj.source_ref;
		}
	})
	for (i = 0; i < related_references.length; i++) {
		related_indicators.push(getObjectFromPlaybook(related_references[i].source_ref, playbook));
	}
	return related_indicators;
}

function loadPlaybook(pb_url, playbook) {
	$.getJSON(pb_url, function(data) {
		playbook = data;
		var reports = getByType("report", playbook['objects']);
		total_indicators = 0;
		total_attackpatterns = 0;
		total_campaigns = 0;
		addDescription(null, playbook);
		addReportLinks(playbook);
		highlightLoadFirstLink(playbook);
		addInfobox(playbook);
		storeCurrentPlaybook(playbook);
	})

}

function highlightLoadFirstLink(playbook) {
	var links = document.getElementsByClassName('timeline_btn');
	links[0].style.background = "#ef9124";
	var report_id = links[0].getAttribute("report_id");
	displayReportByID(report_id, playbook);
}

function highlightLink(report_id) {
	var links = document.getElementsByClassName('timeline_btn');
	for (len = links.length, i = 0; i < len; ++i) {
		console.log(links[i]);
		if (links[i].getAttribute("report_id") == report_id) {
			links[i].style.background = "#ef9124";
		} else {
			links[i].style.background = null;
		}
	}
}


function addInfobox(playbook) {
	var ib_markup = ""
		//Intrusion Set Name
	ib_markup = ib_markup + "<span>Intrusion Set:</span> " + current_intrusion_set
		//How Many Campaigns
	total_campaigns = getTypeFromPlaybook("campaign", playbook).length;
	//How Many Indicators
	total_indicators = getTypeFromPlaybook("indicator", playbook).length;
	//How Many Attack Patterns
	total_attackpatterns = getTypeFromPlaybook("attack-pattern", playbook).length;
	ib_markup = '<div class="left">' + ib_markup + '</div>' + '<div class="middle">' + "<span>Campaigns:</span> " + total_campaigns + '</div>' + '<div class="middle2">' + "<span>Indicators:</span> " + total_indicators + '</div>' + '<div class="right">' + "<span>Attack Patterns:</span> " + total_attackpatterns + '</div>';
	$('.info').empty();
	$('.info').append(ib_markup);
}

function storeCurrentPlaybook(playbook) {
	current_playbook = playbook;
}

function displayReportByID(report_id, playbook) {
	//Get the report content from the ID
	report = getObjectFromPlaybook(report_id, playbook)
		//Then pass the report to displayReport
	displayReport(report, playbook);
}

function displayReport(report, playbook) {
	//Build the HTML table for this report
	buildPhaseContainer(report, playbook);

}

function getByType(type, myArray) {
	return myArray.filter(function(obj) {
		if (obj.type == type) {
			return obj
		}
	})
}

function addReportLinks(playbook) {
	//For now this just lists the plays, by name, at the bottom, and makes them Buttons
	var reports = getByType("report", playbook['objects']);
	$('.timeline').empty();
	//The Main report is only going to contain other reports
	//The other reports contain a campaign object with a date inside it.
	playbook_markup = ""
	report_markup = ""
	earliest = null
	latest = null;
	var parsed_reports = []
	for (var i = 0; i < reports.length; i++) {

		if (reports[i]['labels'].includes("intrusion-set")) {
			current_intrusion_set = getTypeFromReport("intrusion-set", reports[i], playbook)[0].name;
			//Add these lines back in when I have handling for all the playbooks at once.
			//playbook_markup =  '<div class="btn btn-main-report" style="width: 90%;">VIEW ALL CAMPAIGNS</div>'
			//$('.timeline').append(playbook_markup);
		} else {
			campaign = getTypeFromReport("campaign", reports[i], playbook);
			total_campaigns = total_campaigns + 1
			first_seen = new Date(campaign[0].first_seen);

			if (earliest == null || first_seen < earliest) {
				earliest = first_seen;
			}
			last_seen = new Date(campaign[0].last_seen);
			if (latest == null || last_seen > latest) {
				latest = last_seen;
			}
			campaign_length = Math.floor((last_seen - first_seen) / 86400000);
			parsed_reports.push({
				"id": reports[i].id,
				"first_seen": first_seen,
				"last_seen": last_seen,
				"campaign_length": campaign_length
			})

		}

	}
	var total_days = Math.floor((latest - earliest) / 86400000);

	for (i = 0; i < parsed_reports.length; i++) {
		var months = new Array('January', 'February', 'March',
			'April', 'May', 'June', 'July', 'August',
			'September', 'October', 'November', 'December');
		rep = parsed_reports[i];
		start_text = (months[rep.first_seen.getMonth()]) + " " + rep.first_seen.getFullYear()
		end_text = (months[rep.last_seen.getMonth()]) + " " + rep.last_seen.getFullYear()
		date_text = start_text + " to " + end_text
		rep_width = Math.max(Math.floor(rep.campaign_length / total_days * 1), 95);
		report_markup = '<div class="timeline_btn btn btn-report" ' + 'onclick=""' + 'report_id="' + rep.id + '">' + date_text + '</div>'
		$('.timeline').append(report_markup);
	}


}



function filterByKCP(phase, attack_patterns) {
	return attack_patterns.filter(function(ap) {
		for (item in ap.kill_chain_phases) {
			kc = ap.kill_chain_phases[item];
			if (kc.kill_chain_name == "lockheed") {
				if (kc.phase_name == phase) {
					return ap;
				}
			}
		}
	})
}



function buildPhaseContainer(report, playbook) {
	attack_patterns = getTypeFromReport("attack-pattern", report, playbook)
	var recon = filterByKCP("recon", attack_patterns);
	var del = filterByKCP("delivery", attack_patterns);
	var weap = filterByKCP("weaponization", attack_patterns);
	var exploit = filterByKCP("exploitation", attack_patterns);
	var install = filterByKCP("installation", attack_patterns);
	var command = filterByKCP("command-and-control", attack_patterns);
	var objective = filterByKCP("act-on-objectives", attack_patterns);
	var delivery = del.concat(weap);
	var table_width = 6;
	var table_length = Math.max(recon.length, delivery.length, exploit.length, install.length, command.length, objective.length);
	columns = [recon, delivery, exploit, install, command, objective];
	$('.phasescontainer').empty();
	var ap_markup = "";
	for (var i = 0; i < table_length; i++) {
		for (c in columns) {
			column = columns[c];
			if (column.length > i) {
				ap_markup = ap_markup + '<div class="phases ap_button" ap_id=' + column[i].id + ' onclick=""' + '>' + column[i].name + '</div>';
				writeAPModal(column[i], playbook);
			} else {
				ap_markup = ap_markup + '<div class="phasesblank"></div>';
			}
		}
	}
	$('.phasescontainer').append(ap_markup);
}

function writeAPModal(ap, playbook) {

	var indicators = getRelatedIndicators(ap.id, playbook);
	var markup = '<div id="' + ap.id + '" class="modal">';
	markup = markup + '<div class="modal-content"> <span class="close">&times;</span>';
	markup = markup + '<p><b>Technique:</b> ' + ap.name + '<a href="' + ap['external_references'][0].url + '" target="_blank"> <sup>REFERENCE</sup></a></p><br>';
	if (indicators.length == 0) {

		markup = markup + "No Indicators Available<br>"
	} else {
		markup = markup + "<table><tr><th>Description</th><th>Indicator Pattern</th></tr>"
		for (var i = 0; i < indicators.length; i++) {
			markup = markup + "<tr><td>" + indicators[i].name + '</td><td class="indicators">' + escapeHtml(indicators[i].pattern) + "</td></tr>"
		}
		markup = markup + "</table>"
	}

	markup = markup + '</div>';
	$('body').append(markup);
}

$(document).on('click', '.ap_button', function() {
	var ap_id = $(this).attr("ap_id");
	$('#' + ap_id).css({
		"display": "block"
	});

});


$(document).on('click', '.close', function() {
	$('.modal').css({
		"display": "none"
	});

});



$(document).on('click touchend' , function(event) {
	if ($(event.target).has(".modal-content").length) {
		$(".modal").hide();
	}
});


function escapeHtml(text) {
	'use strict';
	return text.replace(/[\"&<>]/g, function(a) {
		return {
			'"': '&quot;',
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;'
		}[a];
	});
}

