$( document ).ready(function() {
    $('[data-toggle="tooltip"]').tooltip();
    action('state');
    $('#settings-container').hide();
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
$('#settings').click(function() {
    $('#home-container').hide();
    $('#settings-container').show();
    action('settings');
});
$('#back').click(function() {
    $('#settings-container').hide();
    $('#home-container').show();
});
$('#4200-set').change(() => {
    window.electronAPI.send('action', { action: 'set', id: 4200, value: parseInt($('#4200-set').val()) });
});
$('#4201-set').change(() => {
    window.electronAPI.send('action', { action: 'set', id: 4201, value: parseInt($('#4201-set').val()) });
});
$('#11174-set').change(() => {
    window.electronAPI.send('action', { action: 'set', id: 11174, value: parseInt($('#11174-set').val()) });
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
