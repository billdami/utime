/**
 * utime
 * 
 */
var Utime = function() {
    this.loadOptions();
};

Utime.prototype = {
    
    defaultOptions: {
        inputMode: 'auto',
        timestampUnit: 's',
        timezoneOffset: 'local',
        dateInputOrder: 'mdy',
        dateOutputFormat: 'MMMM dS, yyyy',
        timeOutputFormat: 'h:mm tt'
    },

    convertDate: function(input) {
        var output = '',
            date;

        if(!input || input === '') {
            return output;
        }

        date = Date.parse(input);

        if(date === null) {
            return false;
        }

        if(this.getOption('timezoneOffset') !== 'local') {
            date = date.setTimezoneOffset((this.getOption('timezoneOffset') * 100));
        }

        output = date.getTime();

        if(this.getOption('timestampUnit') === 's') {
            output = parseInt(output / 1000, 10);
        }

        return output;
    },

    convertTimestamp: function(input) {
        var output = '';
        var date;

        if(!input || input === '') {
            return output;
        }

        input = parseInt(input, 10);

        if(isNaN(input)) {
            return false;
        }

        if(this.getOption('timestampUnit') === 's') {
            input = input * 1000;
        }

        date = new Date(input);
        
        if(!isNaN(date.getTime())) {
            if(this.getOption('timezoneOffset') !== 'local') {
                date = this.applyTimezoneOffset(date, this.getOption('timezoneOffset'));
            }

            output = date.toString(this.getOption('dateOutputFormat'));
            
            if(this.getOption('timeOutputFormat') != 'none' && 
                this.getOption('dateOutputFormat') != 'yyyy-MM-ddTHH:mm:ss') {
                output += ' ' + date.toString(this.getOption('timeOutputFormat'));
            }
        }
        
        return output;
    },

    convertInput: function(input) {
        var output = false;
        var tsRegex = /^-?[0-9]+$/;
        var isTimestamp = (typeof input === 'string' && tsRegex.test(input));

        if(!isTimestamp) {
            output = this.convertDate(input);
        }

        if(output === false && isTimestamp) {
            output = this.convertTimestamp(input);
        }

        return output;
    },

    applyTimezoneOffset: function(date, offset) {
        var localTime;
        var localOffset;
        var utcTime; 
        var adjTime;
        var msOffset;

        if(typeof date.getTime !== 'function' || typeof date.getTimezoneOffset !== 'function') {
            return date;
        }

        localTime = date.getTime();
        
        if(typeof localTime !== 'number') {
            return date;
        }
        
        localOffset = date.getTimezoneOffset() * 60000;
        utcTime = localTime + localOffset;
        msOffset = offset * 3600000;
        adjTime = utcTime + msOffset;
        date = new Date(adjTime);

        return date;
    },

    getCurrentTimestamp: function() {
        return this.convertDate('now');
    },

    getCurrentDate: function() {
        var ts = this.getCurrentTimestamp();
        return this.convertTimestamp(ts);
    },

    getOption: function(key) {
        var opts = this.getOptions();

        if(!opts || !opts[key]) {
            return null;
        } else {
            return opts[key];
        }
    },

    getOptions: function() {
        if(!this._options) {
            this.loadOptions();
        }

        return this._options;
    },

    loadOptions: async function() {
        const { options } = await chrome.storage.local.get(['options']);
        this._options = options ? JSON.parse(options) : { ...this.defaultOptions };
        this.updateDateOptions();
    },

    updateOption: async function(key, value) {
        this._options[key] = value;
        await chrome.storage.local.set({ options: JSON.stringify(this._options) });
        this.updateDateOptions();
    },

    updateOptions: async function(opts) {
        this._options = opts;
        await chrome.storage.local.set({options: JSON.stringify(this._options) });
        this.updateDateOptions();
    },

    updateDateOptions: function() {
        //apply applicable settings to Date.js
        Date.CultureInfo.dateElementOrder = this._options.dateInputOrder;
    },

    dashesToCamel: function(str) {
        return str.replace(/-([a-z])/g, function(g) {
            return g[1].toUpperCase(); 
        });
    },

    camelToDashes: function(str) {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }
};