let pb_url = "playbook_json/";
let current_playbook = null;
let current_intrusion_set = null;

String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.split(search).join(replacement);
};

jQuery(document).ready(function ($) {

});

// Select a Playbook
$(document).on('click', ".playbook", function () {
    const pb_file = $(this).attr("pb_file");
    $('.playbook').removeClass('activebtn');
    $(this).addClass('activebtn');
    loadPlaybook(`${pb_url}${pb_file}`);
});

// Select a Campaign within a Playbook
$(document).on('click touchstart', '.btn-report', function (event) {
    const report_id = $(this).attr("report_id");
    highlightLink(report_id);
    displayReportByID(report_id, current_playbook);
});

// Open an Attack Pattern within a Campaign
$(document).on('click', '.ap_button', function () {
    const ap_id = $(this).attr("ap_id");
    const camp_id = $(this).attr("camp_id");
    $('#' + ap_id + "_" + camp_id).css({
        "display": "block"
    });

});

// Open the Indicator list
$(document).on('click', '.middle2', function () {
    $('.indicator-list').css({
        "display": "block"
    });
});

// Hide on close
$(document).on('click', '.close', function () {
    $('.modal').css({
        "display": "none"
    });

    $('.indicator-list').css({
        "display": "none"
    });
});

// Hide on click off
$(document).on('click touchend', function (event) {
    const et = $(event.target);
    if (et.has(".modal-content").length) {
        $(".modal").hide();
    }

    if ($(".indicator-list").is(":visible") && !et.is(".middle2") &&
        !et.is(".indicator-list") && !et.is(".indicator-list-inner") && !et.is(".indicator-list-entry")) {
        $(".indicator-list").hide();
    }
});

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

function addInfoboxIndicatorTable(playbook) {
    const indicators = getTypeFromPlaybook("indicator", playbook);

    indicators.forEach(i => {
        i['p'] = {
            type: "",
            key: "",
            value: ""
        };
        try {
            i.p.type = i.pattern.match(/\[\\?(.*?):/)[1];
            i.p.key = i.pattern.match(/:(.*?) (=|LIKE)/)[1];
            i.p.value = i.pattern.match(/(=|LIKE)( )?'(.*?)'/)[3];
        } catch (e) {
            console.log('error parsing values from STIX2 pattern');
        }
    });
    indicators.sort((a, b) =>
        compare(`${a.p.type}:${a.p.key}`, `${b.p.type}:${b.p.key}`) || compare(a.p.value, b.p.value)
    );

    const indicatorTypesForList = ['file', 'domain-name', 'url', 'ipv4-addr', 'ipv6-addr'];
    const indicatorList = indicators.filter(i => indicatorTypesForList.includes(i.p.type));
    const indicatorListByType = indicatorList.reduce((r, i, idx) => {
        const ks = Object.keys(r);
        const type = i.p.type;
        const value = i.p.value;
        i.li = `<li class="indicator-list-entry" id="${idx}"><pre class="indicator-list-inner">${value}</pre></li>`;
        if (type === 'file' && value.match(/\b[A-Fa-f0-9]{64}\b/)) {
            r['hashes'].push(i.li);
        } else if (type === 'domain-name' || type === 'ipv4-addr' || type === 'ipv6-addr' || type === 'url') {
            if (!(value.indexOf('%') > -1)) {
                r['network'].push(i.li);
            }
        }
        return r;
    }, {hashes: [], network: []});


    const listHashes = indicatorListByType['hashes'].join('');
    const listNetwork = indicatorListByType['network'].join('');

    const hashesSection = (`<section class="indicator-list-inner">` +
        `<h2 class="indicator-list-inner">File Hashes</h2><hr/>` +
        `<ul class="indicator-list-inner">${listHashes}</ul>` +
        `</section>`);
    const networkSection = (`<section class="indicator-list-inner">` +
        `<h2 class="indicator-list-inner">Network Indicators</h2><hr/>` +
        `<ul class="indicator-list-inner">${listNetwork}</ul>` +
        `</section>`);
    const msg = `File Hashes and exact Network Indicators are listed here. ` +
        `The Playbook may contain additional unlisted indicators.`;
    const indicatorListFinal = (
        `<div class="indicator-list-inner">` +
        `<h3 class="indicator-list-inner">${msg}</h3><hr/>` +
        `<br/>${hashesSection}<br/>${networkSection}` +
        `</div>`
    );

    return indicatorListFinal;
}


function addInfobox(playbook) {
    const indicatorTable = addInfoboxIndicatorTable(playbook);
    const total_campaigns = getTypeFromPlaybook("campaign", playbook).length;
    const total_indicators = getTypeFromPlaybook("indicator", playbook).length;
    const total_attackpatterns = getTypeFromPlaybook("attack-pattern", playbook).length;
    const ib_markup = (
        `<div class="left"><span>Intrusion Set: ${current_intrusion_set}</span></div>` +
        `<div class="middle"><span>Campaigns: ${total_campaigns}</span></div>` +
        `<div class="middle2"><span class="middle2">Indicators: ${total_indicators} (Click For Overview)</span></div>` +
        `<div class="right"><span>Attack Patterns: ${total_attackpatterns}</span></div>`
    );
    $('.info').empty().append(ib_markup);
    $('body').append(
        `<div class="indicator-list"><span class="close">&times;</span> ${indicatorTable}</div>`
    );
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
    let parsed_reports = [];

    reports.forEach(r => {
        const {labels} = r;
        if (labels.includes('intrusion-set')) {
            current_intrusion_set = getTypeFromReport("intrusion-set", r, playbook)[0].name;
        } else {
            let campaign = getTypeFromReport("campaign", r, playbook);
            // const first_seen = new Date(campaign[0]['first_seen']);
            // const last_seen = new Date(campaign[0]['last_seen']);
            const first_seen = new Date(campaign[0]['first_seen'].substring(0, 8));
            const last_seen = new Date(campaign[0]['last_seen'].substring(0, 8));
            let campaign_length_in_days = Math.floor((last_seen - first_seen) / 86400000);
            parsed_reports.push({
                "id": r.id,
                "first_seen": first_seen,
                "last_seen": last_seen,
                "campaign_length": campaign_length_in_days,
                "name": r['name']
            })
        }
    });

    parsed_reports.sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));

    parsed_reports.forEach(r => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const start_text = (months[r.first_seen.getMonth()]) + " " + r.first_seen.getFullYear();
        const end_text = (months[r.last_seen.getMonth()]) + " " + r.last_seen.getFullYear();
        const date_text = start_text + " to " + end_text;
        // const debug_text = date_text + " (" + r['name'] + ")";
        const report_markup = (
            `<div class="timeline_btn btn btn-report" onclick=""` +
            ` id = "${r.id}" report_id="${r.id}" style="width:95%" title=${r['name']}>${date_text}</div>`
        );
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
                ap_markup += `<div class="phases ap_button"` +
                    ` ap_id='${c[i].id}' camp_id='${campaign.id}' onclick="">${c[i].name}</div>`;
                writeAPModal(c[i], report, playbook);
            } else {
                ap_markup += '<div class="phasesblank"></div>';
            }
        });
    }
    phase_container.append(ap_markup);
}

