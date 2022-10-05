// https connection issues with chrome: https://stackoverflow.com/a/28586593
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, globalShortcut } = require('electron')
const { spawn } = require('node:child_process');
const { resolve, join } = require('node:path');
const modbus = require('modbus-stream')
const net = require('net');
const Store = require('electron-store');
const { Helper } = require('./helper.js');

app.setName('ECL Comfort 310 Steuerung');
app.setAppUserModelId('ECL Comfort 310 Steuerung');
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        const res = app.setAsDefaultProtocolClient('uocti', process.execPath, [resolve(process.argv[1])]);
        Helper.logHandler(`setAsDefaultProtocolClient ${res === true ? 'successful' : 'failed'}`);
    }
} else {
    const res = app.setAsDefaultProtocolClient('uocti');
    Helper.logHandler(`setAsDefaultProtocolClient ${res === true ? 'successful' : 'failed'}`);
}

const store = new Store({name: 'ecl310', encryptionKey: 'ecl310'});

const supportedLanguages = Object.freeze({
    en: 'en-US',
    de: 'de-DE'
});

const globals = {
    win: false,
    tray: false,
    interval: null,
    con: null,
    msgId: 0,
    settings: store.get('settings') || {}
}

/**
 * Initialize all default values if they have not been read from the database.
 *
 */
function initSettingsDefaults() {
    Helper.isUndefined(globals.settings.ip) === true && (globals.settings.ip = false);
    storeDataItem('settings', globals.settings);
}

function createWindow () {
    globals.win = new BrowserWindow({
        Titel: 'ECL Comfort 310 Steuerung',
        width: 510,
        height: 700,
        icon: nativeImage.createFromPath(join(__dirname, 'images/icon.png')),
        resizable: false,
        minimizable: false,
        maximizable: false,
        center: true,
        autoHideMenuBar: true,
        show: true,
        webPreferences: {
            preload: join(__dirname, 'preload.js')
        },
        titleBarOverlay: {
            color: '#0066a1',
            symbolColor: '#0066a1'
        }
    })

    globals.win.on('close', (event) => {
        if(!app.isQuitting){
            event.preventDefault();
            globals.win.hide();
        }
        return false;
    });

    globals.win.loadFile('loading.html');
    try {
        globals.tray = new Tray(nativeImage.createFromPath(join(__dirname, 'images/icon.png')))
        const contextMenu = Menu.buildFromTemplate([
            { label: 'Show Application', click: () => { globals.win.show(); } },
            { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
        ])
        globals.tray.setToolTip('ECL Comfort 310 Steuerung')
        globals.tray.setContextMenu(contextMenu)
        globals.tray.on('click', () => {
            globals.win.show();
        })
        //globals.win.webContents.openDevTools();
    }
    catch(err) {
        Helper.errorHandler(err && err.message);
    }

    ipcMain.on('action', handleWindowMessage);
    ipcMain.on('settings', handleSettingsMessage);
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.isQuitting = true;
    app.quit();
} else {
    Helper.logHandler(`starting from PID: ${process.pid}`);
    //Menu.setApplicationMenu(null);
    app.whenReady().then(() => {
        initSettingsDefaults();
        createWindow();
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        })
        if (globals.settings.ip === false) {
            globals.win.loadFile('login.html');
        } else {
            connectToECL();
        }
    });

    app.on('window-all-closed', () => {
        Helper.logHandler(`window-all-closed event`);
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })
}

const keepConnectionItems = Object.freeze([
    { number: 10200, length: 0, label: "Aussentemperatur: ", method: readTemp4 },
    { number: 10202, length: 0, label: "Vorlauftemperatur: ", method: readTemp4 },
    { number: 10204, length: 0, label: "Rücklauftemperatur: ", method: readTemp4 },
]);

