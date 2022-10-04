// https connection issues with chrome: https://stackoverflow.com/a/28586593
const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, globalShortcut } = require('electron')
const { spawn } = require('node:child_process');
const { resolve, join } = require('node:path');
const modbus = require('modbus-stream')
const net = require('net');
const Store = require('electron-store');
const { Helper } = require('./helper.js');

app.setName('Danfoss ECL Comfort 310');
app.setAppUserModelId('Danfoss ECL Comfort 310');
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
        Titel: 'Danfoss ECL Comfort 310',
        width: 510,
        height: 550,
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
        globals.tray.setToolTip('Danfoss ECL Comfort 310')
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

const items = Object.freeze([
    { number: 18, length: 0, label: "Typ: 087H", method: readValue },
    { number: 34, length: 1, label: "SW: ", method: readSoftware },
    { number: 35, length: 2, label: "S/N: ", method: readSerial },
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
        globals.interval = setInterval(readAllValues, 10000);
        readAllValues();
    }
    else if (data.action == 'reload') {
        clearInterval(globals.interval);
        globals.interval = setInterval(readAllValues, 10000);
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
 * Connect to Danfoss ECL
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
        console.log(`reading value for id[${item.number}]`)
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
