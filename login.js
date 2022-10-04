$( document ).ready(function() {
    $('[data-toggle="tooltip"]').tooltip();
    window.electronAPI.send('action', { action: 'getip' });
});

let lastDialledNumbers = [];

window.electronAPI.receive('data', (data) => {
    if (data.action == 'ipaddress') {
        $('#ipaddress').val(data.data);
    }
});

$('#saveip').click(function() {
    window.electronAPI.send('settings', { item: 'ip', value: $('#ipaddress').val()});
});