const intersection = function () {
    return Array.from(arguments).reduce((previous, current) => {
        return previous.filter(element => {
            return current.indexOf(element) > -1;
        });
    });
};

function compare(a, b) {
    return (a > b ? 1 : ((b > a) ? -1 : 0));
}

function writeAPModal(ap, report, playbook) {
    //Need to find the intersection of indicators that use the attack pattern, and are in the report.
    const ap_indicators = getRelatedIndicators(ap.id, playbook);
    const campaign = getTypeFromReport("campaign", report, playbook)[0];
    const campaign_indicators = getRelatedIndicators(campaign.id, playbook);
    const indicators = Array.from(new Set(intersection(ap_indicators, campaign_indicators)));

    // There is no javascript library for parsing STIX2 indicator patterns
    indicators.forEach(i => {
        i['p'] = {
            type: "",
            key: "",
            value: ""
        };
        try {
            i.p.type = i.pattern.match(/\[\\?(.*?):/)[1];
            i.p.key = i.pattern.match(/:(.*?) (=|LIKE)/)[1];
            i.p.value = i.pattern.match(/(=|LIKE)( )?'(.*?)'/)[3];
        } catch (e) {
            // console.log('error parsing values from STIX2 pattern');
        }
    });
    indicators.sort((a, b) =>
        compare(`${a.p.type}:${a.p.key}`, `${b.p.type}:${b.p.key}`) || compare(a.p.value, b.p.value)
    );

    // Retrieve the indicator description from the relationship between indicator and attack-pattern
    const relationships = getTypeFromReport("relationship", report, playbook);

    let markup = `<div id="${ap.id}_${campaign.id}" class="modal">`;
    markup += '<div class="modal-content"><span class="close">&times;</span>';
    try {
        markup += `<p><b>Technique:</b> ${ap.name}` +
            `<a href="${ap['external_references'][0].url}" target="_blank"><sup>REFERENCE</sup></a></p><br>`;
    } catch (e) {
        // The playbook contains an incomplete attack-pattern
        // console.log(JSON.stringify({ap: ap, e: e}));
    }
    if (indicators.length === 0) {
        markup += '<span>No Indicators Available</span><br>';
    } else {
        markup += '<table id="indicator-table">' +
            '<tr><th id="indicator-description">Description</th><th id="indicator-pattern">Indicator Pattern</th></tr>';
        indicators.forEach(i => {
            // Retrieve the indicator description from the relationship between indicator and attack-pattern
            // Provide backwards-compatibility with playbooks that stored the description in the indicator object
            const description = relationships
                .filter(r => (r && (r.source_ref === i.id) && (r.target_ref === ap.id)))[0].description || i.name;
            try {
                markup += `<tr><td>${description}</td><td class="indicators">${escapeHtml(i.pattern)}</td></tr>`;
            } catch (e) {
                // The playbook contains a malformed relationship or description
                // console.log(JSON.stringify({text: text, e: e}));
            }
        });
        markup += '</table>';
    }
    markup += '</div>';
    $('body').append(markup);
}

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

// Demo
const step0link = 'https://unit42.paloaltonetworks.com/unit42-introducing-the-adversary-playbook-first-up-oilrig/';
const tour = new Tour({
    template: function (i, step) {
        return (
            `<div class='popover tour'><div class='arrow'></div><h3 class='popover-title'> ${step.title}</h3>` +
            `<div class='popover-content'> ${step.content}</div><div class='popover-navigation'>` +
            `<div class='popover-btn-group'><button class='popover-btn-tour-control' data-role='prev'>Prev</button>` +
            `<button class='popover-btn-tour-control' data-role='next'>Next</button>` +
            `<button class='popover-btn-tour-control' data-role='end'>End</button></div></div></div>`
        );
    },
    steps: [
        {
            element: "",
            title: "Welcome to the Unit 42 Playbook Viewer",
            content: "The Playbook viewer is a system for parsing STIX2 content that contains an Adversary Playbook. " +
                "You can read more about this <a href='" + step0link + "' target='_blank' >here</a>" +
                " or follow the prompts to check it out.",
            orphan: true
        },
        {
            element: "#playbook_oilrig",
            title: "Select a Playbook",
            content: "A Playbook is a collection of Plays. " +
                "Plays are campaigns that were conducted by an adversary, you can select them from this list.",
            // Use the Oilrig Playbook for the demo
            // onNext: () => $('#playbook_oilrig').trigger('click')
            onNext: () => $('.box.sidebar div:first-of-type').trigger('click')
        },
        {
            element: ".description",
            title: "Each Playbook has a description",
            content: "The description provides a general overview as well as background information on the adversary."
        },
        {
            element: ".timeline",
            title: "Playbooks contain one or more Plays",
            content: "The Play is a representation of a campaign" +
                " the adversary conducted using specific techniques and tools."
        },
        {
            // element: "#report--e76e88c8-699a-4eeb-a8e5-3645826d6455",
            element: ".box.timeline :first-child",
            title: "The newest Play is shown first",
            content: "",
            // the newest play is selected by default
            // switch to the oldest play
            // onNext: () => $('#report--418eec9b-ca2d-48d6-92cc-7cf47b159e8c').trigger('click')
            onNext: () => $('.box.timeline :last-child').trigger('click')
        },
        {
            // element: "#report--418eec9b-ca2d-48d6-92cc-7cf47b159e8c",
            element: '.box.timeline :last-child',
            title: "The oldest Play is shown last",
            content: "",
            // switch back to the newest play
            // onNext: () => $('#report--e76e88c8-699a-4eeb-a8e5-3645826d6455').trigger('click')
            onPrev: () => $('.box.timeline :first-child').trigger('click'),
            onNext: () => $('.box.timeline :first-child').trigger('click')
        },
        {
            element: ".bottomheader",
            title: "Structure of a Play",
            content: "Plays contain the specific Mitre ATT&CK techniques used by the adversary.",
            placement: "top",
            // technique: T1367: Spear phishing messages with malicious attachments
            // hardcoding the id here is not ideal
            onPrev: () => $('.box.timeline :last-child').trigger('click'),
            onNext: () => $("[ap_id='attack-pattern--e24a9f99-cb76-42a3-a50b-464668773e97']").trigger('click')
        },
        {
            element: "#indicator-table",
            title: "Technique cards contain a STIX2 indicator pattern and a description.",
            content: "",
            placement: "top",
            onPrev: () => $('.close').trigger('click'),
        },
        {
            element: "#indicator-description",
            title: "Description",
            content: "The description provides context about an indicator identified by an analyst."
        },
        {
            element: "#indicator-pattern",
            title: "Indicator Pattern",
            content: "The indicator pattern tells you what to look for" +
                " on your hosts or network to identify this technique or adversary in action.",
            onNext: () => $('.close').trigger('click')
        },
        {
            element: ".sidebar",
            title: "View additional Playbooks",
            content: "You can continue viewing OilRig or choose another adversary." +
                " We will continue adding new and updating old playbooks, so please check back.",
        }
    ],
    onEnd: () => $("html, body").animate({scrollTop: 0}, "slow")
});

tour.init();
tour.start();
// always start the tour
// tour.restart();