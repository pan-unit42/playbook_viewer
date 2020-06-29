const default_killchain = 'lockheed';
let consts = null;
let playbook_information = null;
let current_playbook = null;
let current_report = null;
let current_intrusion_set = null;
let current_killchain = null;
let ttp_grid_params = null;
let coa_grid_params = null;

String.prototype.replaceAll = function (search, replacement) {
    let target = this;
    return target.split(search).join(replacement);
};

function dropQueryParameters(url) {
    return url.split("?")[0];
}

function emptyPlaybook() {
    const message = `Welcome to the Unit 42 Playbook Viewer.<br/><br/>Please select a playbook to begin.`;
    history.pushState({}, "", dropQueryParameters(window.location.href));
    $('.playbook').removeClass('activebtn');
    $('.playbook-description').html(message);
    $('.campaign-description').empty();
    $('.timeline').empty();
    $('.info1').empty();
    $('.info2').empty();
    $('.phasescontainer').empty();
    $('.modalcontainer').empty();
    current_playbook = null;
    current_report = null;
    current_intrusion_set = null;
    current_killchain = null;
    ttp_grid_params = null;
    coa_grid_params = null;
}

function initTour() {
    const step0link = 'https://unit42.paloaltonetworks.com/unit42-introducing-the-adversary-playbook-first-up-oilrig/';

    // noinspection JSJQueryEfficiency
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
                orphan: true,
                element: "",
                title: "Welcome to the Unit 42 Playbook Viewer",
                content: "The Playbook viewer is a system for parsing STIX2 content that contains an Adversary Playbook. " +
                    "You can read more about this <a href='" + step0link + "' target='_blank' >here</a>" +
                    " or follow the prompts to check it out."
            },
            {
                element: "#playbook_oilrig",
                title: "Select a Playbook",
                content: "A Playbook is a collection of Plays. " +
                    "Plays are campaigns that were conducted by an adversary, you can select them from this list.",
                // Use the Oilrig Playbook for the demo
                onNext: () => $('.playbooks').children('.btn').first().trigger('click')
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
                element: ".dropdown",
                title: "Hover to select a Kill Chain",
                content: "Lockheed Martin's Kill Chain is the default. Mitre ATT&CK is also supported.",
                placement: "top"
            },
            {
                element: ".phasescontainer",
                title: "Structure of a Play",
                content: "Plays contain the specific Mitre ATT&CK techniques used by the adversary.",
                placement: "top",
                // technique: Spear phishing
                // hardcoding the id here is not ideal
                onNext: () => $("[ap_id='attack-pattern--6aac77c4-eaf2-4366-8c13-ce50ab951f38']").trigger('click')
            },
            {
                orphan: true,
                element: ".indicator-table",
                title: "Technique cards contain a STIX2 indicator pattern and a description.",
                content: "",
                placement: "top",
                onPrev: () => $('.close').trigger('click')
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
                    " on your hosts or network to identify this technique or adversary in action."
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
                onPrev: () => $("[ap_id='attack-pattern--6aac77c4-eaf2-4366-8c13-ce50ab951f38']").trigger('click')
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
        buildMap();
    });

    // Display the "Home" page
    $(document).on('click', ".view-home", function () {
        emptyPlaybook();
        buildHome();
    });

    function onMouseMove() {
        $(".dropdown-content-clicked")
            .addClass("dropdown-content")
            .removeClass("dropdown-content-clicked");

        $(document).off("mousemove", onMouseMove);
    }

    $(document).on('click', '.killchain-option', function (event) {
        const {matrices} = consts;
        const killChain = event.target.getAttribute("value");
        storeCurrentKillChain(killChain);
        buildPhaseContainer(killChain, current_report, current_playbook);

        // update the div text to show the selected kill chain
        const useKillChain = current_killchain || default_killchain;
        const textName = matrices.find(i => i.value === useKillChain).text;
        const dispPrefix = textName.startsWith('-') ? 'ATT&CK: ' : '';
        const dispName = useKillChain === 'lockheed' ?
            `Select Kill Chain [${textName}]` : `Select Kill Chain [${dispPrefix}${textName}]`;

        $('.dropdown').html(dispName);

        // TODO: show the number of linked ttps that are displayed in the selected kill chain

        $(".dropdown-content")
            .addClass("dropdown-content-clicked")
            .removeClass("dropdown-content");

        $(document).on("mousemove", onMouseMove);
    });

    $(document).on('click', '.display-top', function (event) {
        const isVisible = $('.inside').is(':visible');
        if (isVisible) {
            $('.inside').addClass("inside-hidden").removeClass("inside");
        } else {
            $('.inside-hidden').addClass("inside").removeClass("inside-hidden");
        }
    });

    $(document).on('click', '.display-coa', function (event) {
        const isVisible = $('.coa-grid').is(':visible');
        if (isVisible) {
            $('.coa-grid').addClass("coa-grid-hidden").removeClass("coa-grid");
        } else {
            $('.coa-grid-hidden').addClass("coa-grid").removeClass("coa-grid-hidden");
        }
        if (coa_grid_params) {
            coa_grid_params.api.sizeColumnsToFit();
        }
    });

    $(document).on('click', '.display-ind', function (event) {
        const isVisible = $('.ind-container').is(':visible');
        if (isVisible) {
            $('.ind-container').addClass("ind-container-hidden").removeClass("ind-container");
        } else {
            $('.ind-container-hidden').addClass("ind-container").removeClass("ind-container-hidden");
        }
    });

    showPlaybook();
}

