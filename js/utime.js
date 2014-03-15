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
        var output = '',
            date;

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
        var output = false,
            isNumeric = (typeof input === 'string' && input.search(/[^0-9]/) === -1);

        if(!isNumeric) {
            output = this.convertDate(input);
        }

        if(output === false && isNumeric) {
            output = this.convertTimestamp(input);
        }

        return output;
    },

    applyTimezoneOffset: function(date, offset) {
        var localTime, 
            localOffset, 
            utcTime, 
            adjTime, 
            msOffset;

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

    loadOptions: function() {
        var storedOpts = localStorage.getItem('utime.options');
        this._options = storedOpts ? JSON.parse(storedOpts) : $.extend({}, this.defaultOptions);
        this.updateDateOptions();
    },

    updateOption: function(key, value) {
        this._options[key] = value;
        localStorage.setItem('utime.options', JSON.stringify(this._options));
        this.updateDateOptions();
    },

    updateOptions: function(opts) {
        this._options = opts;
        localStorage.setItem('utime.options', JSON.stringify(this._options));
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