'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.isFormatSupported = isFormatSupported;
var supportedFormats = {
	'pdf': ['', '.doc', '.docx', '.rtf', '.odt', '.ppt', '.pps', '.pptx', '.ppsx', '.odp', '.xls', '.xlsx'],
	'txt': ['', '.doc', '.docx', '.rtf', '.odt']
};

function isFormatSupported(format, extension) {
	if (!supportedFormats[format]) {
		return false;
	}

	return supportedFormats[format].indexOf(extension) > -1;
}