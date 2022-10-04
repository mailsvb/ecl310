const log = require('electron-log');

const VarType = Object.freeze({
    'number': 'number',
    'boolean': 'boolean',
    'string': 'string',
    'undefined': 'undefined',
    'null': 'null',
    'function': 'function',
    'array': 'array',
    'object': 'object',
    'date': 'date',
    'regexp': 'regexp'
});

const TYPES = Object.freeze({
    '[object Number]': VarType.number,
    '[object Boolean]': VarType.boolean,
    '[object String]': VarType.string,
    '[object Undefined]': VarType.undefined,
    '[object Null]': VarType.null,
    '[object Function]': VarType.function,
    '[object Array]': VarType.array,
    '[object Object]': VarType.object,
    '[object Date]': VarType.date,
    '[object RegExp]': VarType.regexp
});

class Helper {

    /**
     * Log an error to the desired logging target.
     *
     * @param {string} msg - The error to log.
     */
    static errorHandler(msg) {
        log.error(msg);
    }

    /**
     * Log a message to the desired logging target.
     *
     * @param {string} msg - The message to log.
     */
    static logHandler(msg) {
        log.debug(msg);
    }

    /**
     * Get a meaningful name based on the Unify Office device SKU type.
     *
     * @param {string} sku - The sku type from API response.
     * @returns {string} - A meaningful device name.
     */
    static getDeviceNameForSKU(sku) {
        switch(sku) {
            case 'DV-0':
                return 'Deskphone';
            case 'DV-1':
                return 'Softphone';
            default:
                return 'Phone';
        }
    }

    /**
     * Provide the current date or format a timestamp provided.
     *
     * @param {Date} date - A date object.
     *
     * @returns {string} - The formatted timestamp
     */
    static getDate(date) {
        let now = date || (new Date());
        let MM = (now.getMonth() + 1);
            if (MM < 10) { MM = '0' + MM; }
        let DD = now.getDate();
            if (DD < 10) { DD = '0' + DD; }
        let H = now.getHours();
            if (H < 10) { H = '0' + H; }
        let M = now.getMinutes();
            if (M < 10) { M = '0' + M; }
        let S = now.getSeconds();
            if (S < 10) { S = '0' + S; }
        return now.getFullYear() + "." + MM + "." + DD + " - " + H + ":" + M + ":" + S;
    };

    /**
     * Get the type of the variable.
     *
     * @param {any} v - The variable fro which to get the type.
     * @returns {VarType} - The type of the variable.
     */
    static varType(v) {
        return TYPES[Object.prototype.toString.call(v)];
    }

    /**
     * Check if the given variable is a string.
     *
     * @param {any} v - The variable to Check if it is a string.
     * @returns {boolean} - True if the type of the variable is a string.
     */
    static isString(v) {
        return this.varType(v) === VarType.string;
    }

    /**
     * Check if the given variable is a number.
     *
     * @param {any} v - The variable to Check if it is a number.
     * @returns {boolean} - True if the type of the variable is a number.
     */
    static isNumber(v) {
        return this.varType(v) === VarType.number;
    }

    /**
     * Check if the given variable is undefined.
     *
     * @param {any} v - The variable to Check if it is undefined.
     * @returns {boolean} - True if the type of the variable is undefined.
     */
    static isUndefined(v) {
        return this.varType(v) === VarType.undefined;
    }

    /**
     * Check if the given variable is null.
     *
     * @param {any} v - The variable to Check if it is null.
     * @returns {boolean} - True if the type of the variable is null.
     */
    static isNull(v) {
        return this.varType(v) === VarType.null;
    }

    /**
     * Check if the given variable is an array.
     *
     * @param {any} v - The variable to Check if it is an array.
     * @returns {boolean} - True if the type of the variable is an array.
     */
    static isArray(v) {
        return this.varType(v) === VarType.array;
    }

    /**
     * Check if the given variable is an object.
     *
     * @param {any} v - The variable to Check if it is an object.
     * @returns {boolean} - True if the type of the variable is an object.
     */
    static isObject(v) {
        return this.varType(v) === VarType.object;
    }

    /**
     * Check if the given variable is a boolean.
     *
     * @param {any} v - The variable to Check if it is a boolean.
     * @returns {boolean} - True if the type of the variable is a boolean.
     */
    static isBoolean(v) {
        return this.varType(v) === VarType.boolean;
    }
}

module.exports = {
    Helper
};
