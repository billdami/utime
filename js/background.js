/**
 * background page
 * 
 */
var extBgPage = (function() {

    var BackgroundPage = function() {
        this.notifications = {};
    };

    BackgroundPage.prototype = {
        convertedToken: '=',

        init: function() {
            this.utime = new Utime();

            //context/right-click menu
            this.cxtMenu = chrome.contextMenus.create({
                type: 'normal',
                id: 'utime-context-convert',
                title: 'Convert with Utime',
                contexts: ['selection'],
                onclick: this.proxy(this.handleContextMenuClick)
            });

            //omnibox event handlers
            chrome.omnibox.onInputChanged.addListener(this.proxy(this.handleOmniboxChange));
            chrome.omnibox.onInputEntered.addListener(this.proxy(this.handleOmniboxSubmit));

            chrome.omnibox.setDefaultSuggestion({
                description: "Type a timestamp or date then press Enter to convert the value"
            });
            
            //notification event handlers
            chrome.notifications.onButtonClicked.addListener(this.proxy(this.handleNotificationBtnClick));
            chrome.notifications.onClosed.addListener(this.proxy(this.handleNotificationClose));
            return this;
        },

        handleContextMenuClick: function(info, tab) {
            var input;
            var result;

            input = $.trim(info.selectionText);

            if(input.length < 1) {
                return;
            }

            result = this.utime.convertInput(input);
            this.createNotification(result);
        },

        handleOmniboxChange: function(text, suggest) {
            var suggestions = [];
            var date;
            var timestamp;
        
            text = $.trim(text);
            if(text.length > 0) {
                date = this.utime.convertTimestamp(text);
                timestamp = this.utime.convertDate(text);

                if(date !== false) {
                    suggestions.push({
                        content: this.convertedToken + date, 
                        description: '<match>' + date + '</match> <dim>Date</dim>'
                    });
                }

                if(timestamp !== false) {
                    suggestions.push({
                        content: this.convertedToken + timestamp, 
                        description: '<match>' + timestamp + '</match> <dim>Timestamp</dim>'
                    });
                }
            }

            suggest(suggestions);
        },

        handleOmniboxSubmit: function(text) {
            var result;

            text = $.trim(text);
            if(text.length < 1) {
                return;
            }

            if(text.substr(0, 1) !== this.convertedToken) {
                result = this.utime.convertInput(text);
            } else {
                result = text.substr(1);
            }

            this.createNotification(result);
        },

        handleNotificationBtnClick: function(notifId, btnIndex) {
            //copy to clipboard button
            if(btnIndex === 0 && typeof this.notifications[notifId] === 'string') {
                this.copyToClipboard(this.notifications[notifId]);
            }
        },

        handleNotificationClose: function(notifId) {
            //delete the stored notification value once it has been closed
            delete this.notifications[notifId];
        },

        createNotification: function(result) {
            var showCopyBtn = false;

            if(!result) {
                result = 'This is not a valid date or timestamp.';
            } else {
                result = result.toString();
                showCopyBtn = true;
            }

            chrome.notifications.create('', {
                type: 'basic',
                iconUrl: 'images/icon-80.png',
                title: 'Conversion result',
                message: result,
                buttons: showCopyBtn ? [{title: 'Copy to clipboard'}] : []
            }, this.proxy(function(notifId) {
                this.notifications[notifId] = result;
            }));
        },

        copyToClipboard: function(content) {
            var textarea = $('#clipboard-proxy');
            textarea.val(content);
            textarea.select();
            document.execCommand('copy');
            textarea.val('');
        },

        proxy: function(fn) {
            return $.proxy(fn, this);
        }
    };

    var bgPage = new BackgroundPage();
    return bgPage.init();
})();