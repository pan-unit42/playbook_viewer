let playbook_information = null;
let current_playbook = null;
let current_intrusion_set = null;

String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.split(search).join(replacement);
};

function dropQueryParameters(url) {
    return url.split("?")[0];
}

function emptyPlaybook() {
    history.pushState({}, "", dropQueryParameters(window.location.href));
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
                onNext: () => $('.box.sidebar').children('.btn').first().trigger('click')
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
                element: ".box.timeline :first-child",
                title: "The newest Play is shown first",
                content: "",
                // the newest play is selected by default
                // switch to the oldest play
                onNext: () => $('.box.timeline :last-child').trigger('click')
            },
            {
                element: '.box.timeline :last-child',
                title: "The oldest Play is shown last",
                content: "",
                // switch back to the newest play
                onPrev: () => $('.box.timeline :first-child').trigger('click'),
                onNext: () => $('.box.timeline :first-child').trigger('click')
            },
            {
                element: ".campaign-description",
                title: "Each Play may have a description",
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
                onNext: () => $("[ap_id='attack-pattern--6aac77c4-eaf2-4366-8c13-ce50ab951f38']").trigger('click')
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
        buildHome();
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

    // Display the datamap
    $(document).on('click', ".view-datamap", function () {
        emptyPlaybook();
        const htmlContents = `
            <div class="box header">
                <span>PLAYBOOK MAP</span>
            </div>

            <div class="map-description">
                Welcome to the Unit 42 Playbook Map. <br/><br/>
                Please hover over a bubble to see Playbooks targeting that country.
            </div>
        
            <div id='container' class='container'></div>
        `;
        $(".contents").html(htmlContents);
        buildMap()
    });

    // Display the "Home" page
    $(document).on('click', ".view-home", function () {
        emptyPlaybook();
        buildHome();
    });

    showPlaybook();
}

