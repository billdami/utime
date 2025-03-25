const OFFSCREEN_PATH = 'offscreen.html';

let creatingOffscreenDoc = null;

const extBgPage = (function() {

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
                onclick: this.handleContextMenuClick.bind(this)
            });

            //omnibox event handlers
            chrome.omnibox.onInputChanged.addListener(this.handleOmniboxChange.bind(this));
            chrome.omnibox.onInputEntered.addListener(this.handleOmniboxSubmit.bind(this));

            chrome.omnibox.setDefaultSuggestion({
                description: "Type a timestamp or date then press Enter to convert the value"
            });
            
            //notification event handlers
            chrome.notifications.onButtonClicked.addListener(this.handleNotificationBtnClick.bind(this));
            chrome.notifications.onClosed.addListener(this.handleNotificationClose.bind(this));

            //general message handling
            chrome.runtime.onMessage.addListener(this.handleMessages.bind(this));
            return this;
        },

        handleMessages: async function(message) {
            if (message.target !== 'background') {
                return;
            }
        
            switch (message.type) {
                case 'update-options':
                    await this.utime.loadOptions();
                    break;
                default:
                    console.warn(`Unexpected message type received: '${message.type}'.`);
            }
        },

        handleContextMenuClick: function(info, tab) {
            var input;
            var result;

            input = (info.selectionText || '').trim();

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
        
            text = (text || '').trim();

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

            text = (text || '').trim();

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

        createNotification: async function(result) {
            var showCopyBtn = false;

            if(!result) {
                result = 'This is not a valid date or timestamp.';
            } else {
                result = result.toString();
                showCopyBtn = true;
            }

            const notifId = await chrome.notifications.create('', {
                type: 'basic',
                iconUrl: 'images/icon-80.png',
                title: 'Conversion result',
                message: result,
                buttons: showCopyBtn ? [{title: 'Copy to clipboard'}] : []
            });

            this.notifications[notifId] = result;
        },

        setupOffscreenDocument: async function() {
            const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
            const existing = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT'],
                documentUrls: [offscreenUrl]
            });

            if (existing.length > 0) {
                return;
            }

            if (creatingOffscreenDoc) {
                await creatingOffscreenDoc;
            } else {
                creatingOffscreenDoc = chrome.offscreen.createDocument({
                    url: OFFSCREEN_PATH,
                    reasons: [chrome.offscreen.Reason.CLIPBOARD],
                    justification: 'Write text to the clipboard.'
                });

                await creatingOffscreenDoc;
                creatingOffscreenDoc = null;
            }
        },

        copyToClipboard: async function(value) {
            await this.setupOffscreenDocument();
            chrome.runtime.sendMessage({
                type: 'copy-data-to-clipboard',
                target: 'offscreen-doc',
                data: value
            });
        }
    };

    var bgPage = new BackgroundPage();
    return bgPage.init();
})();