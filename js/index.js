let pb_url = "playbook_json/";
let current_playbook = null;
let current_intrusion_set = null;

String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.split(search).join(replacement);
};

function addDescription(report, playbook) {
    const descriptionElement = $('.description');
    if (report === null) {
        const reports = playbook['objects'].filter(o => o.type === 'report');
        reports.forEach(r => {
            const {description} = r;
            if (description !== undefined) {
                descriptionElement.html(description.replaceAll("\r\n", "</br>"));
            }
        });
    } else {
        const {description} = report;
        if (description !== undefined) {
            descriptionElement.html(description.replace("\n", "</br>"));
        }
    }
}

function getObjectFromPlaybook(id_in, playbook) {
    const {objects} = playbook;
    return objects.find(o => o.id === id_in);
}

function getTypeFromPlaybook(type, playbook) {
    const {objects} = playbook;
    return objects.filter(o => o.type === type);
}

function getTypeFromReport(type, report, playbook) {
    return report.object_refs.filter(o => o.startsWith(type)).map(o => getObjectFromPlaybook(o, playbook));
}

jQuery(document).ready(function ($) {

});

$(document).on('click', '.ap_button', function () {
    const ap_id = $(this).attr("ap_id");
    const camp_id = $(this).attr("camp_id");
    $('#' + ap_id + "_" + camp_id).css({
        "display": "block"
    });
});

$(document).on('click', ".playbook", function () {
    const pb_file = $(this).attr("pb_file");
    loadPlaybook(`${pb_url}${pb_file}`);
});


$(document).on('click touchstart', '.btn-report', function (event) {
    let report_id = $(this).attr("report_id");
    highlightLink(report_id);
    displayReportByID(report_id, current_playbook);
});

function getRelatedIndicators(in_id, playbook) {
    const all_relationships = playbook['objects'].filter(o => o.type === 'relationship');
    return all_relationships
        .filter(o => (o.source_ref.startsWith("indicator--") && o.target_ref === in_id))
        .map(r => getObjectFromPlaybook(r.source_ref, playbook));
}

function loadPlaybook(pb_url) {
    $.getJSON(pb_url, playbook => {
        addDescription(null, playbook);
        addReportLinks(playbook);
        highlightLoadFirstLink(playbook);
        addInfobox(playbook);
        storeCurrentPlaybook(playbook);
    });
}

function highlightLoadFirstLink(playbook) {
    const phase_links = document.getElementsByClassName('timeline_btn');
    const report_id = phase_links[0].getAttribute("report_id");
    phase_links[0].style.background = "#ef9124";
    displayReportByID(report_id, playbook);
}

function highlightLink(report_id) {
    const phase_links = document.getElementsByClassName('timeline_btn');
    Array.from(phase_links).forEach(l => {
        l.getAttribute("report_id") === report_id ? l.style.background = "#ef9124" : l.style.background = null;
    });
}

function addInfobox(playbook) {
    const total_campaigns = getTypeFromPlaybook("campaign", playbook).length;
    const total_indicators = getTypeFromPlaybook("indicator", playbook).length;
    const total_attackpatterns = getTypeFromPlaybook("attack-pattern", playbook).length;
    const ib_markup =
        `<div class="left"><span>Intrusion Set: ${current_intrusion_set}</span></div>` +
        `<div class="middle"><span>Campaigns: ${total_campaigns}</span></div>` +
        `<div class="middle2"><span>Indicators: ${total_indicators}</span></div>` +
        `<div class="right"><span>Attack Patterns: ${total_attackpatterns}</span></div>`;
    $('.info').empty().append(ib_markup);
}

function storeCurrentPlaybook(playbook) {
    current_playbook = playbook;
}

function displayReportByID(report_id, playbook) {
    //Get the report content from the ID
    let report = getObjectFromPlaybook(report_id, playbook);
    displayReport(report, playbook);
}

function displayReport(report, playbook) {
    //Build the HTML table for this report
    buildPhaseContainer(report, playbook);
}