function buildHome() {
    const htmlContents = `        
        <div class="box header">
            <span>PLAYBOOK VIEWER</span>
        </div>

        <div class="box inside">
            <div class="box timeline"></div>
            <div class="playbook-description">
                Welcome to the Unit 42 Playbook Viewer. <br/><br/>
                Please select a playbook to begin.
            </div>
            <div class="campaign-description"></div>
        </div>

        <div class="info info1"></div>

        <div class="info info2"></div>

        <div class="bottomheader">
            <div class="recon">RECON</div>
            <div class="weaponization">WEAPONIZATION</div>
            <div class="delivery">DELIVERY</div>
            <div class="exploit">EXPLOIT</div>
            <div class="install">INSTALL</div>
            <div class="command">COMMAND</div>
            <div class="objective">OBJECTIVE</div>
        </div>

        <div class="phasescontainer">
        </div>
    `;
    $(".contents").html(htmlContents);
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

function buildMap() {
    const countries_to_playbooks = playbook_information.reduce((r, i) => {
        const unknown = '???';
        if (i.regions.length > 0) {
            i.regions.forEach(iso2 => {
                iso3 = iso2_to_iso3[iso2] || unknown;
                iso3 in r ? r[iso3].push(i) : r[iso3] = [i];
            });
        } else {
            // Playbooks without at least one target country could be located somewhere on the map
            // Exclude them for now
            // r[unknown] ? r[unknown].push(i) : r[unknown] = [i];
        }
        return r;
    }, {});

    const as_bubbles = Object.keys(countries_to_playbooks).reduce((r, i) => {
        const pbs = countries_to_playbooks[i];
        const n = pbs.length;
        const data = iso3_to_data[i];

        const e = {
            name: `${n} : ${pbs.map(i => i.title).join(', ')}`,
            pbs: pbs,
            count: n,
            radius: 20 * (n / 2),
            code: i,
            country: iso3_to_data[i]['country'],
            fillKey: 'target'
        };

        if (data) {
            e['latitude'] = data['latitude'];
            e['longitude'] = data['longitude'];
        } else {
            // iso3_to_data is missing an entry for the country
        }

        r.push(e);

        return r;
    }, []);

    const map = new Datamap({
        element: document.getElementById('container'),
        fills: {
            defaultFill: '#ABDDA4',
            target: '#FC8D59'
        },
        geographyConfig: {
            popupOnHover: false
        }
    });

    const bubblesConfig = {
        popupOnHover: false,
        popupTemplate: function (geography, data) {
            return ''
        }
    };
    map.bubbles(as_bubbles, bubblesConfig);

    map.svg.selectAll('.bubbles').on('mouseover', function () {

        const extraInfoElem = $('.extrainfo');

        const e = d3.event;
        const data = e.target.__data__;

        if (extraInfoElem.length === 0 || (extraInfoElem.length && extraInfoElem[0].getAttribute('id') !== data.country)) {
            const pbsHtml = data.pbs.map(i => `<div class="extrainfo-inner" onclick="loadPlaybookExtra('${i.pb_file}')">${i.title}</div>`).join('');

            $('.extrainfo').remove();
            $('.container').append(`<div id="${data.country}" class="extrainfo">Targeted Country<br/>${data.country}<br/><br/>Playbooks<br/>${data.count}<br/><br/>${pbsHtml}</div>`);
            $('.extrainfo').css({top: e.offsetY, left: e.offsetX})
        }
    });

    map.svg.on('click', function() {
        $('.extrainfo').remove();
    });

    map.svg.selectAll('.datamaps-subunit').on('click', function() {
        $('.extrainfo').remove();
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
            buildHome();
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
    buildHome();

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

function loadPlaybookExtra(pb_file) {
    buildHome();
    loadPlaybook(pb_file);
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
        `<div class="left"><div>Intrusion Set: ${current_intrusion_set}</div></div>` +
        `<div class="middle"><div>Campaigns: ${total_campaigns}</div></div>` +
        `<div class="middle2"><div class="action middle2" title="Click For Overview">Indicators: ${total_indicators}</div></div>` +
        `<div class="right"><div>Attack Patterns: ${total_attackpatterns}</div></div>`
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

const iso2_to_iso3 = {
    AF: 'AFG',
    AX: 'ALA',
    AL: 'ALB',
    DZ: 'DZA',
    AS: 'ASM',
    AD: 'AND',
    AO: 'AGO',
    AI: 'AIA',
    AQ: 'ATA',
    AG: 'ATG',
    AR: 'ARG',
    AM: 'ARM',
    AW: 'ABW',
    AU: 'AUS',
    AT: 'AUT',
    AZ: 'AZE',
    BS: 'BHS',
    BH: 'BHR',
    BD: 'BGD',
    BB: 'BRB',
    BY: 'BLR',
    BE: 'BEL',
    BZ: 'BLZ',
    BJ: 'BEN',
    BM: 'BMU',
    BT: 'BTN',
    BO: 'BOL',
    BA: 'BIH',
    BW: 'BWA',
    BV: 'BVT',
    BR: 'BRA',
    VG: 'VGB',
    IO: 'IOT',
    BN: 'BRN',
    BG: 'BGR',
    BF: 'BFA',
    BI: 'BDI',
    KH: 'KHM',
    CM: 'CMR',
    CA: 'CAN',
    CV: 'CPV',
    KY: 'CYM',
    CF: 'CAF',
    TD: 'TCD',
    CL: 'CHL',
    CN: 'CHN',
    HK: 'HKG',
    MO: 'MAC',
    CX: 'CXR',
    CC: 'CCK',
    CO: 'COL',
    KM: 'COM',
    CG: 'COG',
    CD: 'COD',
    CK: 'COK',
    CR: 'CRI',
    CI: 'CIV',
    HR: 'HRV',
    CU: 'CUB',
    CY: 'CYP',
    CZ: 'CZE',
    DK: 'DNK',
    DJ: 'DJI',
    DM: 'DMA',
    DO: 'DOM',
    EC: 'ECU',
    EG: 'EGY',
    SV: 'SLV',
    GQ: 'GNQ',
    ER: 'ERI',
    EE: 'EST',
    ET: 'ETH',
    FK: 'FLK',
    FO: 'FRO',
    FJ: 'FJI',
    FI: 'FIN',
    FR: 'FRA',
    GF: 'GUF',
    PF: 'PYF',
    TF: 'ATF',
    GA: 'GAB',
    GM: 'GMB',
    GE: 'GEO',
    DE: 'DEU',
    GH: 'GHA',
    GI: 'GIB',
    GR: 'GRC',
    GL: 'GRL',
    GD: 'GRD',
    GP: 'GLP',
    GU: 'GUM',
    GT: 'GTM',
    GG: 'GGY',
    GN: 'GIN',
    GW: 'GNB',
    GY: 'GUY',
    HT: 'HTI',
    HM: 'HMD',
    VA: 'VAT',
    HN: 'HND',
    HU: 'HUN',
    IS: 'ISL',
    IN: 'IND',
    ID: 'IDN',
    IR: 'IRN',
    IQ: 'IRQ',
    IE: 'IRL',
    IM: 'IMN',
    IL: 'ISR',
    IT: 'ITA',
    JM: 'JAM',
    JP: 'JPN',
    JE: 'JEY',
    JO: 'JOR',
    KZ: 'KAZ',
    KE: 'KEN',
    KI: 'KIR',
    KP: 'PRK',
    KR: 'KOR',
    KW: 'KWT',
    KG: 'KGZ',
    LA: 'LAO',
    LV: 'LVA',
    LB: 'LBN',
    LS: 'LSO',
    LR: 'LBR',
    LY: 'LBY',
    LI: 'LIE',
    LT: 'LTU',
    LU: 'LUX',
    MK: 'MKD',
    MG: 'MDG',
    MW: 'MWI',
    MY: 'MYS',
    MV: 'MDV',
    ML: 'MLI',
    MT: 'MLT',
    MH: 'MHL',
    MQ: 'MTQ',
    MR: 'MRT',
    MU: 'MUS',
    YT: 'MYT',
    MX: 'MEX',
    FM: 'FSM',
    MD: 'MDA',
    MC: 'MCO',
    MN: 'MNG',
    ME: 'MNE',
    MS: 'MSR',
    MA: 'MAR',
    MZ: 'MOZ',
    MM: 'MMR',
    NA: 'NAM',
    NR: 'NRU',
    NP: 'NPL',
    NL: 'NLD',
    AN: 'ANT',
    NC: 'NCL',
    NZ: 'NZL',
    NI: 'NIC',
    NE: 'NER',
    NG: 'NGA',
    NU: 'NIU',
    NF: 'NFK',
    MP: 'MNP',
    NO: 'NOR',
    OM: 'OMN',
    PK: 'PAK',
    PW: 'PLW',
    PS: 'PSE',
    PA: 'PAN',
    PG: 'PNG',
    PY: 'PRY',
    PE: 'PER',
    PH: 'PHL',
    PN: 'PCN',
    PL: 'POL',
    PT: 'PRT',
    PR: 'PRI',
    QA: 'QAT',
    RE: 'REU',
    RO: 'ROU',
    RU: 'RUS',
    RW: 'RWA',
    BL: 'BLM',
    SH: 'SHN',
    KN: 'KNA',
    LC: 'LCA',
    MF: 'MAF',
    PM: 'SPM',
    VC: 'VCT',
    WS: 'WSM',
    SM: 'SMR',
    ST: 'STP',
    SA: 'SAU',
    SN: 'SEN',
    RS: 'SRB',
    SC: 'SYC',
    SL: 'SLE',
    SG: 'SGP',
    SK: 'SVK',
    SI: 'SVN',
    SB: 'SLB',
    SO: 'SOM',
    ZA: 'ZAF',
    GS: 'SGS',
    SS: 'SSD',
    ES: 'ESP',
    LK: 'LKA',
    SD: 'SDN',
    SR: 'SUR',
    SJ: 'SJM',
    SZ: 'SWZ',
    SE: 'SWE',
    CH: 'CHE',
    SY: 'SYR',
    TW: 'TWN',
    TJ: 'TJK',
    TZ: 'TZA',
    TH: 'THA',
    TL: 'TLS',
    TG: 'TGO',
    TK: 'TKL',
    TO: 'TON',
    TT: 'TTO',
    TN: 'TUN',
    TR: 'TUR',
    TM: 'TKM',
    TC: 'TCA',
    TV: 'TUV',
    UG: 'UGA',
    UA: 'UKR',
    AE: 'ARE',
    GB: 'GBR',
    US: 'USA',
    UM: 'UMI',
    UY: 'URY',
    UZ: 'UZB',
    VU: 'VUT',
    VE: 'VEN',
    VN: 'VNM',
    VI: 'VIR',
    WF: 'WLF',
    EH: 'ESH',
    YE: 'YEM',
    ZM: 'ZMB',
    ZW: 'ZWE'
};

const iso3_to_data = {
    "AFG": {
        "iso2": "AF",
        "iso3": "AFG",
        "country": "Afghanistan",
        "latitude": "33",
        "longitude": "65"
    },
    "ALB": {
        "iso2": "AL",
        "iso3": "ALB",
        "country": "Albania",
        "latitude": "41",
        "longitude": "20"
    },
    "DZA": {
        "iso2": "DZ",
        "iso3": "DZA",
        "country": "Algeria",
        "latitude": "28",
        "longitude": "3"
    },
    "ASM": {
        "iso2": "AS",
        "iso3": "ASM",
        "country": "American Samoa",
        "latitude": "-14.3333",
        "longitude": "-170"
    },
    "AND": {
        "iso2": "AD",
        "iso3": "AND",
        "country": "Andorra",
        "latitude": "42.5",
        "longitude": "1.6"
    },
    "AGO": {
        "iso2": "AO",
        "iso3": "AGO",
        "country": "Angola",
        "latitude": "-12.5",
        "longitude": "18.5"
    },
    "AIA": {
        "iso2": "AI",
        "iso3": "AIA",
        "country": "Anguilla",
        "latitude": "18.25",
        "longitude": "-63.1667"
    },
    "ATA": {
        "iso2": "AQ",
        "iso3": "ATA",
        "country": "Antarctica",
        "latitude": "-90",
        "longitude": "0"
    },
    "ATG": {
        "iso2": "AG",
        "iso3": "ATG",
        "country": "Antigua and Barbuda",
        "latitude": "17.05",
        "longitude": "-61.8"
    },
    "ARG": {
        "iso2": "AR",
        "iso3": "ARG",
        "country": "Argentina",
        "latitude": "-34",
        "longitude": "-64"
    },
    "ARM": {
        "iso2": "AM",
        "iso3": "ARM",
        "country": "Armenia",
        "latitude": "40",
        "longitude": "45"
    },
    "ABW": {
        "iso2": "AW",
        "iso3": "ABW",
        "country": "Aruba",
        "latitude": "12.5",
        "longitude": "-69.9667"
    },
    "AUS": {
        "iso2": "AU",
        "iso3": "AUS",
        "country": "Australia",
        "latitude": "-27",
        "longitude": "133"
    },
    "AUT": {
        "iso2": "AT",
        "iso3": "AUT",
        "country": "Austria",
        "latitude": "47.3333",
        "longitude": "13.3333"
    },
    "AZE": {
        "iso2": "AZ",
        "iso3": "AZE",
        "country": "Azerbaijan",
        "latitude": "40.5",
        "longitude": "47.5"
    },
    "BHS": {
        "iso2": "BS",
        "iso3": "BHS",
        "country": "Bahamas",
        "latitude": "24.25",
        "longitude": "-76"
    },
    "BHR": {
        "iso2": "BH",
        "iso3": "BHR",
        "country": "Bahrain",
        "latitude": "26",
        "longitude": "50.55"
    },
    "BGD": {
        "iso2": "BD",
        "iso3": "BGD",
        "country": "Bangladesh",
        "latitude": "24",
        "longitude": "90"
    },
    "BRB": {
        "iso2": "BB",
        "iso3": "BRB",
        "country": "Barbados",
        "latitude": "13.1667",
        "longitude": "-59.5333"
    },
    "BLR": {
        "iso2": "BY",
        "iso3": "BLR",
        "country": "Belarus",
        "latitude": "53",
        "longitude": "28"
    },
    "BEL": {
        "iso2": "BE",
        "iso3": "BEL",
        "country": "Belgium",
        "latitude": "50.8333",
        "longitude": "4"
    },
    "BLZ": {
        "iso2": "BZ",
        "iso3": "BLZ",
        "country": "Belize",
        "latitude": "17.25",
        "longitude": "-88.75"
    },
    "BEN": {
        "iso2": "BJ",
        "iso3": "BEN",
        "country": "Benin",
        "latitude": "9.5",
        "longitude": "2.25"
    },
    "BMU": {
        "iso2": "BM",
        "iso3": "BMU",
        "country": "Bermuda",
        "latitude": "32.3333",
        "longitude": "-64.75"
    },
    "BTN": {
        "iso2": "BT",
        "iso3": "BTN",
        "country": "Bhutan",
        "latitude": "27.5",
        "longitude": "90.5"
    },
    "BOL": {
        "iso2": "BO",
        "iso3": "BOL",
        "country": "Bolivia",
        "latitude": "-17",
        "longitude": "-65"
    },
    "BIH": {
        "iso2": "BA",
        "iso3": "BIH",
        "country": "Bosnia and Herzegovina",
        "latitude": "44",
        "longitude": "18"
    },
    "BWA": {
        "iso2": "BW",
        "iso3": "BWA",
        "country": "Botswana",
        "latitude": "-22",
        "longitude": "24"
    },
    "BVT": {
        "iso2": "BV",
        "iso3": "BVT",
        "country": "Bouvet Island",
        "latitude": "-54.4333",
        "longitude": "3.4"
    },
    "BRA": {
        "iso2": "BR",
        "iso3": "BRA",
        "country": "Brazil",
        "latitude": "-10",
        "longitude": "-55"
    },
    "IOT": {
        "iso2": "IO",
        "iso3": "IOT",
        "country": "British Indian Ocean Territory",
        "latitude": "-6",
        "longitude": "71.5"
    },
    "BRN": {
        "iso2": "BN",
        "iso3": "BRN",
        "country": "Brunei",
        "latitude": "4.5",
        "longitude": "114.6667"
    },
    "BGR": {
        "iso2": "BG",
        "iso3": "BGR",
        "country": "Bulgaria",
        "latitude": "43",
        "longitude": "25"
    },
    "BFA": {
        "iso2": "BF",
        "iso3": "BFA",
        "country": "Burkina Faso",
        "latitude": "13",
        "longitude": "-2"
    },
    "BDI": {
        "iso2": "BI",
        "iso3": "BDI",
        "country": "Burundi",
        "latitude": "-3.5",
        "longitude": "30"
    },
    "KHM": {
        "iso2": "KH",
        "iso3": "KHM",
        "country": "Cambodia",
        "latitude": "13",
        "longitude": "105"
    },
    "CMR": {
        "iso2": "CM",
        "iso3": "CMR",
        "country": "Cameroon",
        "latitude": "6",
        "longitude": "12"
    },
    "CAN": {
        "iso2": "CA",
        "iso3": "CAN",
        "country": "Canada",
        "latitude": "60",
        "longitude": "-95"
    },
    "CPV": {
        "iso2": "CV",
        "iso3": "CPV",
        "country": "Cape Verde",
        "latitude": "16",
        "longitude": "-24"
    },
    "CYM": {
        "iso2": "KY",
        "iso3": "CYM",
        "country": "Cayman Islands",
        "latitude": "19.5",
        "longitude": "-80.5"
    },
    "CAF": {
        "iso2": "CF",
        "iso3": "CAF",
        "country": "Central African Republic",
        "latitude": "7",
        "longitude": "21"
    },
    "TCD": {
        "iso2": "TD",
        "iso3": "TCD",
        "country": "Chad",
        "latitude": "15",
        "longitude": "19"
    },
    "CHL": {
        "iso2": "CL",
        "iso3": "CHL",
        "country": "Chile",
        "latitude": "-30",
        "longitude": "-71"
    },
    "CHN": {
        "iso2": "CN",
        "iso3": "CHN",
        "country": "China",
        "latitude": "35",
        "longitude": "105"
    },
    "CXR": {
        "iso2": "CX",
        "iso3": "CXR",
        "country": "Christmas Island",
        "latitude": "-10.5",
        "longitude": "105.6667"
    },
    "CCK": {
        "iso2": "CC",
        "iso3": "CCK",
        "country": "Cocos (Keeling) Islands",
        "latitude": "-12.5",
        "longitude": "96.8333"
    },
    "COL": {
        "iso2": "CO",
        "iso3": "COL",
        "country": "Colombia",
        "latitude": "4",
        "longitude": "-72"
    },
    "COM": {
        "iso2": "KM",
        "iso3": "COM",
        "country": "Comoros",
        "latitude": "-12.1667",
        "longitude": "44.25"
    },
    "COG": {
        "iso2": "CG",
        "iso3": "COG",
        "country": "Congo",
        "latitude": "-1",
        "longitude": "15"
    },
    "COD": {
        "iso2": "CD",
        "iso3": "COD",
        "country": "Congo, the Democratic Republic of the",
        "latitude": "0",
        "longitude": "25"
    },
    "COK": {
        "iso2": "CK",
        "iso3": "COK",
        "country": "Cook Islands",
        "latitude": "-21.2333",
        "longitude": "-159.7667"
    },
    "CRI": {
        "iso2": "CR",
        "iso3": "CRI",
        "country": "Costa Rica",
        "latitude": "10",
        "longitude": "-84"
    },
    "CIV": {
        "iso2": "CI",
        "iso3": "CIV",
        "country": "Ivory Coast",
        "latitude": "8",
        "longitude": "-5"
    },
    "HRV": {
        "iso2": "HR",
        "iso3": "HRV",
        "country": "Croatia",
        "latitude": "45.1667",
        "longitude": "15.5"
    },
    "CUB": {
        "iso2": "CU",
        "iso3": "CUB",
        "country": "Cuba",
        "latitude": "21.5",
        "longitude": "-80"
    },
    "CYP": {
        "iso2": "CY",
        "iso3": "CYP",
        "country": "Cyprus",
        "latitude": "35",
        "longitude": "33"
    },
    "CZE": {
        "iso2": "CZ",
        "iso3": "CZE",
        "country": "Czech Republic",
        "latitude": "49.75",
        "longitude": "15.5"
    },
    "DNK": {
        "iso2": "DK",
        "iso3": "DNK",
        "country": "Denmark",
        "latitude": "56",
        "longitude": "10"
    },
    "DJI": {
        "iso2": "DJ",
        "iso3": "DJI",
        "country": "Djibouti",
        "latitude": "11.5",
        "longitude": "43"
    },
    "DMA": {
        "iso2": "DM",
        "iso3": "DMA",
        "country": "Dominica",
        "latitude": "15.4167",
        "longitude": "-61.3333"
    },
    "DOM": {
        "iso2": "DO",
        "iso3": "DOM",
        "country": "Dominican Republic",
        "latitude": "19",
        "longitude": "-70.6667"
    },
    "ECU": {
        "iso2": "EC",
        "iso3": "ECU",
        "country": "Ecuador",
        "latitude": "-2",
        "longitude": "-77.5"
    },
    "EGY": {
        "iso2": "EG",
        "iso3": "EGY",
        "country": "Egypt",
        "latitude": "27",
        "longitude": "30"
    },
    "SLV": {
        "iso2": "SV",
        "iso3": "SLV",
        "country": "El Salvador",
        "latitude": "13.8333",
        "longitude": "-88.9167"
    },
    "GNQ": {
        "iso2": "GQ",
        "iso3": "GNQ",
        "country": "Equatorial Guinea",
        "latitude": "2",
        "longitude": "10"
    },
    "ERI": {
        "iso2": "ER",
        "iso3": "ERI",
        "country": "Eritrea",
        "latitude": "15",
        "longitude": "39"
    },
    "EST": {
        "iso2": "EE",
        "iso3": "EST",
        "country": "Estonia",
        "latitude": "59",
        "longitude": "26"
    },
    "ETH": {
        "iso2": "ET",
        "iso3": "ETH",
        "country": "Ethiopia",
        "latitude": "8",
        "longitude": "38"
    },
    "FLK": {
        "iso2": "FK",
        "iso3": "FLK",
        "country": "Falkland Islands (Malvinas)",
        "latitude": "-51.75",
        "longitude": "-59"
    },
    "FRO": {
        "iso2": "FO",
        "iso3": "FRO",
        "country": "Faroe Islands",
        "latitude": "62",
        "longitude": "-7"
    },
    "FJI": {
        "iso2": "FJ",
        "iso3": "FJI",
        "country": "Fiji",
        "latitude": "-18",
        "longitude": "175"
    },
    "FIN": {
        "iso2": "FI",
        "iso3": "FIN",
        "country": "Finland",
        "latitude": "64",
        "longitude": "26"
    },
    "FRA": {
        "iso2": "FR",
        "iso3": "FRA",
        "country": "France",
        "latitude": "46",
        "longitude": "2"
    },
    "GUF": {
        "iso2": "GF",
        "iso3": "GUF",
        "country": "French Guiana",
        "latitude": "4",
        "longitude": "-53"
    },
    "PYF": {
        "iso2": "PF",
        "iso3": "PYF",
        "country": "French Polynesia",
        "latitude": "-15",
        "longitude": "-140"
    },
    "ATF": {
        "iso2": "TF",
        "iso3": "ATF",
        "country": "French Southern Territories",
        "latitude": "-43",
        "longitude": "67"
    },
    "GAB": {
        "iso2": "GA",
        "iso3": "GAB",
        "country": "Gabon",
        "latitude": "-1",
        "longitude": "11.75"
    },
    "GMB": {
        "iso2": "GM",
        "iso3": "GMB",
        "country": "Gambia",
        "latitude": "13.4667",
        "longitude": "-16.5667"
    },
    "GEO": {
        "iso2": "GE",
        "iso3": "GEO",
        "country": "Georgia",
        "latitude": "42",
        "longitude": "43.5"
    },
    "DEU": {
        "iso2": "DE",
        "iso3": "DEU",
        "country": "Germany",
        "latitude": "51",
        "longitude": "9"
    },
    "GHA": {
        "iso2": "GH",
        "iso3": "GHA",
        "country": "Ghana",
        "latitude": "8",
        "longitude": "-2"
    },
    "GIB": {
        "iso2": "GI",
        "iso3": "GIB",
        "country": "Gibraltar",
        "latitude": "36.1833",
        "longitude": "-5.3667"
    },
    "GRC": {
        "iso2": "GR",
        "iso3": "GRC",
        "country": "Greece",
        "latitude": "39",
        "longitude": "22"
    },
    "GRL": {
        "iso2": "GL",
        "iso3": "GRL",
        "country": "Greenland",
        "latitude": "72",
        "longitude": "-40"
    },
    "GRD": {
        "iso2": "GD",
        "iso3": "GRD",
        "country": "Grenada",
        "latitude": "12.1167",
        "longitude": "-61.6667"
    },
    "GLP": {
        "iso2": "GP",
        "iso3": "GLP",
        "country": "Guadeloupe",
        "latitude": "16.25",
        "longitude": "-61.5833"
    },
    "GUM": {
        "iso2": "GU",
        "iso3": "GUM",
        "country": "Guam",
        "latitude": "13.4667",
        "longitude": "144.7833"
    },
    "GTM": {
        "iso2": "GT",
        "iso3": "GTM",
        "country": "Guatemala",
        "latitude": "15.5",
        "longitude": "-90.25"
    },
    "GGY": {
        "iso2": "GG",
        "iso3": "GGY",
        "country": "Guernsey",
        "latitude": "49.5",
        "longitude": "-2.56"
    },
    "GIN": {
        "iso2": "GN",
        "iso3": "GIN",
        "country": "Guinea",
        "latitude": "11",
        "longitude": "-10"
    },
    "GNB": {
        "iso2": "GW",
        "iso3": "GNB",
        "country": "Guinea-Bissau",
        "latitude": "12",
        "longitude": "-15"
    },
    "GUY": {
        "iso2": "GY",
        "iso3": "GUY",
        "country": "Guyana",
        "latitude": "5",
        "longitude": "-59"
    },
    "HTI": {
        "iso2": "HT",
        "iso3": "HTI",
        "country": "Haiti",
        "latitude": "19",
        "longitude": "-72.4167"
    },
    "HMD": {
        "iso2": "HM",
        "iso3": "HMD",
        "country": "Heard Island and McDonald Islands",
        "latitude": "-53.1",
        "longitude": "72.5167"
    },
    "VAT": {
        "iso2": "VA",
        "iso3": "VAT",
        "country": "Holy See (Vatican City State)",
        "latitude": "41.9",
        "longitude": "12.45"
    },
    "HND": {
        "iso2": "HN",
        "iso3": "HND",
        "country": "Honduras",
        "latitude": "15",
        "longitude": "-86.5"
    },
    "HKG": {
        "iso2": "HK",
        "iso3": "HKG",
        "country": "Hong Kong",
        "latitude": "22.25",
        "longitude": "114.1667"
    },
    "HUN": {
        "iso2": "HU",
        "iso3": "HUN",
        "country": "Hungary",
        "latitude": "47",
        "longitude": "20"
    },
    "ISL": {
        "iso2": "IS",
        "iso3": "ISL",
        "country": "Iceland",
        "latitude": "65",
        "longitude": "-18"
    },
    "IND": {
        "iso2": "IN",
        "iso3": "IND",
        "country": "India",
        "latitude": "20",
        "longitude": "77"
    },
    "IDN": {
        "iso2": "ID",
        "iso3": "IDN",
        "country": "Indonesia",
        "latitude": "-5",
        "longitude": "120"
    },
    "IRN": {
        "iso2": "IR",
        "iso3": "IRN",
        "country": "Iran, Islamic Republic of",
        "latitude": "32",
        "longitude": "53"
    },
    "IRQ": {
        "iso2": "IQ",
        "iso3": "IRQ",
        "country": "Iraq",
        "latitude": "33",
        "longitude": "44"
    },
    "IRL": {
        "iso2": "IE",
        "iso3": "IRL",
        "country": "Ireland",
        "latitude": "53",
        "longitude": "-8"
    },
    "IMN": {
        "iso2": "IM",
        "iso3": "IMN",
        "country": "Isle of Man",
        "latitude": "54.23",
        "longitude": "-4.55"
    },
    "ISR": {
        "iso2": "IL",
        "iso3": "ISR",
        "country": "Israel",
        "latitude": "31.5",
        "longitude": "34.75"
    },
    "ITA": {
        "iso2": "IT",
        "iso3": "ITA",
        "country": "Italy",
        "latitude": "42.8333",
        "longitude": "12.8333"
    },
    "JAM": {
        "iso2": "JM",
        "iso3": "JAM",
        "country": "Jamaica",
        "latitude": "18.25",
        "longitude": "-77.5"
    },
    "JPN": {
        "iso2": "JP",
        "iso3": "JPN",
        "country": "Japan",
        "latitude": "36",
        "longitude": "138"
    },
    "JEY": {
        "iso2": "JE",
        "iso3": "JEY",
        "country": "Jersey",
        "latitude": "49.21",
        "longitude": "-2.13"
    },
    "JOR": {
        "iso2": "JO",
        "iso3": "JOR",
        "country": "Jordan",
        "latitude": "31",
        "longitude": "36"
    },
    "KAZ": {
        "iso2": "KZ",
        "iso3": "KAZ",
        "country": "Kazakhstan",
        "latitude": "48",
        "longitude": "68"
    },
    "KEN": {
        "iso2": "KE",
        "iso3": "KEN",
        "country": "Kenya",
        "latitude": "1",
        "longitude": "38"
    },
    "KIR": {
        "iso2": "KI",
        "iso3": "KIR",
        "country": "Kiribati",
        "latitude": "1.4167",
        "longitude": "173"
    },
    "PRK": {
        "iso2": "KP",
        "iso3": "PRK",
        "country": "Korea, Democratic People's Republic of",
        "latitude": "40",
        "longitude": "127"
    },
    "KOR": {
        "iso2": "KR",
        "iso3": "KOR",
        "country": "South Korea",
        "latitude": "37",
        "longitude": "127.5"
    },
    "KWT": {
        "iso2": "KW",
        "iso3": "KWT",
        "country": "Kuwait",
        "latitude": "29.3375",
        "longitude": "47.6581"
    },
    "KGZ": {
        "iso2": "KG",
        "iso3": "KGZ",
        "country": "Kyrgyzstan",
        "latitude": "41",
        "longitude": "75"
    },
    "LAO": {
        "iso2": "LA",
        "iso3": "LAO",
        "country": "Lao People's Democratic Republic",
        "latitude": "18",
        "longitude": "105"
    },
    "LVA": {
        "iso2": "LV",
        "iso3": "LVA",
        "country": "Latvia",
        "latitude": "57",
        "longitude": "25"
    },
    "LBN": {
        "iso2": "LB",
        "iso3": "LBN",
        "country": "Lebanon",
        "latitude": "33.8333",
        "longitude": "35.8333"
    },
    "LSO": {
        "iso2": "LS",
        "iso3": "LSO",
        "country": "Lesotho",
        "latitude": "-29.5",
        "longitude": "28.5"
    },
    "LBR": {
        "iso2": "LR",
        "iso3": "LBR",
        "country": "Liberia",
        "latitude": "6.5",
        "longitude": "-9.5"
    },
    "LBY": {
        "iso2": "LY",
        "iso3": "LBY",
        "country": "Libya",
        "latitude": "25",
        "longitude": "17"
    },
    "LIE": {
        "iso2": "LI",
        "iso3": "LIE",
        "country": "Liechtenstein",
        "latitude": "47.1667",
        "longitude": "9.5333"
    },
    "LTU": {
        "iso2": "LT",
        "iso3": "LTU",
        "country": "Lithuania",
        "latitude": "56",
        "longitude": "24"
    },
    "LUX": {
        "iso2": "LU",
        "iso3": "LUX",
        "country": "Luxembourg",
        "latitude": "49.75",
        "longitude": "6.1667"
    },
    "MAC": {
        "iso2": "MO",
        "iso3": "MAC",
        "country": "Macao",
        "latitude": "22.1667",
        "longitude": "113.55"
    },
    "MKD": {
        "iso2": "MK",
        "iso3": "MKD",
        "country": "Macedonia, the former Yugoslav Republic of",
        "latitude": "41.8333",
        "longitude": "22"
    },
    "MDG": {
        "iso2": "MG",
        "iso3": "MDG",
        "country": "Madagascar",
        "latitude": "-20",
        "longitude": "47"
    },
    "MWI": {
        "iso2": "MW",
        "iso3": "MWI",
        "country": "Malawi",
        "latitude": "-13.5",
        "longitude": "34"
    },
    "MYS": {
        "iso2": "MY",
        "iso3": "MYS",
        "country": "Malaysia",
        "latitude": "2.5",
        "longitude": "112.5"
    },
    "MDV": {
        "iso2": "MV",
        "iso3": "MDV",
        "country": "Maldives",
        "latitude": "3.25",
        "longitude": "73"
    },
    "MLI": {
        "iso2": "ML",
        "iso3": "MLI",
        "country": "Mali",
        "latitude": "17",
        "longitude": "-4"
    },
    "MLT": {
        "iso2": "MT",
        "iso3": "MLT",
        "country": "Malta",
        "latitude": "35.8333",
        "longitude": "14.5833"
    },
    "MHL": {
        "iso2": "MH",
        "iso3": "MHL",
        "country": "Marshall Islands",
        "latitude": "9",
        "longitude": "168"
    },
    "MTQ": {
        "iso2": "MQ",
        "iso3": "MTQ",
        "country": "Martinique",
        "latitude": "14.6667",
        "longitude": "-61"
    },
    "MRT": {
        "iso2": "MR",
        "iso3": "MRT",
        "country": "Mauritania",
        "latitude": "20",
        "longitude": "-12"
    },
    "MUS": {
        "iso2": "MU",
        "iso3": "MUS",
        "country": "Mauritius",
        "latitude": "-20.2833",
        "longitude": "57.55"
    },
    "MYT": {
        "iso2": "YT",
        "iso3": "MYT",
        "country": "Mayotte",
        "latitude": "-12.8333",
        "longitude": "45.1667"
    },
    "MEX": {
        "iso2": "MX",
        "iso3": "MEX",
        "country": "Mexico",
        "latitude": "23",
        "longitude": "-102"
    },
    "FSM": {
        "iso2": "FM",
        "iso3": "FSM",
        "country": "Micronesia, Federated States of",
        "latitude": "6.9167",
        "longitude": "158.25"
    },
    "MDA": {
        "iso2": "MD",
        "iso3": "MDA",
        "country": "Moldova, Republic of",
        "latitude": "47",
        "longitude": "29"
    },
    "MCO": {
        "iso2": "MC",
        "iso3": "MCO",
        "country": "Monaco",
        "latitude": "43.7333",
        "longitude": "7.4"
    },
    "MNG": {
        "iso2": "MN",
        "iso3": "MNG",
        "country": "Mongolia",
        "latitude": "46",
        "longitude": "105"
    },
    "MNE": {
        "iso2": "ME",
        "iso3": "MNE",
        "country": "Montenegro",
        "latitude": "42",
        "longitude": "19"
    },
    "MSR": {
        "iso2": "MS",
        "iso3": "MSR",
        "country": "Montserrat",
        "latitude": "16.75",
        "longitude": "-62.2"
    },
    "MAR": {
        "iso2": "MA",
        "iso3": "MAR",
        "country": "Morocco",
        "latitude": "32",
        "longitude": "-5"
    },
    "MOZ": {
        "iso2": "MZ",
        "iso3": "MOZ",
        "country": "Mozambique",
        "latitude": "-18.25",
        "longitude": "35"
    },
    "MMR": {
        "iso2": "MM",
        "iso3": "MMR",
        "country": "Burma",
        "latitude": "22",
        "longitude": "98"
    },
    "NAM": {
        "iso2": "NA",
        "iso3": "NAM",
        "country": "Namibia",
        "latitude": "-22",
        "longitude": "17"
    },
    "NRU": {
        "iso2": "NR",
        "iso3": "NRU",
        "country": "Nauru",
        "latitude": "-0.5333",
        "longitude": "166.9167"
    },
    "NPL": {
        "iso2": "NP",
        "iso3": "NPL",
        "country": "Nepal",
        "latitude": "28",
        "longitude": "84"
    },
    "NLD": {
        "iso2": "NL",
        "iso3": "NLD",
        "country": "Netherlands",
        "latitude": "52.5",
        "longitude": "5.75"
    },
    "ANT": {
        "iso2": "AN",
        "iso3": "ANT",
        "country": "Netherlands Antilles",
        "latitude": "12.25",
        "longitude": "-68.75"
    },
    "NCL": {
        "iso2": "NC",
        "iso3": "NCL",
        "country": "New Caledonia",
        "latitude": "-21.5",
        "longitude": "165.5"
    },
    "NZL": {
        "iso2": "NZ",
        "iso3": "NZL",
        "country": "New Zealand",
        "latitude": "-41",
        "longitude": "174"
    },
    "NIC": {
        "iso2": "NI",
        "iso3": "NIC",
        "country": "Nicaragua",
        "latitude": "13",
        "longitude": "-85"
    },
    "NER": {
        "iso2": "NE",
        "iso3": "NER",
        "country": "Niger",
        "latitude": "16",
        "longitude": "8"
    },
    "NGA": {
        "iso2": "NG",
        "iso3": "NGA",
        "country": "Nigeria",
        "latitude": "10",
        "longitude": "8"
    },
    "NIU": {
        "iso2": "NU",
        "iso3": "NIU",
        "country": "Niue",
        "latitude": "-19.0333",
        "longitude": "-169.8667"
    },
    "NFK": {
        "iso2": "NF",
        "iso3": "NFK",
        "country": "Norfolk Island",
        "latitude": "-29.0333",
        "longitude": "167.95"
    },
    "MNP": {
        "iso2": "MP",
        "iso3": "MNP",
        "country": "Northern Mariana Islands",
        "latitude": "15.2",
        "longitude": "145.75"
    },
    "NOR": {
        "iso2": "NO",
        "iso3": "NOR",
        "country": "Norway",
        "latitude": "62",
        "longitude": "10"
    },
    "OMN": {
        "iso2": "OM",
        "iso3": "OMN",
        "country": "Oman",
        "latitude": "21",
        "longitude": "57"
    },
    "PAK": {
        "iso2": "PK",
        "iso3": "PAK",
        "country": "Pakistan",
        "latitude": "30",
        "longitude": "70"
    },
    "PLW": {
        "iso2": "PW",
        "iso3": "PLW",
        "country": "Palau",
        "latitude": "7.5",
        "longitude": "134.5"
    },
    "PSE": {
        "iso2": "PS",
        "iso3": "PSE",
        "country": "Palestinian Territory, Occupied",
        "latitude": "32",
        "longitude": "35.25"
    },
    "PAN": {
        "iso2": "PA",
        "iso3": "PAN",
        "country": "Panama",
        "latitude": "9",
        "longitude": "-80"
    },
    "PNG": {
        "iso2": "PG",
        "iso3": "PNG",
        "country": "Papua New Guinea",
        "latitude": "-6",
        "longitude": "147"
    },
    "PRY": {
        "iso2": "PY",
        "iso3": "PRY",
        "country": "Paraguay",
        "latitude": "-23",
        "longitude": "-58"
    },
    "PER": {
        "iso2": "PE",
        "iso3": "PER",
        "country": "Peru",
        "latitude": "-10",
        "longitude": "-76"
    },
    "PHL": {
        "iso2": "PH",
        "iso3": "PHL",
        "country": "Philippines",
        "latitude": "13",
        "longitude": "122"
    },
    "PCN": {
        "iso2": "PN",
        "iso3": "PCN",
        "country": "Pitcairn",
        "latitude": "-24.7",
        "longitude": "-127.4"
    },
    "POL": {
        "iso2": "PL",
        "iso3": "POL",
        "country": "Poland",
        "latitude": "52",
        "longitude": "20"
    },
    "PRT": {
        "iso2": "PT",
        "iso3": "PRT",
        "country": "Portugal",
        "latitude": "39.5",
        "longitude": "-8"
    },
    "PRI": {
        "iso2": "PR",
        "iso3": "PRI",
        "country": "Puerto Rico",
        "latitude": "18.25",
        "longitude": "-66.5"
    },
    "QAT": {
        "iso2": "QA",
        "iso3": "QAT",
        "country": "Qatar",
        "latitude": "25.5",
        "longitude": "51.25"
    },
    "REU": {
        "iso2": "RE",
        "iso3": "REU",
        "country": "Réunion",
        "latitude": "-21.1",
        "longitude": "55.6"
    },
    "ROU": {
        "iso2": "RO",
        "iso3": "ROU",
        "country": "Romania",
        "latitude": "46",
        "longitude": "25"
    },
    "RUS": {
        "iso2": "RU",
        "iso3": "RUS",
        "country": "Russia",
        "latitude": "60",
        "longitude": "100"
    },
    "RWA": {
        "iso2": "RW",
        "iso3": "RWA",
        "country": "Rwanda",
        "latitude": "-2",
        "longitude": "30"
    },
    "SHN": {
        "iso2": "SH",
        "iso3": "SHN",
        "country": "Saint Helena, Ascension and Tristan da Cunha",
        "latitude": "-15.9333",
        "longitude": "-5.7"
    },
    "KNA": {
        "iso2": "KN",
        "iso3": "KNA",
        "country": "Saint Kitts and Nevis",
        "latitude": "17.3333",
        "longitude": "-62.75"
    },
    "LCA": {
        "iso2": "LC",
        "iso3": "LCA",
        "country": "Saint Lucia",
        "latitude": "13.8833",
        "longitude": "-61.1333"
    },
    "SPM": {
        "iso2": "PM",
        "iso3": "SPM",
        "country": "Saint Pierre and Miquelon",
        "latitude": "46.8333",
        "longitude": "-56.3333"
    },
    "VCT": {
        "iso2": "VC",
        "iso3": "VCT",
        "country": "St. Vincent and the Grenadines",
        "latitude": "13.25",
        "longitude": "-61.2"
    },
    "WSM": {
        "iso2": "WS",
        "iso3": "WSM",
        "country": "Samoa",
        "latitude": "-13.5833",
        "longitude": "-172.3333"
    },
    "SMR": {
        "iso2": "SM",
        "iso3": "SMR",
        "country": "San Marino",
        "latitude": "43.7667",
        "longitude": "12.4167"
    },
    "STP": {
        "iso2": "ST",
        "iso3": "STP",
        "country": "Sao Tome and Principe",
        "latitude": "1",
        "longitude": "7"
    },
    "SAU": {
        "iso2": "SA",
        "iso3": "SAU",
        "country": "Saudi Arabia",
        "latitude": "25",
        "longitude": "45"
    },
    "SEN": {
        "iso2": "SN",
        "iso3": "SEN",
        "country": "Senegal",
        "latitude": "14",
        "longitude": "-14"
    },
    "SRB": {
        "iso2": "RS",
        "iso3": "SRB",
        "country": "Serbia",
        "latitude": "44",
        "longitude": "21"
    },
    "SYC": {
        "iso2": "SC",
        "iso3": "SYC",
        "country": "Seychelles",
        "latitude": "-4.5833",
        "longitude": "55.6667"
    },
    "SLE": {
        "iso2": "SL",
        "iso3": "SLE",
        "country": "Sierra Leone",
        "latitude": "8.5",
        "longitude": "-11.5"
    },
    "SGP": {
        "iso2": "SG",
        "iso3": "SGP",
        "country": "Singapore",
        "latitude": "1.3667",
        "longitude": "103.8"
    },
    "SVK": {
        "iso2": "SK",
        "iso3": "SVK",
        "country": "Slovakia",
        "latitude": "48.6667",
        "longitude": "19.5"
    },
    "SVN": {
        "iso2": "SI",
        "iso3": "SVN",
        "country": "Slovenia",
        "latitude": "46",
        "longitude": "15"
    },
    "SLB": {
        "iso2": "SB",
        "iso3": "SLB",
        "country": "Solomon Islands",
        "latitude": "-8",
        "longitude": "159"
    },
    "SOM": {
        "iso2": "SO",
        "iso3": "SOM",
        "country": "Somalia",
        "latitude": "10",
        "longitude": "49"
    },
    "ZAF": {
        "iso2": "ZA",
        "iso3": "ZAF",
        "country": "South Africa",
        "latitude": "-29",
        "longitude": "24"
    },
    "SGS": {
        "iso2": "GS",
        "iso3": "SGS",
        "country": "South Georgia and the South Sandwich Islands",
        "latitude": "-54.5",
        "longitude": "-37"
    },
    "ESP": {
        "iso2": "ES",
        "iso3": "ESP",
        "country": "Spain",
        "latitude": "40",
        "longitude": "-4"
    },
    "LKA": {
        "iso2": "LK",
        "iso3": "LKA",
        "country": "Sri Lanka",
        "latitude": "7",
        "longitude": "81"
    },
    "SDN": {
        "iso2": "SD",
        "iso3": "SDN",
        "country": "Sudan",
        "latitude": "15",
        "longitude": "30"
    },
    "SUR": {
        "iso2": "SR",
        "iso3": "SUR",
        "country": "Suriname",
        "latitude": "4",
        "longitude": "-56"
    },
    "SJM": {
        "iso2": "SJ",
        "iso3": "SJM",
        "country": "Svalbard and Jan Mayen",
        "latitude": "78",
        "longitude": "20"
    },
    "SWZ": {
        "iso2": "SZ",
        "iso3": "SWZ",
        "country": "Swaziland",
        "latitude": "-26.5",
        "longitude": "31.5"
    },
    "SWE": {
        "iso2": "SE",
        "iso3": "SWE",
        "country": "Sweden",
        "latitude": "62",
        "longitude": "15"
    },
    "CHE": {
        "iso2": "CH",
        "iso3": "CHE",
        "country": "Switzerland",
        "latitude": "47",
        "longitude": "8"
    },
    "SYR": {
        "iso2": "SY",
        "iso3": "SYR",
        "country": "Syrian Arab Republic",
        "latitude": "35",
        "longitude": "38"
    },
    "TWN": {
        "iso2": "TW",
        "iso3": "TWN",
        "country": "Taiwan",
        "latitude": "23.5",
        "longitude": "121"
    },
    "TJK": {
        "iso2": "TJ",
        "iso3": "TJK",
        "country": "Tajikistan",
        "latitude": "39",
        "longitude": "71"
    },
    "TZA": {
        "iso2": "TZ",
        "iso3": "TZA",
        "country": "Tanzania, United Republic of",
        "latitude": "-6",
        "longitude": "35"
    },
    "THA": {
        "iso2": "TH",
        "iso3": "THA",
        "country": "Thailand",
        "latitude": "15",
        "longitude": "100"
    },
    "TLS": {
        "iso2": "TL",
        "iso3": "TLS",
        "country": "Timor-Leste",
        "latitude": "-8.55",
        "longitude": "125.5167"
    },
    "TGO": {
        "iso2": "TG",
        "iso3": "TGO",
        "country": "Togo",
        "latitude": "8",
        "longitude": "1.1667"
    },
    "TKL": {
        "iso2": "TK",
        "iso3": "TKL",
        "country": "Tokelau",
        "latitude": "-9",
        "longitude": "-172"
    },
    "TON": {
        "iso2": "TO",
        "iso3": "TON",
        "country": "Tonga",
        "latitude": "-20",
        "longitude": "-175"
    },
    "TTO": {
        "iso2": "TT",
        "iso3": "TTO",
        "country": "Trinidad & Tobago",
        "latitude": "11",
        "longitude": "-61"
    },
    "TUN": {
        "iso2": "TN",
        "iso3": "TUN",
        "country": "Tunisia",
        "latitude": "34",
        "longitude": "9"
    },
    "TUR": {
        "iso2": "TR",
        "iso3": "TUR",
        "country": "Turkey",
        "latitude": "39",
        "longitude": "35"
    },
    "TKM": {
        "iso2": "TM",
        "iso3": "TKM",
        "country": "Turkmenistan",
        "latitude": "40",
        "longitude": "60"
    },
    "TCA": {
        "iso2": "TC",
        "iso3": "TCA",
        "country": "Turks and Caicos Islands",
        "latitude": "21.75",
        "longitude": "-71.5833"
    },
    "TUV": {
        "iso2": "TV",
        "iso3": "TUV",
        "country": "Tuvalu",
        "latitude": "-8",
        "longitude": "178"
    },
    "UGA": {
        "iso2": "UG",
        "iso3": "UGA",
        "country": "Uganda",
        "latitude": "1",
        "longitude": "32"
    },
    "UKR": {
        "iso2": "UA",
        "iso3": "UKR",
        "country": "Ukraine",
        "latitude": "49",
        "longitude": "32"
    },
    "ARE": {
        "iso2": "AE",
        "iso3": "ARE",
        "country": "United Arab Emirates",
        "latitude": "24",
        "longitude": "54"
    },
    "GBR": {
        "iso2": "GB",
        "iso3": "GBR",
        "country": "United Kingdom",
        "latitude": "54",
        "longitude": "-2"
    },
    "USA": {
        "iso2": "US",
        "iso3": "USA",
        "country": "United States",
        "latitude": "38",
        "longitude": "-97"
    },
    "UMI": {
        "iso2": "UM",
        "iso3": "UMI",
        "country": "United States Minor Outlying Islands",
        "latitude": "19.2833",
        "longitude": "166.6"
    },
    "URY": {
        "iso2": "UY",
        "iso3": "URY",
        "country": "Uruguay",
        "latitude": "-33",
        "longitude": "-56"
    },
    "UZB": {
        "iso2": "UZ",
        "iso3": "UZB",
        "country": "Uzbekistan",
        "latitude": "41",
        "longitude": "64"
    },
    "VUT": {
        "iso2": "VU",
        "iso3": "VUT",
        "country": "Vanuatu",
        "latitude": "-16",
        "longitude": "167"
    },
    "VEN": {
        "iso2": "VE",
        "iso3": "VEN",
        "country": "Venezuela",
        "latitude": "8",
        "longitude": "-66"
    },
    "VNM": {
        "iso2": "VN",
        "iso3": "VNM",
        "country": "Vietnam",
        "latitude": "16",
        "longitude": "106"
    },
    "VGB": {
        "iso2": "VG",
        "iso3": "VGB",
        "country": "Virgin Islands, British",
        "latitude": "18.5",
        "longitude": "-64.5"
    },
    "VIR": {
        "iso2": "VI",
        "iso3": "VIR",
        "country": "Virgin Islands, U.S.",
        "latitude": "18.3333",
        "longitude": "-64.8333"
    },
    "WLF": {
        "iso2": "WF",
        "iso3": "WLF",
        "country": "Wallis and Futuna",
        "latitude": "-13.3",
        "longitude": "-176.2"
    },
    "ESH": {
        "iso2": "EH",
        "iso3": "ESH",
        "country": "Western Sahara",
        "latitude": "24.5",
        "longitude": "-13"
    },
    "YEM": {
        "iso2": "YE",
        "iso3": "YEM",
        "country": "Yemen",
        "latitude": "15",
        "longitude": "48"
    },
    "ZMB": {
        "iso2": "ZM",
        "iso3": "ZMB",
        "country": "Zambia",
        "latitude": "-15",
        "longitude": "30"
    },
    "ZWE": {
        "iso2": "ZW",
        "iso3": "ZWE",
        "country": "Zimbabwe",
        "latitude": "-20",
        "longitude": "30"
    }
};