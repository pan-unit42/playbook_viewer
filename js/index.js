let playbook_information = null;
let current_playbook = null;
let current_intrusion_set = null;

String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.split(search).join(replacement);
};

function emptyPlaybook() {
    $('.playbook').removeClass('activebtn');
    $('.playbook-description').html("Welcome to the Unit 42 Playbook Viewer. <br><br>Please select a playbook to begin.");
    $('.campaign-description').empty();
    $('.timeline').empty();
    $('.info1').empty();
    $('.info2').empty();
    $('.phasescontainer').empty();
    current_playbook = null;
}

function initTour() {
    const step0link = 'https://unit42.paloaltonetworks.com/unit42-introducing-the-adversary-playbook-first-up-oilrig/';

    return new Tour({
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
                element: ".playbook-description",
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
                element: ".campaign-description",
                title: "Each Campaign may have a description",
                content: "The description provides specific details about the campaign."
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
                // onNext: () => $('.close').trigger('click')
            },
            {
                element: "#indicator-malware",
                title: "Indicator Malware",
                content: "The indicator may have related malware." +
                    "Hovering over this cell will show a tooltip with additional information.",
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
}

function initEvents() {
    const tour = initTour();

    function showPlaybook() {
        const url = new URL(window.location.href);
        const pb_name = url.searchParams.get('pb');

        if (pb_name) {
            // Load the Playbook indicated by the pb parameter
            const pb_file = `${pb_name}.json`;
            $('.playbook').removeClass('activebtn');
            $(`div[pb_file='${pb_file}']`).addClass('activebtn');
            loadPlaybook(pb_file);
        } else {
            // Only start the tour if a Playbook is not specified
            emptyPlaybook();
            tour.init();
            tour.start();
            // tour.restart(); // always start the tour
        }
    }

    window.addEventListener('popstate', showPlaybook);

    // Start the tour on button click
    $(document).on('click', ".walkthrough", function () {
        emptyPlaybook();
        tour.init();
        tour.restart();
    });

    // Select a Playbook
    $(document).on('click', ".playbook", function () {
        const pb_file = $(this).attr("pb_file");
        const pb_name = pb_file.split(".")[0];

        history.pushState({}, "", `?pb=${pb_name}`);

        $('.playbook').removeClass('activebtn');
        $(this).addClass('activebtn');
        loadPlaybook(pb_file);
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

    // Open the Filter options
    $(document).on('click', '.filter', function () {
        $('.filter-options').css({
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

        $('.filter-options').css({
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

    buildFilterMenu();

    // Filter
    $(document).on('click', '.filter-button', function (data) {
        const multiselectElement = $(".filter-options-inner");

        if (multiselectElement.length === 1) {
            const selectedOptions = Array.from(multiselectElement[0].selectedOptions);

            const values = selectedOptions.map(opt => opt.value);

            doFilter(values);
        }
    });

    // Clear the filter options
    $(document).on('click', '.clear-filters-button', function (data) {
        $(".filter-options-inner option:selected").prop("selected", false);
        doFilter([]);
    });

    // Clear the filter options
    $(document).on('click', '.sidebar-clear-filters', function (data) {
        $(".filter-options-inner option:selected").prop("selected", false);
        doFilter([]);
    });

    showPlaybook();
}

function buildSideBar(playbooks) {

    const parent = $('.sidebar');
    const klass = 'btn playbook';
    parent.children('.playbook').remove();

    playbooks.forEach(playbook => {
        const id = `playbook_${playbook.pb_file.replace('.json', '')}`;
        const pb_file = playbook.pb_file;
        const title = playbook.title;
        const el = `<div class="${klass}" id="${id}" pb_file="${pb_file}" onclick="">${title}</div>`;
        parent.append(el);
    });
}

function doFilter(current_filters) {
    emptyPlaybook();

    const filtersByType = current_filters.reduce((r, i) => {
        const typeVal = JSON.parse(i);
        const {filterType, value} = typeVal;

        r[filterType].push(value);
        return r;
    }, {industry: [], region: [], malware: []});

    // Options within the same category are OR
    // Options in different categories are AND
    // If a category has no options selected, don't use it to filter (same as having all options selected)

    // Filter individually, then take the intersection of the filters
    let rebuildSideBar = false;

    let playbooks = playbook_information;

    if (filtersByType['industry'].length) {
        playbooks = playbooks.filter
        (pb => pb['industries'] && pb['industries'].some(v => filtersByType['industry'].includes(v))
        );
        rebuildSideBar = true;
    }

    if (filtersByType['region'].length) {
        playbooks = playbooks.filter(
            pb => pb['regions'] && pb['regions'].some(v => filtersByType['region'].includes(v))
        );
        rebuildSideBar = true;
    }

    if (filtersByType['malware'].length) {
        playbooks = playbooks.filter(
            pb => pb['malwares'] && pb['malwares'].some(v => filtersByType['malware'].includes(v))
        );
        rebuildSideBar = true;
    }

    if ((current_filters.length === 0) || rebuildSideBar) {
        buildSideBar(playbooks);

        // Close the filter options
        $('.close').trigger('click');
        // If playbooks.length is one, select and load it
        if (playbooks.length === 1) {
            const pb_file = playbooks[0]['pb_file'];
            $('.playbook').removeClass('activebtn');
            $(`div[pb_file='${pb_file}']`).addClass('activebtn');
            loadPlaybook(pb_file);
        }
    }
}

function buildMalwareFilter(usedMalwares) {
    let malwareFilterHTML = `<optgroup class="used-malware" label="Used Malware">`;

    usedMalwares.forEach(m => {
        const val = JSON.stringify({"filterType": "malware", "value": m});
        malwareFilterHTML += `<option class="filter-options-entry" value='${val}'>${m}</option>`;
    });

    malwareFilterHTML += `</select>`;

    return malwareFilterHTML;
}

function buildRegionFilter(usedRegions) {
    let regionFilterHTML = `<optgroup class="targeted-regions" label="Targeted Regions">`;

    usedRegions.forEach(r => {
        if (r in x_cta_country_ov) {
            const val = JSON.stringify({"filterType": "region", "value": r});

            regionFilterHTML += `<option class="filter-options-entry" value='${val}'>${x_cta_country_ov[r]}</option>`;
        }
    });

    regionFilterHTML += `</optgroup>`;

    return regionFilterHTML;
}

function buildIndustryFilter(usedIndustries) {
    let industryFilterHTML = `<optgroup class="targeted-industries" label="Targeted Industries">`;

    usedIndustries.forEach(i => {
        if (i in industry_sector_ov) {
            const val = JSON.stringify({"filterType": "industry", "value": i});
            industryFilterHTML += `<option class="filter-options-entry" value='${val}'>${industry_sector_ov[i]}</option>`;
        }
    });

    industryFilterHTML += `</optgroup>`;

    return industryFilterHTML;
}

function buildFilterMenu() {

    const usedIndustries = playbook_information.reduce((r, i) => {
        if ('industries' in i) {
            i['industries'].forEach(x => {
                if (!r.includes(x)) {
                    r.push(x);
                }
            });
        }

        return r;
    }, []).sort();

    const usedRegions = playbook_information.reduce((r, i) => {
        if ('regions' in i) {
            i['regions'].forEach(x => {
                if (!r.includes(x)) {
                    r.push(x);
                }
            });
        }

        return r;
    }, []).sort();

    const usedMalwares = playbook_information.reduce((r, i) => {
        if ('malwares' in i) {
            i['malwares'].forEach(x => {
                if (!r.includes(x)) {
                    r.push(x);
                }
            });
        }

        return r;
    }, []).sort();

    const exampleSelections = `<ul><li>Automotive</li><li>Infrastructure</li><li>United States</li><li>New Malware</li></ul>`;

    const details = `<div>Multiple selection within a category are combined with OR. </div>` +
        `<div>Multiple selections between categories are combined with AND. </div>` + `<br/>` +
        `<div>For example, selecting: ${exampleSelections}</div>` + `<br/>` +
        `<div>Will filter on:<br/><br/><b>(Automotive OR Infrastructure) AND (United States) AND (New Malware)</b></div>` + `<br/><br/>` +
        `<div>Filtering, clearing , or clicking the X in the top corner will close this menu.</div>` + `<br/>` +
        `<div>If there is only one result after filtering, it will be displayed automatically.</div>` +
        `<br/><br/><br/>`;

    const instructions = `<span class="filter-tooltiptext">${details}</span>`;

    const howto = `<div class="filter-tooltip">Filters (Hover for additional information)...${instructions}</div>`;

    const industryFilterHTML = buildIndustryFilter(usedIndustries);

    const regionFilterHTML = buildRegionFilter(usedRegions);

    const malwareFilterHTML = buildMalwareFilter(usedMalwares);

    let filters = `<select class="filter-options-inner" multiple="multiple">${industryFilterHTML}${regionFilterHTML}${malwareFilterHTML}</select>`;

    const btn = `<span class="filter-button" onClick="">FILTER PLAYBOOKS</span>`;

    const btn2 = `<span class="clear-filters-button" onClick="">CLEAR FILTERS</span><br/>`;

    const filterMenu = `<div class="filter-options"><span class="close">&times;</span><br/><br/>${howto}${filters}${btn}${btn2}</div>`;

    $('body').append(filterMenu);
}

function initPlaybooks(playbooks) {
    const parent = $('.sidebar');
    const klass = 'btn playbook';

    playbook_information = playbooks;

    playbooks.forEach(playbook => {
        const id = `playbook_${playbook.pb_file.replace('.json', '')}`;
        const pb_file = playbook.pb_file;
        const title = playbook.title;
        const el = `<div class="${klass}" id="${id}" pb_file="${pb_file}" onclick="">${title}</div>`;
        parent.append(el);
    });

    initEvents();
}

function loadPlaybooks() {
    $.ajax({
        dataType: "json",
        url: new URL('playbooks.json', window.location.href),
        success: initPlaybooks
    });
}

function addDescription(report, playbook) {
    const descriptionElement = $('.playbook-description');
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
            descriptionElement.html(description.replace("\r\n", "</br>"));
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

function getRelatedMalware(in_id, playbook) {
    const all_relationships = playbook['objects'].filter(o => o.type === 'relationship');
    return all_relationships
        .filter(o => (o.target_ref.startsWith("malware--") && o.source_ref === in_id))
        .map(r => getObjectFromPlaybook(r.target_ref, playbook));
}

function getRelatedIndicators(in_id, playbook) {
    const all_relationships = playbook['objects'].filter(o => o.type === 'relationship');
    return all_relationships
        .filter(o => (o.source_ref.startsWith("indicator--") && o.target_ref === in_id))
        .map(r => getObjectFromPlaybook(r.source_ref, playbook));
}

function loadPlaybook(pb_file) {
    const url = new URL(`playbook_json/${pb_file}`, window.location.href);
    $.getJSON(url, playbook => {
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
    $(`div.timeline_btn[report_id='${report_id}']`).addClass('activebtn');
    displayReportByID(report_id, playbook);
}

function highlightLink(report_id) {
    $(`div.timeline_btn`).removeClass('activebtn');
    $(`div.timeline_btn[report_id='${report_id}']`).addClass('activebtn');
}

function addInfoboxIndicatorTable(playbook) {
    const indicators = getTypeFromPlaybook("indicator", playbook);

    // This will eventually be replaced by the STIX 2 ANTLR grammar parser
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
    $('.info1').empty().append(ib_markup);
    $('body').append(
        `<div class="indicator-list"><span class="close">&times;</span> ${indicatorTable}</div>`
    );
}

function addInfoBox2(report, playbook) {
    const identityObjects = getTypeFromReport("identity", report, playbook);

    const identityInformation = identityObjects.reduce((r, i) => {
        i['sectors'].forEach(x => {
            if (!(r['sectors'].includes(x))) {
                r['sectors'].push(x);
            }
        });

        i['x_cta_country'].forEach(x => {
            if (!(r['regions'].includes(x))) {
                r['regions'].push(x);
            }
        });

        if (!(r['types'].includes(i['identity_class']))) {
            r['types'].push(i['identity_class']);
        }

        return r;
    }, {'sectors': [], 'regions': [], 'types': []});

    const malwareObjects = getTypeFromReport("malware", report, playbook);

    const identitySectors = identityInformation['sectors'].sort().map(s => {
        const sectorIcon = industry_sector_ov_to_icon[s] || 'question';
        const title = industry_sector_ov[s] || s;

        return `<span class="fas-container"><i class="fas fa-${sectorIcon} fa-lg" title="${title}"></i></span>`;
    }).join(' ');

    const identityRegions = identityInformation['regions'].sort().map(s => {
        const title = x_cta_country_ov[(s || "").toUpperCase()] || s.toUpperCase();
        return `<span class="flag-icon flag-icon-${s.toLowerCase()}" title="${title}"></span>`;
    }).join(' ');

    // const identityTypes = identityInformation['types'].map(t => industry_class_ov[t] || t).sort().join(', ');
    const identityTypes = '';

    // const malwareNames = malwareObjects.map(m => m['name']).sort().join(', ');

    const malwareNames = malwareObjects.reduce((r, m) => {
        if (!(r.includes(m['name']))) {
            r.push(m['name']);
        }
        return r;
    }, []).sort().join(', ');

    let context_markup = '';
    let displayInfoBar2 = false;

    if (identitySectors.length) {
        context_markup += `<div><div>Industries:</div><div>${identitySectors}</div></div>`;
        displayInfoBar2 = true;
    } else {
        context_markup += '<div></div>';
    }

    if (identityRegions.length) {
        context_markup += `<div><div>Regions:</div><div>${identityRegions}</div></div>`;
        displayInfoBar2 = true;
    } else {
        context_markup += '<div></div>';
    }

    if (identityTypes.length) {
        context_markup += `<div><div>Type:</div><div>${identityTypes}</div></div>`;
        displayInfoBar2 = true;
    } else {
        context_markup += '<div></div>';
    }

    if (malwareNames.length) {
        context_markup += `<div><div>Malware Used:</div><div>${malwareNames}</div></div>`;
        displayInfoBar2 = true;
    } else {
        context_markup += '<div></div>';
    }

    if (displayInfoBar2) {
        $('.info2').empty().show().append(context_markup);
    } else {
        $('.info2').hide();
    }
}

function storeCurrentPlaybook(playbook) {
    current_playbook = playbook;
}

function displayReportByID(report_id, playbook) {
    //Get the report content from the ID
    const report = getObjectFromPlaybook(report_id, playbook);
    displayReport(report, playbook);
}

function displayReport(report, playbook) {
    //Build the HTML table for this report
    addInfoBox2(report, playbook);
    buildPhaseContainer(report, playbook);
}

function addReportLinks(playbook) {
    //For now this just lists the plays, by name, at the bottom, and makes them Buttons
    const reports = playbook['objects'].filter(o => o.type === 'report');
    $('.timeline').empty();
    //The Main report is only going to contain other reports
    //The other reports contain a campaign object with a date inside it.
    const parsed_reports = [];

    reports.forEach(r => {
        const {labels} = r;
        if (labels.includes('intrusion-set')) {
            current_intrusion_set = getTypeFromReport("intrusion-set", r, playbook)[0].name;
        } else {
            const campaign = getTypeFromReport("campaign", r, playbook);

            const first_seen = new Date(campaign[0]['first_seen']);
            const last_seen = new Date(campaign[0]['last_seen']);

            const offset_first_seen = new Date(first_seen.getTime() + first_seen.getTimezoneOffset() * 60 * 1000);
            const offset_last_seen = new Date(last_seen.getTime() + last_seen.getTimezoneOffset() * 60 * 1000);

            const campaign_length_in_days = Math.floor((offset_last_seen - offset_first_seen) / 86400000);
            parsed_reports.push({
                "id": r.id,
                "first_seen": offset_first_seen,
                "last_seen": offset_last_seen,
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
            ` id = "${r.id}" report_id="${r.id}" title=${r['name']}>${date_text}</div>`
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

    $('.campaign-description').html(campaign['description'].replaceAll("\r\n", "</br>"));

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
                const numIndicators = writeAPModal(c[i], report, playbook);
                ap_markup += `<div class="phases ap_button"ap_id='${c[i].id}' camp_id='${campaign.id}' onclick="">` +
                    `${c[i].name}<div class="ui circular label">${numIndicators}</div></div>`;
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

    // This will eventually be replaced by the STIX 2 ANTLR grammar parser
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
            '<tr><th id="indicator-description">Description</th>' +
            '<th id="indicator-pattern">Indicator Pattern</th>' +
            '<th id="indicator-malware">Malware</th></tr>';
        indicators.forEach(i => {
            // Retrieve the indicator description from the relationship between indicator and attack-pattern
            // Provide backwards-compatibility with playbooks that stored the description in the indicator object
            const description = relationships
                .filter(r => (r && (r.source_ref === i.id) && (r.target_ref === ap.id)))[0].description || i.name;

            const malwares = getRelatedMalware(i.id, playbook);
            const malwareNames = getRelatedMalware(i.id, playbook).map(m => m['name']).join(', ');

            try {
                markup += '<tr>' + `<td>${description}</td>` + `<td class="indicators">${escapeHtml(i.pattern)}</td>`;

                if (malwares.length) {
                    let malwareToolTip = '<span class="tooltiptext">';

                    malwares.forEach((m, i) => {
                        malwareToolTip += `<div>Name: ${m['name']}</div>`;
                        malwareToolTip += `<div></div>Types: ${m['labels'].map(m => malware_label_ov[m]).sort().join(', ')}</div>`;

                        if (m['description']) {
                            malwareToolTip += `<div>Description: ${m['description']}</div>`;
                        }

                        const external_refs = m['external_references'];
                        if (external_refs) {
                            external_refs.forEach(r => {
                                malwareToolTip += `<div><a href="${r['url']}" target="_blank">${r['source_name']}</a></div>`;
                            });
                        }

                        if (malwares[i + 1]) {
                            malwareToolTip += '<hr/>';
                        }
                    });

                    malwareToolTip += '</span>';

                    markup += `<td class="tooltip" width="20%">${malwareNames}${malwareToolTip}</td>`;
                } else {
                    markup += `<td></td>`;
                }

                markup += `</tr>`;
            } catch (e) {
                // The playbook contains a malformed relationship or description
                // console.log(JSON.stringify({text: text, e: e}));
            }
        });
        markup += '</table>';
    }
    markup += '</div>';
    $('body').append(markup);

    return indicators.length
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

// Consts

// const industry_class_ov = {
//     'individual': 'Individual',
//     'group': 'Group',
//     'organization': 'Organization',
//     'class': 'Class',
//     'unknown': 'Unknown'
// };

const industry_sector_ov = {
    'agriculture': 'Agriculture',
    'aerospace': 'Aerospace',
    'automotive': 'Automotive',
    'communications': 'Communications',
    'construction': 'Construction',
    'defence': 'Defence',
    'education': 'Education',
    'energy': 'Energy',
    'entertainment': 'Entertainment',
    'financial-services': 'Financial Services',
    'government-national': 'National Government',
    'government-regional': 'Regional Government',
    'government-local': 'Local Government',
    'government-public-services': 'Government Public Services',
    'healthcare': 'Healthcare',
    'hospitality-leisure': 'Hospitality  & Leisure',
    'infrastructure': 'Infrastructure',
    'insurance': 'Insurance',
    'manufacturing': 'Manufacturing',
    'mining': 'Mining',
    'non-profit': 'Non-profit',
    'pharmaceuticals': 'Pharmaceuticals',
    'retail': 'Retail',
    'technology': 'Technology',
    'telecommunications': 'Telecommunications',
    'transportation': 'Transportation',
    'utilities': 'Utilities'
};

const industry_sector_ov_to_icon = {
    'agriculture': 'tractor',
    'aerospace': 'plane',
    'automotive': 'car',
    'communications': 'satellite-dish',
    'construction': 'hard-hat',
    'defence': 'shield-alt',
    'education': 'graduation-cap',
    'energy': 'lightbulb',
    'entertainment': 'theater-masks',
    'financial-services': 'money-bill-alt',
    'government-national': 'landmark',
    'government-regional': 'landmark',
    'government-local': 'landmark',
    'government-public-services': 'landmark',
    'healthcare': 'plus-square',
    'hospitality-leisure': 'bed',
    'infrastructure': 'building',
    'insurance': 'house-damage',
    'manufacturing': 'industry',
    'mining': 'gem',
    'non-profit': 'users',
    'pharmaceuticals': 'pills',
    'retail': 'capsules',
    'technology': 'microchip',
    'telecommunications': 'broadcast-tower',
    'transportation': 'bus',
    'utilities': 'water'
};

const x_cta_country_ov = {
    "AF": "Afghanistan",
    "AX": "Aland Islands",
    "AL": "Albania",
    "DZ": "Algeria",
    "AS": "American Samoa",
    "AD": "Andorra",
    "AO": "Angola",
    "AI": "Anguilla",
    "AQ": "Antarctica",
    "AG": "Antigua And Barbuda",
    "AR": "Argentina",
    "AM": "Armenia",
    "AW": "Aruba",
    "AU": "Australia",
    "AT": "Austria",
    "AZ": "Azerbaijan",
    "BS": "Bahamas",
    "BH": "Bahrain",
    "BD": "Bangladesh",
    "BB": "Barbados",
    "BY": "Belarus",
    "BE": "Belgium",
    "BZ": "Belize",
    "BJ": "Benin",
    "BM": "Bermuda",
    "BT": "Bhutan",
    "BO": "Bolivia",
    "BA": "Bosnia And Herzegovina",
    "BW": "Botswana",
    "BV": "Bouvet Island",
    "BR": "Brazil",
    "IO": "British Indian Ocean Territory",
    "BN": "Brunei Darussalam",
    "BG": "Bulgaria",
    "BF": "Burkina Faso",
    "BI": "Burundi",
    "KH": "Cambodia",
    "CM": "Cameroon",
    "CA": "Canada",
    "CV": "Cape Verde",
    "KY": "Cayman Islands",
    "CF": "Central African Republic",
    "TD": "Chad",
    "CL": "Chile",
    "CN": "China",
    "CX": "Christmas Island",
    "CC": "Cocos (Keeling) Islands",
    "CO": "Colombia",
    "KM": "Comoros",
    "CG": "Congo",
    "CD": "Congo, Democratic Republic",
    "CK": "Cook Islands",
    "CR": "Costa Rica",
    "CI": "Cote D'Ivoire",
    "HR": "Croatia",
    "CU": "Cuba",
    "CY": "Cyprus",
    "CZ": "Czech Republic",
    "DK": "Denmark",
    "DJ": "Djibouti",
    "DM": "Dominica",
    "DO": "Dominican Republic",
    "EC": "Ecuador",
    "EG": "Egypt",
    "SV": "El Salvador",
    "GQ": "Equatorial Guinea",
    "ER": "Eritrea",
    "EE": "Estonia",
    "ET": "Ethiopia",
    "FK": "Falkland Islands (Malvinas)",
    "FO": "Faroe Islands",
    "FJ": "Fiji",
    "FI": "Finland",
    "FR": "France",
    "GF": "French Guiana",
    "PF": "French Polynesia",
    "TF": "French Southern Territories",
    "GA": "Gabon",
    "GM": "Gambia",
    "GE": "Georgia",
    "DE": "Germany",
    "GH": "Ghana",
    "GI": "Gibraltar",
    "GR": "Greece",
    "GL": "Greenland",
    "GD": "Grenada",
    "GP": "Guadeloupe",
    "GU": "Guam",
    "GT": "Guatemala",
    "GG": "Guernsey",
    "GN": "Guinea",
    "GW": "Guinea-Bissau",
    "GY": "Guyana",
    "HT": "Haiti",
    "HM": "Heard Island & Mcdonald Islands",
    "VA": "Holy See (Vatican City State)",
    "HN": "Honduras",
    "HK": "Hong Kong",
    "HU": "Hungary",
    "IS": "Iceland",
    "IN": "India",
    "ID": "Indonesia",
    "IR": "Iran, Islamic Republic Of",
    "IQ": "Iraq",
    "IE": "Ireland",
    "IM": "Isle Of Man",
    "IL": "Israel",
    "IT": "Italy",
    "JM": "Jamaica",
    "JP": "Japan",
    "JE": "Jersey",
    "JO": "Jordan",
    "KZ": "Kazakhstan",
    "KE": "Kenya",
    "KI": "Kiribati",
    "KR": "Korea",
    "KW": "Kuwait",
    "KG": "Kyrgyzstan",
    "LA": "Lao People's Democratic Republic",
    "LV": "Latvia",
    "LB": "Lebanon",
    "LS": "Lesotho",
    "LR": "Liberia",
    "LY": "Libyan Arab Jamahiriya",
    "LI": "Liechtenstein",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MO": "Macao",
    "MK": "Macedonia",
    "MG": "Madagascar",
    "MW": "Malawi",
    "MY": "Malaysia",
    "MV": "Maldives",
    "ML": "Mali",
    "MT": "Malta",
    "MH": "Marshall Islands",
    "MQ": "Martinique",
    "MR": "Mauritania",
    "MU": "Mauritius",
    "YT": "Mayotte",
    "MX": "Mexico",
    "FM": "Micronesia, Federated States Of",
    "MD": "Moldova",
    "MC": "Monaco",
    "MN": "Mongolia",
    "ME": "Montenegro",
    "MS": "Montserrat",
    "MA": "Morocco",
    "MZ": "Mozambique",
    "MM": "Myanmar",
    "NA": "Namibia",
    "NR": "Nauru",
    "NP": "Nepal",
    "NL": "Netherlands",
    "AN": "Netherlands Antilles",
    "NC": "New Caledonia",
    "NZ": "New Zealand",
    "NI": "Nicaragua",
    "NE": "Niger",
    "NG": "Nigeria",
    "NU": "Niue",
    "NF": "Norfolk Island",
    "MP": "Northern Mariana Islands",
    "NO": "Norway",
    "OM": "Oman",
    "PK": "Pakistan",
    "PW": "Palau",
    "PS": "Palestinian Territory, Occupied",
    "PA": "Panama",
    "PG": "Papua New Guinea",
    "PY": "Paraguay",
    "PE": "Peru",
    "PH": "Philippines",
    "PN": "Pitcairn",
    "PL": "Poland",
    "PT": "Portugal",
    "PR": "Puerto Rico",
    "QA": "Qatar",
    "RE": "Reunion",
    "RO": "Romania",
    "RU": "Russian Federation",
    "RW": "Rwanda",
    "BL": "Saint Barthelemy",
    "SH": "Saint Helena",
    "KN": "Saint Kitts And Nevis",
    "LC": "Saint Lucia",
    "MF": "Saint Martin",
    "PM": "Saint Pierre And Miquelon",
    "VC": "Saint Vincent And Grenadines",
    "WS": "Samoa",
    "SM": "San Marino",
    "ST": "Sao Tome And Principe",
    "SA": "Saudi Arabia",
    "SN": "Senegal",
    "RS": "Serbia",
    "SC": "Seychelles",
    "SL": "Sierra Leone",
    "SG": "Singapore",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "SB": "Solomon Islands",
    "SO": "Somalia",
    "ZA": "South Africa",
    "GS": "South Georgia And Sandwich Isl.",
    "ES": "Spain",
    "LK": "Sri Lanka",
    "SD": "Sudan",
    "SR": "Suriname",
    "SJ": "Svalbard And Jan Mayen",
    "SZ": "Swaziland",
    "SE": "Sweden",
    "CH": "Switzerland",
    "SY": "Syrian Arab Republic",
    "TW": "Taiwan",
    "TJ": "Tajikistan",
    "TZ": "Tanzania",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "TG": "Togo",
    "TK": "Tokelau",
    "TO": "Tonga",
    "TT": "Trinidad And Tobago",
    "TN": "Tunisia",
    "TR": "Turkey",
    "TM": "Turkmenistan",
    "TC": "Turks And Caicos Islands",
    "TV": "Tuvalu",
    "UG": "Uganda",
    "UA": "Ukraine",
    "AE": "United Arab Emirates",
    "GB": "United Kingdom",
    "US": "United States",
    "UM": "United States Outlying Islands",
    "UY": "Uruguay",
    "UZ": "Uzbekistan",
    "VU": "Vanuatu",
    "VE": "Venezuela",
    "VN": "Viet Nam",
    "VG": "Virgin Islands, British",
    "VI": "Virgin Islands, U.S.",
    "WF": "Wallis And Futuna",
    "EH": "Western Sahara",
    "YE": "Yemen",
    "ZM": "Zambia",
    "ZW": "Zimbabwe"
};

const malware_label_ov = {
    "adware": "Adware",
    "backdoor": "Backdoor",
    "bot": "BOT",
    "ddos": "DDOS",
    "dropper": "Dropper",
    "exploit-kit": "Exploit Kit",
    "keylogger": "Keylogger",
    "ransomware": "Ransomware",
    "remote-access-trojan": "Remote Access Trojan",
    "resource-exploitation": "Resource Exploitation",
    "rogue-security-software": "Rogue Security Software",
    "rootkit": "Rootkit",
    "screen-capture": "Screen Capture",
    "spyware": "Spyware",
    "trojan": "Trojan",
    "virus": "Virus",
    "worm": "Worm"
};
