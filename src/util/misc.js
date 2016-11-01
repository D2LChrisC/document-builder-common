const supportedFormats = {
	'pdf': [
		'',
		'.doc', '.docx', '.rtf', '.odt',
		'.ppt', '.pps', '.pptx', '.ppsx', '.odp',
		'.xls', '.xlsx'
	],
	'txt': [
		'', '.doc', '.docx', '.rtf', '.odt'
	]
};

export function isFormatSupported(format, extension) {
	if (!supportedFormats[format]) {
		return false;
	}

	return supportedFormats[format].indexOf(extension) > -1;
}