const items = Object.freeze([
    { number: 18, length: 0, label: "Typ: 087H", method: readValue },
    { number: 34, length: 1, label: "SW: ", method: readSoftware },
    { number: 35, length: 2, label: "S/N: ", method: readSerial },
    { number: 3109, length: 0, label: "", method: readProgram },
    { number: 3110, length: 0, label: "", method: readProgram },
    { number: 3111, length: 0, label: "", method: readProgram },
    { number: 3112, length: 0, label: "", method: readProgram },
    { number: 3113, length: 0, label: "", method: readProgram },
    { number: 3114, length: 0, label: "", method: readProgram },
    { number: 3119, length: 0, label: "", method: readProgram },
    { number: 3120, length: 0, label: "", method: readProgram },
    { number: 3121, length: 0, label: "", method: readProgram },
    { number: 3122, length: 0, label: "", method: readProgram },
    { number: 3123, length: 0, label: "", method: readProgram },
    { number: 3124, length: 0, label: "", method: readProgram },
    { number: 3129, length: 0, label: "", method: readProgram },
    { number: 3130, length: 0, label: "", method: readProgram },
    { number: 3131, length: 0, label: "", method: readProgram },
    { number: 3132, length: 0, label: "", method: readProgram },
    { number: 3133, length: 0, label: "", method: readProgram },
    { number: 3134, length: 0, label: "", method: readProgram },
    { number: 3139, length: 0, label: "", method: readProgram },
    { number: 3140, length: 0, label: "", method: readProgram },
    { number: 3141, length: 0, label: "", method: readProgram },
    { number: 3142, length: 0, label: "", method: readProgram },
    { number: 3143, length: 0, label: "", method: readProgram },
    { number: 3144, length: 0, label: "", method: readProgram },
    { number: 3149, length: 0, label: "", method: readProgram },
    { number: 3150, length: 0, label: "", method: readProgram },
    { number: 3151, length: 0, label: "", method: readProgram },
    { number: 3152, length: 0, label: "", method: readProgram },
    { number: 3153, length: 0, label: "", method: readProgram },
    { number: 3154, length: 0, label: "", method: readProgram },
    { number: 3159, length: 0, label: "", method: readProgram },
    { number: 3160, length: 0, label: "", method: readProgram },
    { number: 3161, length: 0, label: "", method: readProgram },
    { number: 3162, length: 0, label: "", method: readProgram },
    { number: 3163, length: 0, label: "", method: readProgram },
    { number: 3164, length: 0, label: "", method: readProgram },
    { number: 3169, length: 0, label: "", method: readProgram },
    { number: 3170, length: 0, label: "", method: readProgram },
    { number: 3171, length: 0, label: "", method: readProgram },
    { number: 3172, length: 0, label: "", method: readProgram },
    { number: 3173, length: 0, label: "", method: readProgram },
    { number: 3174, length: 0, label: "", method: readProgram },
    { number: 3209, length: 0, label: "", method: readProgram },
    { number: 3210, length: 0, label: "", method: readProgram },
    { number: 3211, length: 0, label: "", method: readProgram },
    { number: 3212, length: 0, label: "", method: readProgram },
    { number: 3213, length: 0, label: "", method: readProgram },
    { number: 3214, length: 0, label: "", method: readProgram },
    { number: 3219, length: 0, label: "", method: readProgram },
    { number: 3220, length: 0, label: "", method: readProgram },
    { number: 3221, length: 0, label: "", method: readProgram },
    { number: 3222, length: 0, label: "", method: readProgram },
    { number: 3223, length: 0, label: "", method: readProgram },
    { number: 3224, length: 0, label: "", method: readProgram },
    { number: 3229, length: 0, label: "", method: readProgram },
    { number: 3230, length: 0, label: "", method: readProgram },
    { number: 3231, length: 0, label: "", method: readProgram },
    { number: 3232, length: 0, label: "", method: readProgram },
    { number: 3233, length: 0, label: "", method: readProgram },
    { number: 3234, length: 0, label: "", method: readProgram },
    { number: 3239, length: 0, label: "", method: readProgram },
    { number: 3240, length: 0, label: "", method: readProgram },
    { number: 3241, length: 0, label: "", method: readProgram },
    { number: 3242, length: 0, label: "", method: readProgram },
    { number: 3243, length: 0, label: "", method: readProgram },
    { number: 3244, length: 0, label: "", method: readProgram },
    { number: 3249, length: 0, label: "", method: readProgram },
    { number: 3250, length: 0, label: "", method: readProgram },
    { number: 3251, length: 0, label: "", method: readProgram },
    { number: 3252, length: 0, label: "", method: readProgram },
    { number: 3253, length: 0, label: "", method: readProgram },
    { number: 3254, length: 0, label: "", method: readProgram },
    { number: 3259, length: 0, label: "", method: readProgram },
    { number: 3260, length: 0, label: "", method: readProgram },
    { number: 3261, length: 0, label: "", method: readProgram },
    { number: 3262, length: 0, label: "", method: readProgram },
    { number: 3263, length: 0, label: "", method: readProgram },
    { number: 3264, length: 0, label: "", method: readProgram },
    { number: 3269, length: 0, label: "", method: readProgram },
    { number: 3270, length: 0, label: "", method: readProgram },
    { number: 3271, length: 0, label: "", method: readProgram },
    { number: 3272, length: 0, label: "", method: readProgram },
    { number: 3273, length: 0, label: "", method: readProgram },
    { number: 3274, length: 0, label: "", method: readProgram },
    { number: 3309, length: 0, label: "", method: readProgram },
    { number: 3310, length: 0, label: "", method: readProgram },
    { number: 3311, length: 0, label: "", method: readProgram },
    { number: 3312, length: 0, label: "", method: readProgram },
    { number: 3313, length: 0, label: "", method: readProgram },
    { number: 3314, length: 0, label: "", method: readProgram },
    { number: 3319, length: 0, label: "", method: readProgram },
    { number: 3320, length: 0, label: "", method: readProgram },
    { number: 3321, length: 0, label: "", method: readProgram },
    { number: 3322, length: 0, label: "", method: readProgram },
    { number: 3323, length: 0, label: "", method: readProgram },
    { number: 3324, length: 0, label: "", method: readProgram },
    { number: 3329, length: 0, label: "", method: readProgram },
    { number: 3330, length: 0, label: "", method: readProgram },
    { number: 3331, length: 0, label: "", method: readProgram },
    { number: 3332, length: 0, label: "", method: readProgram },
    { number: 3333, length: 0, label: "", method: readProgram },
    { number: 3334, length: 0, label: "", method: readProgram },
    { number: 3339, length: 0, label: "", method: readProgram },
    { number: 3340, length: 0, label: "", method: readProgram },
    { number: 3341, length: 0, label: "", method: readProgram },
    { number: 3342, length: 0, label: "", method: readProgram },
    { number: 3343, length: 0, label: "", method: readProgram },
    { number: 3344, length: 0, label: "", method: readProgram },
    { number: 3349, length: 0, label: "", method: readProgram },
    { number: 3350, length: 0, label: "", method: readProgram },
    { number: 3351, length: 0, label: "", method: readProgram },
    { number: 3352, length: 0, label: "", method: readProgram },
    { number: 3353, length: 0, label: "", method: readProgram },
    { number: 3354, length: 0, label: "", method: readProgram },
    { number: 3359, length: 0, label: "", method: readProgram },
    { number: 3360, length: 0, label: "", method: readProgram },
    { number: 3361, length: 0, label: "", method: readProgram },
    { number: 3362, length: 0, label: "", method: readProgram },
    { number: 3363, length: 0, label: "", method: readProgram },
    { number: 3364, length: 0, label: "", method: readProgram },
    { number: 3369, length: 0, label: "", method: readProgram },
    { number: 3370, length: 0, label: "", method: readProgram },
    { number: 3371, length: 0, label: "", method: readProgram },
    { number: 3372, length: 0, label: "", method: readProgram },
    { number: 3373, length: 0, label: "", method: readProgram },
    { number: 3374, length: 0, label: "", method: readProgram },
    { number: 4200, length: 0, label: "Betriebsart: ", method: readBetriebsart },
    { number: 4201, length: 0, label: "Betriebsart: ", method: readBetriebsart },
    { number: 4210, length: 0, label: "Aktueller Modus: ", method: readModus },
    { number: 4211, length: 0, label: "Aktueller Modus: ", method: readModus },
    { number: 10200, length: 0, label: "Aussentemperatur: ", method: readTemp4 },
    { number: 10202, length: 0, label: "Vorlauftemperatur: ", method: readTemp4 },
    { number: 10204, length: 0, label: "Rücklauftemperatur: ", method: readTemp4 },
    { number: 11174, length: 0, label: "Heizkurve: ", method: readKurve },
    { number: 11179, length: 0, label: "Komforttemperatur Soll: ", method: readTemp3 },
    { number: 11180, length: 0, label: "Absenktemperatur Soll: ", method: readTemp3 },
    { number: 12189, length: 0, label: "Komforttemperatur Soll: ", method: readTemp3 },
    { number: 12190, length: 0, label: "Absenktemperatur Soll: ", method: readTemp3 },
])

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