function buildHome() {
    const {matrices} = consts;
    const useKillChain = current_killchain || default_killchain;
    const textName = matrices.find(i => i.value === useKillChain).text;
    const dispPrefix = textName.startsWith('-') ? 'ATT&CK: ' : '';
    const dispName = useKillChain === 'lockheed' ?
        `Select Kill Chain [${textName}]` : `Select Kill Chain [${dispPrefix}${textName}]`;

    const message = `Welcome to the Unit 42 Playbook Viewer.<br/><br/>Please select a playbook to begin.`;
    const options = matrices.map(i => `<li class="killchain-option" value="${i.value}">${i.text}</li>`).join('');

    const htmlContents = `        
        <div class="box header">
            <span>PLAYBOOK VIEWER</span>
        </div>
        <div class="box inside">
            <div class="box top">
                <div class="box timeline"></div>
                <div class="box descriptions">
                    <div class="playbook-description">${message}</div>
                    <div class="campaign-description"></div>
                </div>
            </div>
            <div class="box bottom">
                <div class="info info1"></div>
                <div class="info info2"></div>
            </div>
        </div>
        <div class="control phasescontrol">
            <div class="dropdown-container">
                <div class="dropdown">${dispName}</div>
                <div class="dropdown-content">
                    <ul class="dropdown-list">${options}</ul>
                 </div>
            </div>
            <div class="option-control">
                <div class="display-empty-columns" 
                     onclick="toggleColumnDisplay()"
                     title="Show/Hide Empty Phases"><i class="fas fa-arrows-alt-h"></i></div>
                <div class="display-top"
                     title="Show/Hide Descriptions"><i class="fas fa-arrows-alt-v"></i></div>
            </div>
        </div>
        <div class="phasescontainer"/>
    `;
    $(".contents").html(htmlContents);
}

function buildSideBar(playbooks) {
    const parent = $('.playbooks');
    const klass = 'btn playbook';
    parent.children('.playbook').remove();

    playbooks.forEach(playbook => {
        const {pb_file, title} = playbook;
        const id = `playbook_${pb_file.replace('.json', '')}`;
        const el = `<div class="${klass}" id="${id}" pb_file="${pb_file}" onclick="">${title}</div>`;
        parent.append(el);
    });
}

