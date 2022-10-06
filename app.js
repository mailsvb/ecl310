$( document ).ready(function() {
    $('[data-toggle="tooltip"]').tooltip();
    action('state');
    $('#heizung-container').hide();
    $('#warmwasser-container').hide();
    createSchedule();
    createOffDates();
    createHeatCurve();
});

let lastDialledNumbers = [];

window.electronAPI.receive('data', (data) => {
    if (data.action == 'state') {
        $(`#${data.number}`).text(data.value);
    }
});

window.electronAPI.receive('settings', (data) => {
    $(`#${data.key}-set`).val(data.value);
});

$('#reload').click(function() {
    action('reload');
});
$('#logout').click(function() {
    action('logout');
});
$('#exit').click(function() {
    action('exit');
});
$('#heizung').click(function() {
    $('#home-container').hide();
    $('#warmwasser-container').hide();
    $('#heizung-container').show();
    action('settings');
});
$('#warmwasser').click(function() {
    $('#home-container').hide();
    $('#heizung-container').hide();
    $('#warmwasser-container').show();
    action('settings');
});
$('#heizung-back,#warmwasser-back').each(function(){
    $(this).click(function() {
        $('#heizung-container').hide();
        $('#warmwasser-container').hide();
        $('#home-container').show();
    });
});
$('#4200-set').change(() => {
    window.electronAPI.send('action', { action: 'set', id: 4200, value: parseInt($('#4200-set').val()) });
});
$('#4201-set').change(() => {
    window.electronAPI.send('action', { action: 'set', id: 4201, value: parseInt($('#4201-set').val()) });
});

$('#settings-container input').on('change', (event) => {
    const obj = { item: $(event.target).attr('id') }
    switch ($(event.target).attr('type')) {
        case 'checkbox':
            obj.value = $(event.target).is(':checked');
            break;
        default:
            break;
    }
    $('#preferredHotKey').prop('disabled', $('#dialFromHotKey').is(':checked') === false);
    Object.keys(obj).indexOf('value') >= 0 && window.electronAPI.send('settings', obj);
});

function createSchedule() {
    const programs = ['ww', 'hz', 'pu'];
    const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const ids = {
        ww: {
            Mo: { 1: [ 3209, 3210 ], 2: [ 3211, 3212 ], 3: [ 3213, 3214 ] },
            Di: { 1: [ 3219, 3220 ], 2: [ 3221, 3222 ], 3: [ 3223, 3224 ] },
            Mi: { 1: [ 3229, 3230 ], 2: [ 3231, 3232 ], 3: [ 3233, 3234 ] },
            Do: { 1: [ 3239, 3240 ], 2: [ 3241, 3242 ], 3: [ 3243, 3244 ] },
            Fr: { 1: [ 3249, 3250 ], 2: [ 3251, 3252 ], 3: [ 3253, 3254 ] },
            Sa: { 1: [ 3259, 3260 ], 2: [ 3261, 3262 ], 3: [ 3263, 3264 ] },
            So: { 1: [ 3269, 3270 ], 2: [ 3271, 3272 ], 3: [ 3273, 3274 ] }
        },
        hz: {
            Mo: { 1: [ 3109, 3110 ], 2: [ 3111, 3112 ], 3: [ 3113, 3114 ] },
            Di: { 1: [ 3119, 3120 ], 2: [ 3121, 3122 ], 3: [ 3123, 3124 ] },
            Mi: { 1: [ 3129, 3130 ], 2: [ 3131, 3132 ], 3: [ 3133, 3134 ] },
            Do: { 1: [ 3139, 3140 ], 2: [ 3141, 3142 ], 3: [ 3143, 3144 ] },
            Fr: { 1: [ 3149, 3150 ], 2: [ 3151, 3152 ], 3: [ 3153, 3154 ] },
            Sa: { 1: [ 3159, 3160 ], 2: [ 3161, 3162 ], 3: [ 3163, 3164 ] },
            So: { 1: [ 3169, 3170 ], 2: [ 3171, 3172 ], 3: [ 3173, 3174 ] }
        },
        pu: {
            Mo: { 1: [ 3309, 3310 ], 2: [ 3311, 3312 ], 3: [ 3313, 3314 ] },
            Di: { 1: [ 3319, 3320 ], 2: [ 3321, 3322 ], 3: [ 3323, 3324 ] },
            Mi: { 1: [ 3329, 3330 ], 2: [ 3331, 3332 ], 3: [ 3333, 3334 ] },
            Do: { 1: [ 3339, 3340 ], 2: [ 3341, 3342 ], 3: [ 3343, 3344 ] },
            Fr: { 1: [ 3349, 3350 ], 2: [ 3351, 3352 ], 3: [ 3353, 3354 ] },
            Sa: { 1: [ 3359, 3360 ], 2: [ 3361, 3362 ], 3: [ 3363, 3364 ] },
            So: { 1: [ 3369, 3370 ], 2: [ 3371, 3372 ], 3: [ 3373, 3374 ] }
        }
    }
    const options = {
        0: '00:00',
        30: '00:30',
        100: '01:00',
        130: '01:30',
        200: '02:00',
        230: '02:30',
        300: '03:00',
        330: '03:30',
        400: '04:00',
        430: '04:30',
        500: '05:00',
        530: '05:30',
        600: '06:00',
        630: '06:30',
        700: '07:00',
        730: '07:30',
        800: '08:00',
        830: '08:30',
        900: '09:00',
        930: '09:30',
        1000: '10:00',
        1030: '10:30',
        1100: '11:00',
        1130: '11:30',
        1200: '12:00',
        1230: '12:30',
        1300: '13:00',
        1330: '13:30',
        1400: '14:00',
        1430: '14:30',
        1500: '15:00',
        1530: '15:30',
        1600: '16:00',
        1630: '16:30',
        1700: '17:00',
        1730: '17:30',
        1800: '18:00',
        1830: '18:30',
        1900: '19:00',
        1930: '19:30',
        2000: '20:00',
        2030: '20:30',
        2100: '21:00',
        2130: '21:30',
        2200: '22:00',
        2230: '22:30',
        2300: '23:00',
        2330: '23:30',
        2400: '24:00'
    }
    programs.forEach(prog => {
        let navButton = `<nav><div class="nav nav-tabs" id="${prog}-tab" role="tablist">`
        days.forEach((day, index) => {
            navButton += `<button class="nav-link${index === 0 ? ' active' : ''}" id="${prog}-tab-${day.toLowerCase()}" data-bs-toggle="tab" data-bs-target="#${prog}-data-${day.toLowerCase()}" type="button" role="tab" aria-controls="${prog}-data-${day.toLowerCase()}" aria-selected="${index === 0 ? 'true' : 'false'}">${day}</button>`;
        });
        navButton += '</div></nav>';
        let data = `<div class="tab-content" id="${prog}-data">`
        Object.keys(ids[prog]).forEach((day, index) => {
            data += `<div class="tab-pane fade${index === 0 ? ' show active' : ''}" id="${prog}-data-${day.toLowerCase()}" role="tabpanel" aria-labelledby="${prog}-tab-${day.toLowerCase()}">`;
            data += '<table class="table table-sm"><thead><tr><td>Zeitraum</td><td>Start</td><td>Ende</td></tr></thead><tbody>';
            Object.keys(ids[prog][day]).forEach(time => {
                data += `<tr><td>${time}</td>`;
                ids[prog][day][time].forEach(id => {
                    data += `<td><select class="form-select" aria-label="${id}-set" id="${id}-set">`;
                    Object.keys(options).forEach(option => {
                        data += `<option value="${option}">${options[option]}</option>`;
                    })
                    data += '</select></td>';
                })
                data += '</tr>'
            })
            data += '</tbody></table></div>'
        })
        $(`#${prog}-programm`).append(`${navButton}${data}`);
        Object.keys(ids).forEach(prog => {
            Object.keys(ids[prog]).forEach(day => {
                Object.keys(ids[prog][day]).forEach(time => {
                    ids[prog][day][time].forEach(id => {
                        $(`#${id}-set`).change(() => {
                            window.electronAPI.send('action', { action: 'set', id, value: parseInt($(`#${id}-set`).val()) });
                        });
                    });
                });
            });
        });
    })
}