async function handleWindowMessage(event, data) {
    Helper.logHandler(`window message [${JSON.stringify(data)}]`);
    if (data.action == 'state') {
        clearInterval(globals.interval);
        globals.interval = setInterval(readValuesToKeepConnection, 10000);
        readAllValues();
    }
    else if (data.action == 'reload') {
        clearInterval(globals.interval);
        globals.interval = setInterval(readValuesToKeepConnection, 10000);
        readAllValues();
    }
    else if (data.action == 'logout') {
        clearInterval(globals.interval);
        globals.settings['ip'] = false;
        storeDataItem('settings', globals.settings);
        globals.win.loadFile('login.html');
    }
    else if (data.action == 'exit') {
        app.isQuitting = true;
        app.quit();
    }
    else if (data.action == 'set') {
        const hex = parseInt(data.value, 10).toString(16).padStart(4, '0');
        const buf = Buffer.from(hex, 'hex');
        write(data.id, buf);
        readAllValues();
    }
}

async function handleSettingsMessage(event, data) {
    Helper.logHandler(`settings message item[${data.item}] value[${data.value}]`);
    globals.settings[data.item] = data.value;
    storeDataItem('settings', globals.settings);
    data.item === 'ip' && connectToECL();
}

/**
 * Connect to ECL
 */
