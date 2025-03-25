/**
 * popup
 * 
 */
var extPopup = (function() {

    var Popup = function() {};

    Popup.prototype = {

        init: async function() {
            this.utime = new Utime();
            await this.utime.loadOptions();

            const inputGroups = await this.loadInputGroups();
            
            this.currentLocation = 'app';
            this.storeEls();
            this.addListeners();
            this.resize();
            this.populateOptionsForm();
            inputGroups.forEach((grp) => this.addInputGroup(grp.topValue, grp.bottomValue, grp.lastTarget));

            return this;
        },

        loadInputGroups: async function() {
            const { inputGroups } = await chrome.storage.local.get(['inputGroups']);
            const defaultGroups = [{id: 0, topValue: null, bottomValue: null, lastTarget: 'top'}];

            this.inputGroups = inputGroups ? JSON.parse(inputGroups) : defaultGroups;
            return this.inputGroups;
        },

        updateInputGroups: async function(newGroups) {
            this.inputGroups = newGroups;
            await chrome.storage.local.set({ inputGroups: JSON.stringify(newGroups) });
        },

        addInputGroupElement: async function(inputGroup) {
            this.inputGroups = [...this.inputGroups, inputGroup];
            await this.updateInputGroups(this.inputGroups);
        },

        removeInputGroupElement: async function(index) {
            this.inputGroups = this.inputGroups.toSpliced(index, 1);
            await this.updateInputGroups(this.inputGroups);
        },

        storeEls: function() {
            this.$doc = $(document);
            this.$page = $('html, body');
            this.$containers = $('div.container');
            this.$appCt = $('#app-ct');
            this.$optionsCt = $('#options-ct');
            this.$helpCt = $('#help-ct');
            this.$inputGroups = $('.input-groups:first', this.$appCt);
            this.$optionsForm = $('.options-form:first', this.$optionsCt);
        },

        addListeners: function() {
            this.$doc.on('click', '.open-location', (e) => {
                this.open($(e.currentTarget).data('target'));
                e.preventDefault();
            });

            this.$appCt.on('click', '.add-input-group-btn', (e) => {
                this.addInputGroup();
            });

            this.$appCt.on('click', '.input-group-close-btn', (e) => {
                var id = this.getGroupId(e.currentTarget);
                this.removeInputGroup(id);
            });

            this.$doc.on('keydown', (e) => {
                //global keyboard shortcuts handling
                switch(e.which) {
                    //A
                    case 65:
                        if(this.currentLocation === 'app' && e.altKey) {
                            this.addInputGroup();
                            e.preventDefault();
                        }
                        break;
                }
            });

            this.$appCt.on('keydown', 'input.input-group-control', (e) => {
                //focused input keyboard shortcut handling
                switch(e.which) {
                    //up arrow
                    case 38:
                        if(e.shiftKey) {
                            this.focusPreviousInput(e.currentTarget);
                        }
                        break;
                    //down arrow
                    case 40:
                        if(e.shiftKey) {
                            this.focusNextInput(e.currentTarget);
                        }
                        break;
                    //C
                    case 67:
                        if(e.altKey) {
                            $(e.currentTarget).val('');
                            e.preventDefault();
                        }
                        break;
                    //D
                    case 68:
                        if(e.altKey) {
                            this.removeInputGroup(this.getGroupId(e.currentTarget));
                            e.preventDefault();
                        }
                        break;
                }
            });

            this.$appCt.on('keyup', 'input.input-group-control', (e) => {
                var el = $(e.currentTarget),
                    newValue;

                //insert the current timestamp/date when enter is pressed on an empty input
                if(e.which === 13 && $.trim(el.val()).length < 1) {
                    newValue = (el.hasClass('input-0') && this.utime.getOption('inputMode') != 'date-timestamp') ? 
                        this.utime.getCurrentTimestamp() : 
                        this.utime.getCurrentDate();

                    el.val(newValue);
                }

                this.updateGroup(e.currentTarget, (e.which === 13));
            });

            this.$appCt.on('focus', 'input.input-group-control', (e) => {
                var el = $(e.currentTarget);

                if(el.hasClass('error')) {
                    el.val('');
                    el.removeClass('error');
                }

                //make sure the entire contents of the input are selected on focus
                el.select();
            });

            this.$optionsForm.on('change', 'select.form-control', (e) => {
                this.saveOption(e.currentTarget);
            });
        },

        addInputGroup: function(topValue, bottomValue, lastTarget) {
            var id = this.getNextInputGroupId(),
                el,
                topInput,
                bottomInput;

            this.addInputGroupElement({
                id: id,
                topValue: topValue,
                bottomValue: bottomValue,
                lastTarget: lastTarget || 'top'
            });

            if(id === 0) {
                el = $('#input-group-0');
                topInput = $('input.input-0:first', el);
                bottomInput = $('input.input-1:first', el);
                
                topInput.val(this.getDisplayedValue(topValue, 'top'));
                topInput.toggleClass('error', (topValue === false));
                topInput.prop('placeholder', this.getPlaceholder('top'));

                bottomInput.val(this.getDisplayedValue(bottomValue, 'bottom'));
                bottomInput.toggleClass('error', (bottomValue === false));
                bottomInput.prop('placeholder', this.getPlaceholder('bottom'));
            } else {
                el = this.createInputGroupEl(id, topValue, bottomValue);
                this.$inputGroups.append(el);
                this.resize();
            }

            $('input.input-0:first', el).focus();
        },

        removeInputGroup: function(id) {
            var index = this.indexOfGroup(id),
                el,
                prevGroup;

            //the first input group can't be removed
            if(id === 0) {
                return;
            }

            if(index > -1) {
                this.removeInputGroupElement(index);
            }

            el = $('#input-group-' + id, this.$inputGroups);
            prevGroup = el.prev('.input-group');
            el.remove();
            this.resize();

            if(prevGroup.length > 0) {
                $('input.input-0:first', prevGroup).focus();
            }
        },

        updateGroup: function(inputEl, forceUpdate) {
            var id = this.getGroupId(inputEl),
                targetInput = $(inputEl),
                target = targetInput.hasClass('input-0') ? 'top' : 'bottom',
                groupEl = targetInput.closest('div.input-group'),
                groupIndex = this.indexOfGroup(id),
                topInput = $('input.input-0:first', groupEl),
                bottomInput = $('input.input-1:first', groupEl),
                topValue,
                bottomValue;

            if(groupIndex < 0) {
                return;
            }

            if(target === 'top') {
                topValue = $.trim(topInput.val());
                if(forceUpdate === true || topValue != this.inputGroups[groupIndex].topValue) {
                    bottomValue = this.convertValue(topValue, 'top');
                    bottomInput.val(this.getDisplayedValue(bottomValue, 'bottom'));
                    bottomInput.toggleClass('error', (bottomValue === false));
                    this.inputGroups[groupIndex].topValue = topValue;
                    this.inputGroups[groupIndex].bottomValue = bottomValue;
                    this.inputGroups[groupIndex].lastTarget = 'top';
                }
            } else {
                bottomValue = $.trim(bottomInput.val());
                if(forceUpdate === true || bottomValue != this.inputGroups[groupIndex].bottomValue) {
                    topValue = this.convertValue(bottomValue, 'bottom');
                    topInput.val(this.getDisplayedValue(topValue, 'top'));
                    topInput.toggleClass('error', (topValue === false));
                    this.inputGroups[groupIndex].topValue = topValue;
                    this.inputGroups[groupIndex].bottomValue = bottomValue;
                    this.inputGroups[groupIndex].lastTarget = 'bottom';
                }
            }
        },

        convertValue: function(value, source) {
            var mode = this.utime.getOption('inputMode'),
                result;

            switch(mode) {
                case 'auto':
                    result = this.utime.convertInput(value);
                    break;
                case 'timestamp-date':
                    result = this.utime[(source === 'top') ? 'convertTimestamp' : 'convertDate'](value);
                    break;
                case 'date-timestamp':
                    result = this.utime[(source === 'top') ? 'convertDate' : 'convertTimestamp'](value);
                    break;
            }

            return result;
        },

        focusPreviousInput: function(focusedInput) {
            var el = $(focusedInput),
                parent = el.parent(),
                prevSib = parent.prev('.input-group-field'),
                group = parent.parent(),
                prevGroup = group.prev('.input-group');

            if(prevSib.length > 0) {
                $('input.input-group-control:first', prevSib).focus();
            } else if(prevGroup.length > 0) {
                $('input.input-1:first', prevGroup).focus();
            } else {
                $('input.input-1:last', this.$inputGroups).focus();
            }
        },

        focusNextInput: function(focusedInput) {
            var el = $(focusedInput),
                parent = el.parent(),
                nextSib = parent.next('.input-group-field'),
                group = parent.parent(),
                nextGroup = group.next('.input-group');

            if(nextSib.length > 0) {
                $('input.input-group-control:first', nextSib).focus();
            } else if(nextGroup.length > 0) {
                $('input.input-0:first', nextGroup).focus();
            } else {
                $('input.input-0:first', this.$inputGroups).focus();
            }
        },

        populateOptionsForm: function() {
            var opts = this.utime.getOptions();

            $.each(opts, (key, value) => {
                $('#option-' + this.utime.camelToDashes(key), this.$optionsForm).val(value);
            });
        },

        saveOption: function(ctrlEl) {
            var el = $(ctrlEl),
                value = el.val(),
                key = this.utime.dashesToCamel(el.prop('id').replace('option-', '')),
                groupEl,
                topInput,
                bottomInput,
                newValue;

            this.utime.updateOption(key, value);

            //update all existing input groups so their output/properties reflects the new settings
            $.each(this.inputGroups, (index, group) => {
                groupEl = $('#input-group-' + group.id, this.$inputGroups);
                topInput = $('input.input-0:first', groupEl);
                bottomInput = $('input.input-1:first', groupEl);

                if(group.lastTarget === 'bottom') {
                    newValue = this.convertValue(group.bottomValue, 'bottom');
                    topInput.val(this.getDisplayedValue(newValue, 'top'));
                    topInput.toggleClass('error', (newValue === false));
                    group.topValue = newValue;
                } else {
                    newValue = this.convertValue(group.topValue, 'top');
                    bottomInput.val(this.getDisplayedValue(newValue, 'bottom'));
                    bottomInput.toggleClass('error', (newValue === false));
                    group.bottomValue = newValue;
                }

                topInput.prop('placeholder', this.getPlaceholder('top'));
                bottomInput.prop('placeholder', this.getPlaceholder('bottom'));
            });

            //propagate changes to the background page
            chrome.runtime.sendMessage({
                type: 'update-options',
                target: 'background',
                data: {}
            });
        },

        open: function(location) {
            if(location === this.currentLocation) {
                return;
            }

            this.currentLocation = location;
            this.$containers.hide();
            this['$' + location + 'Ct'].show();
            this.resize();
        },

        resize: function() {
            var newHeight = this['$' + this.currentLocation + 'Ct'].outerHeight();
            this.$page.height(newHeight);
        },

        indexOfGroup: function(id) {
            var index = -1;

            for(var i = 0; i < this.inputGroups.length; i++) {
                if(this.inputGroups[i].id === id) {
                    index = i;
                    break;
                }
            }

            return index;
        },

        getNextInputGroupId: function() {
            return this.inputGroups.length;
        },

        getGroupId: function(el) {
            return parseInt($(el).closest('div.input-group').prop('id').replace('input-group-', ''), 10);
        },

        createInputGroupEl: function(id, topValue, bottomValue) {
            var html,
                topError = (topValue === false),
                bottomError = (bottomValue === false),
                topText = this.getDisplayedValue(topValue, 'top'),
                bottomText = this.getDisplayedValue(bottomValue, 'bottom'),
                topPlaceholder = this.getPlaceholder('top'),
                bottomPlaceholder = this.getPlaceholder('bottom');

            html = '<div class="input-group" id="input-group-' + id + '">' +
                        '<div class="input-group-field">' +
                            '<input type="text" class="input-group-control input-0' + (topError ? ' error' : '') + '"' +
                                ' placeholder="' + topPlaceholder + '" value="' + topText + '" />'+
                        '</div>' +
                        '<div class="input-group-field">' +
                            '<input type="text" class="input-group-control input-1' + (bottomError ? ' error' : '') + '"' + 
                                ' placeholder="' + bottomPlaceholder + '" value="' + bottomText + '" />' +
                        '</div>' +
                        '<button type="button" class="btn input-group-close-btn" title="Remove input group">&times;</button>' +
                    '</div>';

            return $(html);
        },

        getDisplayedValue: function(value, position) {
            var mode = this.utime.getOption('inputMode'),
                errorText;

            switch(mode) {
                case 'auto':
                    errorText = 'Invalid date or timestamp';
                    break;
                case 'timestamp-date':
                    errorText = (position === 'top') ? 'Invalid date' : 'Invalid timestamp';
                    break;
                case 'date-timestamp':
                    errorText = (position === 'top') ? 'Invalid timestamp' : 'Invalid date';
                    break;
            }

            return value === false ? errorText : (value ? value : '');
        },

        getPlaceholder: function(position) {
            var mode = this.utime.getOption('inputMode'),
                text;

            switch(mode) {
                case 'auto':
                    text = (position === 'top') ? 'Enter a timestamp or date...' : '';
                    break;
                case 'timestamp-date':
                    text = (position === 'top') ? 'Enter a timestamp...' : 'Enter a date...';
                    break;
                case 'date-timestamp':
                    text = (position === 'top') ? 'Enter a date...' : 'Enter a timestamp...';
                    break;
            }

            return text;
        }
    };

    var popup = new Popup();
    return popup.init();
})();