function createOffDates() {
    const programs = ['so', 'wi'];
    const days = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31' ];
    const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    const temps = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30' ];
    const ids = {
        so: {
            day: 11392,
            month: 11391,
            temp: 11178
        },
        wi: {
            day: 11396,
            month: 11395,
            temp: 11397
        }
    }
    programs.forEach(prog => {
        let daysData = `<select class="form-select" aria-label="${ids[prog].day}-set" id="${ids[prog].day}-set">`;
        days.forEach(day => {
            daysData += `<option value="${day}">${day}</option>`;
        });
        daysData += `</select>`;
        $(`#${prog}-day`).append(daysData);
        let monthData = `<select class="form-select" aria-label="${ids[prog].month}-set" id="${ids[prog].month}-set">`;
        months.forEach(month => {
            monthData += `<option value="${month}">${month}</option>`;
        });
        monthData += `</select>`;
        $(`#${prog}-month`).append(monthData);
        let tempData = `<select class="form-select" aria-label="${ids[prog].temp}-set" id="${ids[prog].temp}-set">`;
        temps.forEach(temp => {
            tempData += `<option value="${temp}">${temp}°C</option>`;
        });
        tempData += `</select>`;
        $(`#${prog}-temp`).append(tempData);
    });
    const idsForChangeEvent = [ '11392', '11391', '11178', '11396', '11395', '11397' ];
    idsForChangeEvent.forEach(id => {
        $(`#${id}-set`).change(() => {
            window.electronAPI.send('action', { action: 'set', id, value: parseInt($(`#${id}-set`).val()) });
        });
    });
}

function createHeatCurve() {
    let heizKurveData = '<select class="form-select" aria-label="11174-set" id="11174-set">';
    for (let i = 1; i <= 40; i++) {
        heizKurveData += `<option value="${i}">${(i * 0.1).toFixed(1)}</option>`;
    }
    heizKurveData += '</select>';
    $('#heizkurve').append(heizKurveData);
    const tempLoEnd = 10;
    const tempHiEnd = 70;
    let loTempData = '<select class="form-select" aria-label="11176-set" id="11176-set">';
    let hiTempData = '<select class="form-select" aria-label="11177-set" id="11177-set">';
    for (let j = tempLoEnd; j <= tempHiEnd; j++) {
        loTempData += `<option value="${j}">${j}°C</option>`;
        hiTempData += `<option value="${j}">${j}°C</option>`;
    }
    loTempData += '</select>';
    hiTempData += '</select>';
    $('#heizkurve-min').append(loTempData);
    $('#heizkurve-max').append(hiTempData);
    const idsForChangeEvent = [ '11174', '11176', '11177' ];
    idsForChangeEvent.forEach(id => {
        $(`#${id}-set`).change(() => {
            window.electronAPI.send('action', { action: 'set', id, value: parseInt($(`#${id}-set`).val()) });
        });
    });
}

function action(actionType, callID) {
    var data = {
            action: actionType,
            callID: callID || 0
        }
    if (actionType == 'call') {
        data.number = $('#number').val();
        if (data.number.length === 0) {
            return;
        }
        $('#number').val('');
    } else if (actionType == 'clear') {
        $('#number').val('');
    }
    window.electronAPI.send('action', data);
};