function buildMap() {
    const {iso2_to_iso3, iso3_to_data} = consts;

    const tooltip = 'Please hover over a bubble to see Playbooks targeting that country.';
    const message = `Welcome to the Unit 42 Playbook Map.<br/><br/>${tooltip}`;

    const htmlContents = `
        <div class="box header"><span>PLAYBOOK MAP</span></div>
        <div class="map-description">${message}</div>
        <div id='container' class='container'></div>
     `;
    $(".contents").html(htmlContents);

    const countries_to_playbooks = playbook_information.reduce((r, i) => {
        const unknown = '???';
        if (i.regions.length > 0) {
            i.regions.forEach(iso2 => {
                const iso3 = iso2_to_iso3[iso2] || unknown;
                iso3 in r ? r[iso3].push(i) : r[iso3] = [i];
            });
        } else {
            // Playbooks without at least one target country could be located in a blank location on the map
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
            return '';
        }
    };

    map.bubbles(as_bubbles, bubblesConfig);

    map.svg.selectAll('.bubbles').on('mouseover', function () {
        const extraInfoElem = $('.extrainfo');

        const e = d3.event;
        const data = e.target.__data__;

        const diff = extraInfoElem.length && extraInfoElem[0].getAttribute('id') !== data.country;

        if (extraInfoElem.length === 0 || diff) {
            const pbsHtml = data.pbs.map(i =>
                `<div class="extrainfo-inner" onclick="loadPlaybookExtra('${i.pb_file}')">${i.title}</div>`
            ).join('');

            const containerContents = `
                <div id="${data.country}" class="extrainfo">
                    Targeted Country<br/>${data.country}<br/><br/>Playbooks<br/>${data.count}<br/><br/>${pbsHtml}
                </div>
            `;

            $('.extrainfo').remove();
            $('.container').append(containerContents);
            $('.extrainfo').css({top: e.offsetY, left: e.offsetX});
        }
    });

    map.svg.on('click', function () {
        $('.extrainfo').remove();
    });

    map.svg.selectAll('.datamaps-subunit').on('click', function () {
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
    const {x_cta_country_ov} = consts;

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
    const {industry_sector_ov} = consts;

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

    $('.modalcontainer').after(filterMenu);
}

function initPlaybooks(playbooks) {
    buildHome();
    playbook_information = playbooks;
    buildSideBar(playbooks);
    initEvents();
}

function loadConsts() {
    const url = new URL('consts.json', window.location.href);
    $.getJSON(url, data => {
        consts = data;
    }).then(() => {
        loadPlaybooks();
    }).catch(err => {
        console.log(err);
    });
}

function loadPlaybooks() {
    const url = new URL('playbooks.json', window.location.href);
    $.getJSON(url, playbooks => {
        initPlaybooks(playbooks);
    }).catch(err => {
        console.log(err);
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

function getRelatedCOA(ttp_id, playbook) {
    const all_relationships = playbook['objects'].filter(o => o.type === 'relationship');
    return all_relationships
        .filter(o => (o.source_ref.startsWith("course-of-action--") && o.target_ref === ttp_id))
        .map(r => getObjectFromPlaybook(r.source_ref, playbook));
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
    sortIndicators(indicators);

    const indicatorTypesForList = ['file', 'domain-name', 'url', 'ipv4-addr', 'ipv6-addr'];
    const indicatorList = indicators.filter(i => indicatorTypesForList.includes(i.p.type));
    const indicatorListByType = indicatorList.reduce((r, i, idx) => {
        const {type, value} = i.p;
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
    $('.modalcontainer').after(`<div class="indicator-list"><span class="close">&times;</span> ${indicatorTable}</div>`);
}

function addInfoBox2(report, playbook) {
    const {industry_sector_ov, industry_sector_ov_to_icon, x_cta_country_ov} = consts;
    const identityObjects = getTypeFromReport("identity", report, playbook);

    const identityInformation = identityObjects.reduce((r, i) => {

        if ('sectors' in i) {
            i['sectors'].forEach(x => {
                if (!(r['sectors'].includes(x))) {
                    r['sectors'].push(x);
                }
            });
        }

        if ('x_cta_country' in i) {
            i['x_cta_country'].forEach(x => {
                if (!(r['regions'].includes(x))) {
                    r['regions'].push(x);
                }
            });
        }

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

function storeCurrentReport(report) {
    current_report = report;
}

function storeCurrentKillChain(killChain) {
    current_killchain = killChain;
}

function displayReportByID(report_id, playbook) {
    //Get the report content from the id
    const report = getObjectFromPlaybook(report_id, playbook);
    storeCurrentReport(report);
    displayReport(report, playbook);
}

function displayReport(report, playbook) {
    //Build the HTML table for this report
    addInfoBox2(report, playbook);
    const useKillChain = current_killchain || default_killchain;
    storeCurrentKillChain(useKillChain);
    buildPhaseContainer(useKillChain, report, playbook);
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
            });
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

function filterAttackPatterns(killChain, phase, attack_patterns) {
    const {subMatrixToPlatforms} = consts;
    const [matrix, subViewOne, subViewTwo] = killChain.split(':');
    const subMatrix = subViewTwo || subViewOne;
    const platforms = subMatrixToPlatforms[subMatrix] || [];

    return attack_patterns.reduce((r, i) => {
        const inPhase = i.kill_chain_phases.filter(j => j.kill_chain_name === matrix && j.phase_name === phase);
        if (inPhase.length) {
            if (subMatrix) {
                const inSubMatrix = i.x_mitre_platforms && i.x_mitre_platforms.some(j => platforms.includes(j));
                if (inSubMatrix) {
                    r.push(i);
                }
            } else {
                r.push(i);
            }
        }
        return r;
    }, []);
}

function zip() {
    const args = [].slice.call(arguments);
    const longest = args.reduce((a, b) => a.length > b.length ? a : b, []);
    return longest.map((_, i) => args.map(array => array[i]));
}

function onPhaseCellClicked(event) {
    const {ttp, report, playbook} = event.value;
    if (ttp) {
        const modalContents = writeAPModal(ttp, report, playbook);
        let modalContainer = $('.modalcontainer');
        modalContainer.empty();
        modalContainer.html(modalContents);
    }
}

function renderPhaseCell(params) {
    if (params.value.ttp) {
        const {ttp, indicators} = params.value;
        return `<div class="phases" ap_id=${ttp.id}>${ttp.name}<div class="ui circular label">${indicators.length}</div></div>`;
    } else {
        return null;
    }
}

function toggleColumnDisplay() {
    const cols = ttp_grid_params.columnApi.getAllColumns();
    const invisibleCols = cols.filter(i => !i.visible);
    if (invisibleCols.length) {
        // show all columns
        ttp_grid_params.columnApi.setColumnsVisible(cols, true);
    } else {
        // hide empty columns
        const cols = {};
        const show = {};

        ttp_grid_params.api.forEachNode(node => {
            const data = node.data;
            Object.keys(data).forEach(k => {
                cols[k] = 1;
                if (data[k].ttp) {
                    show[k] = 1;
                }
            });
        });

        const colsNames = Object.keys(cols);
        const showNames = Object.keys(show);
        const hideCols = colsNames.filter(x => !showNames.includes(x));

        ttp_grid_params.columnApi.setColumnsVisible(hideCols, false);
    }
}

function storeTTPGridParams(params) {
    ttp_grid_params = params;
}

function onTTPGridReady(params) {
    storeTTPGridParams(params);
    params.api.sizeColumnsToFit();
}

function getKillChainPhases(killChain) {
    const {lmcoKillChain, mitreAttack, mitrePreAttack, mitreMobileAttack} = consts;

    const matrixToPhases = {
        'lockheed': lmcoKillChain,
        'mitre-attack': mitreAttack,
        'mitre-pre-attack': mitrePreAttack,
        'mitre-mobile-attack': mitreMobileAttack
    };

    const [matrix] = killChain.split(':', 1);
    return matrixToPhases[matrix];
}

function buildPhaseContainer(killChain, report, playbook) {
    const attack_patterns = getTypeFromReport("attack-pattern", report, playbook);
    const campaign = getTypeFromReport("campaign", report, playbook)[0];

    $('.campaign-description').html(campaign['description'].replaceAll("\r\n", "</br>"));
    $('.phasescontainer').empty();

    const killChainPhases = getKillChainPhases(killChain);

    const columnDefs = killChainPhases.map(i => ({
        headerName: i.columnHeader,
        field: i.phaseName,
        minWidth: 178,
        cellRenderer: renderPhaseCell
    }));

    const columnData0 = killChainPhases.reduce((r, i) => {
        r[i.phaseName] = filterAttackPatterns(killChain, i.phaseName, attack_patterns);
        return r;
    }, {});

    const phases = Object.keys(columnData0);
    const columnData1 = zip(...Object.values(columnData0));

    const rowData = [];

    columnData1.forEach(row => {
        const rd = row.reduce((r, v, i) => {
            const indicators = v ? getReportIndicators(v, report, playbook) : [];
            r[phases[i]] = {report, playbook, phase: phases[i], campaign, ttp: v, indicators};
            return r;
        }, {});

        rowData.push(rd);
    });

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: rowData,
        rowHeight: 125,
        suppressMovableColumns: true,
        onGridReady: onTTPGridReady,
        onCellClicked: onPhaseCellClicked
    };

    const eGridDiv = document.querySelector('.phasescontainer');
    new agGrid.Grid(eGridDiv, gridOptions);
}

function intersection() {
    return Array.from(arguments).reduce((previous, current) => {
        return previous.filter(element => {
            return current.indexOf(element) > -1;
        });
    });
}

function compare(a, b) {
    return (a > b ? 1 : ((b > a) ? -1 : 0));
}

function sortIndicators(indicators) {
    // TODO: replace with the STIX 2 ANTLR grammar parser
    indicators.forEach(i => {
        i['p'] = {type: "", key: "", value: ""};
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
}

function getReportIndicators(ap, report, playbook) {
    //Need to find the intersection of indicators that use the attack pattern, and are in the report.
    const ap_indicators = getRelatedIndicators(ap.id, playbook);
    const campaign = getTypeFromReport("campaign", report, playbook)[0];
    const campaign_indicators = getRelatedIndicators(campaign.id, playbook);
    // noinspection UnnecessaryLocalVariableJS,JSCheckFunctionSignatures
    const indicators = Array.from(new Set(intersection(ap_indicators, campaign_indicators)));
    return indicators;
}

function writeMalwareTooltip(malwares) {
    const {malware_label_ov} = consts;
    const malwareNames = malwares.map(m => m['name']).join(', ');

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

    return `<td class="tooltip" width="20%">${malwareNames}${malwareToolTip}</td>`;
}

function storeCOAGridParams(params) {
    coa_grid_params = params;
}

function onCOAGridColumnResized() {
    coa_grid_params.api.resetRowHeights();
}

function onCOAGridReady(params) {
    storeCOAGridParams(params);
    params.api.sizeColumnsToFit();
    params.api.resetRowHeights();
}

function renderCOAFieldCell(params) {
    return params.value.replaceAll("\n", "<br/>");
}

function getValueForCOACell(field, stix2_obj) {
    const {coa_custom_field_cols} = consts;
    const {keys} = coa_custom_field_cols[field];

    let v = undefined;
    for (let i = 0; i < keys.length; i++) {
        v = stix2_obj[keys[i]];
        if (v) {
            break;
        }
    }

    if (typeof v === 'string') {
        return v;
    } else if (Array.isArray(v)) {
        return v.join(', ');
    } else {
        return '';
    }
}

function getRelValueForCOACell(field, coa, ap, relationships) {
    const rel = relationships.find(i => coa['id'] === i['source_ref'] && ap['id'] === i['target_ref']);

    return getValueForCOACell(field, rel);
}

function getValueForCOARow(coa, ap, relationships) {
    const {coa_custom_field_cols} = consts;

    return Object.keys(coa_custom_field_cols).reduce((r, i) => {
        const relField = coa_custom_field_cols[i]['relationshipField'];
        r[i] = relField ? getRelValueForCOACell(i, coa, ap, relationships) : getValueForCOACell(i, coa);
        return r;
    }, {});
}

function writeAPModal(ap, report, playbook) {
    const {coa_custom_field_cols} = consts;
    const campaign = getTypeFromReport("campaign", report, playbook)[0];
    const indicators = getReportIndicators(ap, report, playbook);
    const coas = getRelatedCOA(ap.id, playbook);
    sortIndicators(indicators);
    // Retrieve the indicator description from the relationship between indicator and attack-pattern
    const relationships = getTypeFromReport("relationship", report, playbook);

    const modal = document.createElement('div');
    modal.id = `${ap.id}_${campaign.id}`;
    modal.className = "modal";

    let ttpLink = '';
    if ('external_references' in ap && ap['external_references'].length) {
        const attackEntry = ap['external_references'].find(i => i.url && i.url.startsWith('https://attack.mitre.org/'));
        if (attackEntry) {
            const a = `<a href="${attackEntry.url}" target="_blank"><sup>REFERENCE</sup></a>`;
            ttpLink = `<p><b>Technique:</b> ${ap.name} ${a}</p><br>`;
        }
    }

    let indicatorTable = '';
    if (indicators.length === 0) {
        indicatorTable += '<span>No Indicators Available</span><br>';
    } else {
        indicatorTable += '<table class="indicator-table">' +
            '<tr><th id="indicator-description">Description</th>' +
            '<th id="indicator-pattern">Indicator Pattern</th>' +
            '<th id="indicator-malware">Malware</th></tr>';
        indicators.forEach(i => {
            // Retrieve the indicator description from the relationship between indicator and attack-pattern
            // Provide backwards-compatibility with playbooks that stored the description in the indicator object
            const {description} = relationships.find(r => (r && (r.source_ref === i.id) && (r.target_ref === ap.id))) || {description: i.name};
            const malwares = getRelatedMalware(i.id, playbook);
            const malwareInfo = malwares.length ? writeMalwareTooltip(malwares) : `<td></td>`;

            try {
                indicatorTable += '<tr>' + `<td>${description}</td>` + `<td class="indicators">${escapeHtml(i.pattern)}</td>` + malwareInfo + '</tr>';
            } catch (e) {
                // The playbook contains a malformed relationship or description
                // console.log(JSON.stringify({text: text, e: e}));
            }
        });
        indicatorTable += '</table>';
    }

    const coaControl = `<div class="display-coa" title="Show/Hide Courses of Action">Courses of Action<div class="coa-control"><i class="fas fa-arrows-alt-v"></i></div></div>`;
    const indControl = `<div class="display-ind" title="Show/Hide Indicators">Indicators<div class="ind-control"><i class="fas fa-arrows-alt-v"></i></div></div>`;

    const coaContent = coas.length ? `${coaControl}<div class="coa-grid-elem coa-grid"></div>` : "";
    const indContent = `${indControl}<div class="ind-container">${indicatorTable}</div>`;
    const modalContent = `<div class="modal-content"><div class="modal-header">${ttpLink}<span class="close">&times;</span></div>${coaContent}${indContent}</div>`;

    modal.insertAdjacentHTML('beforeend', modalContent);

    const columnDefs = Object.keys(coa_custom_field_cols)
        .map(c => ({
            headerName: coa_custom_field_cols[c]['headerName'],
            field: c,
            minWidth: 178,
            resizable: true,
            autoHeight: true,
            cellStyle: {'white-space': 'normal !important'},
            cellRenderer: renderCOAFieldCell
        }));
    const rowData = coas.map(coa => getValueForCOARow(coa, ap, relationships));
    rowData.sort((a, b) =>
        ((a['panw_products'] || '').localeCompare((b['panw_products'] || ''))) ||
        ((a['name']).localeCompare((b['name'] || '')))
    );

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: rowData,
        onGridReady: onCOAGridReady,
        onColumnResized: onCOAGridColumnResized,
        suppressMovableColumns: true,
        enableCellTextSelection: true
    };

    const eGridDiv = modal.querySelector('.coa-grid-elem');
    new agGrid.Grid(eGridDiv, gridOptions);

    // TODO: Switch indicator table to indicator aggrid

    return modal;
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