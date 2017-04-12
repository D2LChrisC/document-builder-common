'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.isFormatSupported = isFormatSupported;
var supportedFormats = {
	'pdf': ['', '.doc', '.docx', '.rtf', '.odt', '.ppt', '.pps', '.pptx', '.ppsx', '.odp', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.gif'],
	'html': ['', '.doc', '.docx', '.rtf', '.odt', '.ppt', '.pps', '.pptx', '.ppsx', '.odp', '.xls', '.xlsx']
};

function isFormatSupported(format, extension) {
	if (!supportedFormats[format]) {
		return false;
	}

	return supportedFormats[format].indexOf(extension) > -1;
}