function addReportLinks(playbook) {
    //For now this just lists the plays, by name, at the bottom, and makes them Buttons
    let reports = playbook['objects'].filter(o => o.type === 'report');
    $('.timeline').empty();
    //The Main report is only going to contain other reports
    //The other reports contain a campaign object with a date inside it.
    // let playbook_markup = "";
    // let report_markup = "";
    let earliest = null;
    let latest = null;
    let parsed_reports = [];

    reports.forEach(r => {
        const {labels} = r;
        if (labels.includes('intrusion-set')) {
            current_intrusion_set = getTypeFromReport("intrusion-set", r, playbook)[0].name;
        } else {
            let campaign = getTypeFromReport("campaign", r, playbook);
            const first_seen = new Date(campaign[0]['first_seen']);
            if (earliest === null || first_seen < earliest) {
                earliest = first_seen;
            }
            const last_seen = new Date(campaign[0]['last_seen']);
            if (latest === null || last_seen > latest) {
                latest = last_seen;
            }
            let campaign_length = Math.floor((last_seen - first_seen) / 86400000);
            parsed_reports.push({
                "id": r.id,
                "first_seen": first_seen,
                "last_seen": last_seen,
                "campaign_length": campaign_length,
                "name": r['name']
            })
        }
    });

    parsed_reports.forEach(r => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const start_text = (months[r.first_seen.getMonth()]) + " " + r.first_seen.getFullYear();
        const end_text = (months[r.last_seen.getMonth()]) + " " + r.last_seen.getFullYear();
        const date_text = start_text + " to " + end_text;
        const debug_text = r['name'] + " : " + date_text;
        const report_markup =
            `<div class="timeline_btn btn btn-report" 
                  onclick="" report_id="${r.id}" 
                  style="width:95%">${debug_text}</div>`;
        $('.timeline').append(report_markup);
    });
}

function filterByKCP(phase, attack_patterns) {
    return attack_patterns.filter(ap => {
        let item;
        for (item in ap.kill_chain_phases) {
            let kc = ap.kill_chain_phases[item];
            if (kc.kill_chain_name === "lockheed" && kc.phase_name === phase) {
                return ap;
            }
        }
    });
}

function buildPhaseContainer(report, playbook) {
    let attack_patterns = getTypeFromReport("attack-pattern", report, playbook);
    let campaign = getTypeFromReport("campaign", report, playbook)[0];

    let recon = filterByKCP("recon", attack_patterns);
    let weap = filterByKCP("weaponization", attack_patterns);
    let delivery = filterByKCP("delivery", attack_patterns);
    let exploit = filterByKCP("exploitation", attack_patterns);
    let install = filterByKCP("installation", attack_patterns);
    let command = filterByKCP("command-and-control", attack_patterns);
    let objective = filterByKCP("act-on-objectives", attack_patterns);

    let table_length = Math.max(
        recon.length, weap.length, delivery.length, exploit.length, install.length, command.length, objective.length
    );
    const columns = [recon, weap, delivery, exploit, install, command, objective];
    let phase_container = $('.phasescontainer');
    phase_container.empty();
    let ap_markup = '';
    for (let i = 0; i < table_length; i++) {
        columns.forEach(c => {
            if (c.length > i) {
                ap_markup += `<div class="phases ap_button" ap_id='${c[i].id}' camp_id='${campaign.id}' onclick="">${c[i].name}</div>`;
                writeAPModal(c[i], report, playbook);
            } else {
                ap_markup += '<div class="phasesblank"></div>';
            }
        });
    }
    phase_container.append(ap_markup);
}

let intersection = function () {
    return Array.from(arguments).reduce((previous, current) => {
        return previous.filter(element => {
            return current.indexOf(element) > -1;
        });
    });
};

function writeAPModal(ap, report, playbook) {
    //Need to find the intersection of indicators that use the attack pattern, and are in the report.
    const ap_indicators = getRelatedIndicators(ap.id, playbook);
    const campaign = getTypeFromReport("campaign", report, playbook)[0];
    const campaign_indicators = getRelatedIndicators(campaign.id, playbook);
    const indicators = Array.from(new Set(intersection(ap_indicators, campaign_indicators)));

    let markup = `<div id="${ap.id}_${campaign.id}" class="modal">`;
    markup += '<div class="modal-content"><span class="close">&times;</span>';
    markup += `<p><b>Technique:</b> ${ap.name} <a href="${ap['external_references'][0].url}" target="_blank"><sup>REFERENCE</sup></a></p><br>`;
    if (indicators.length === 0) {
        markup += '<span>No Indicators Available</span><br>';
    } else {
        markup += '<table><tr><th>Description</th><th>Indicator Pattern</th></tr>';
        indicators.forEach(i => {
            markup += `<tr><td>${i.name}</td><td class="indicators">${escapeHtml(i.pattern)}</td></tr>`;
        });
        markup += '</table>';
    }
    markup += '</div>';
    $('body').append(markup);
}

$(document).on('click', '.ap_button', function () {
    const ap_id = $(this).attr("ap_id");
    const camp_id = $(this).attr("camp_id");
    $('#' + ap_id + "_" + camp_id).css({
        "display": "block"
    });

});

$(document).on('click', '.close', function () {
    $('.modal').css({
        "display": "none"
    });

});

$(document).on('click touchend', function (event) {
    if ($(event.target).has(".modal-content").length) {
        $(".modal").hide();
    }
});

function escapeHtml(text) {
    'use strict';
    return text.replace(/["&<>]/g, function (a) {
        return {
            '"': '&quot;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[a];
    });
}