function connectToECL() {
    globals.win.loadFile('loading.html');
    globals.con = null;
    modbus.tcp.connect(502, globals.settings.ip, { debug: null }, async (error, connection) => {
        if (error) {
            Helper.errorHandler(error);
            globals.win.loadFile('login.html');
            return;
        }
        globals.con = connection;
        globals.con.on('error', Helper.errorHandler);
        globals.win.loadFile('app.html');
    });
}

async function readAllValues() {
    for (const item of items) {
        const value = await item.method(item.number, item.length)
        const obj = {
            action: 'state',
            number: item.number,
            value: `${item.label}${value}`
        }
        globals.win.webContents.send('data', obj);
    }
}

async function readValuesToKeepConnection() {
    for (const item of keepConnectionItems) {
        const value = await item.method(item.number, item.length)
        const obj = {
            action: 'state',
            number: item.number,
            value: `${item.label}${value}`
        }
        globals.win.webContents.send('data', obj);
    }
}

/**
 * Read a specific registers Value.
 * @param {number} id - The ID of the register to read.
 * @returns Promise
 */
async function readValue(id) {
    return new Promise((resolve, reject) => {
        globals.con.readHoldingRegisters({ address: id, quantity: 1 }, (err, res) => {
            if (err)
            {
                reject(err.message);
            }
            else
            {
                resolve(res.response.data[0].readUIntBE(0, 2));
            }
        })
    });
}

/**
 * Read a specific registers Raw data.
 * @param {number} id - The ID of the register to read.
 * @param {number} length - The length of the value.
 * @returns Promise
 */
async function readRaw(id, length) {
    return new Promise((resolve, reject) => {
        globals.con.readHoldingRegisters({ address: id, quantity: length }, (err, res) => {
            if (err)
            {
                reject(err.message);
            }
            else
            {
                resolve(res.response.data);
            }
        })
    });
}

async function write(id, data) {
    return new Promise((resolve, reject) => {
        globals.con.writeSingleRegister({ address: id, value: data }, (err, res) => {
            if (err)
            {
                reject(err.message);
            }
            else
            {
                resolve(res.response);
            }
        })
    });
}

async function readSoftware() {
    const sw = await readRaw(34, 1);
    return `${sw[0][0].toString()}.${sw[0][1].toString()}`;
}

async function readSerial() {
    const serialData = await readRaw(35, 2);
    return parseInt(Buffer.concat(serialData).readUIntBE(0, 4));
}

async function readKurve(id) {
    const val = await readValue(id);
    globals.win.webContents.send('settings', { key: id, value: val });
    return `${(val / 10).toFixed(1)}`;
}

async function readTemp3(id) {
    const temp = await readValue(id);
    return `${(temp / 10).toFixed(1)}°C`;
}

async function readTemp4(id) {
    const temp = await readValue(id);
    return `${(temp / 100).toFixed(1)}°C`;
}

async function readProgram(id) {
    const time = await readValue(id);
    globals.win.webContents.send('settings', { key: id, value: time });
    return time;
}

async function readBetriebsart(id) {
    const ba = await readValue(id);
    globals.win.webContents.send('settings', { key: id, value: ba });
    switch(ba) {
        case 0:
            return 'Manuell'
        case 1:
            return 'Automatik'
        case 2:
            return 'Komfort'
        case 3:
            return 'Energiesparen'
        case 4:
            return 'Frostschutz'
        default:
            return 'Unbekannt'
    }
}

async function readModus() {
    const mo = await readValue(4210);
    switch(mo) {
        case 0:
            return 'Abgesenkt'
        case 2:
            return 'Komfort'
        default:
            return 'Unbekannt'
    }
}

/**
 * Store user settings permantly in db.
 *
 * @param {string} item - The item name.
 * @param {string} data - The value to store.
 */
function storeDataItem(item, data) {
    globals[item] = data;
    store.set(item, data);
}

/**
 * Some tasks to handle when we exit.
 */
async function handleShutdown(signal) {
    Helper.logHandler(`Received ${signal}`);
    process.exit();
}
