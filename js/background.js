/**
 * background page
 * 
 */
var extBgPage = (function() {

	var BackgroundPage = function() {};

	BackgroundPage.prototype = {
		convertedToken: '=',

		init: function() {
			this.utime = new Utime();
			chrome.omnibox.setDefaultSuggestion({description: "Type a timestamp or date then press Enter to convert the value"});
			chrome.omnibox.onInputChanged.addListener(this.proxy(this.handleOmniboxChange));
			chrome.omnibox.onInputEntered.addListener(this.proxy(this.handleOmniboxSubmit));
			return this;
		},

		handleOmniboxChange: function(text, suggest) {
			var suggestions = [],
				date,
				timestamp;
		
			text = $.trim(text);
			if(text.length > 0) {
				date = this.utime.convertTimestamp(text);
				timestamp = this.utime.convertDate(text);

				if(date !== false) {
					suggestions.push({content: this.convertedToken + date, description: '<match>' + date + '</match> <dim>Date</dim>'});
				}

				if(timestamp !== false) {
					suggestions.push({content: this.convertedToken + timestamp, description: '<match>' + timestamp + '</match> <dim>Timestamp</dim>'});
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

			//@todo show as a desktop notification?
			if(!result) {
				alert('This is not a valid date or timestamp.');
			} else {
				prompt('Converted value:', result);
			}
		},

		proxy: function(fn) {
			return $.proxy(fn, this);
		}
	};

	var bgPage = new BackgroundPage();
	return bgPage.init();
})();