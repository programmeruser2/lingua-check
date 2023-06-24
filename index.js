let languages = [];
async function initialize() {
	// Initialize list of languages
	const languageList = document.querySelector('#language-load');
	let presets = await fetch('presets.json').then(res => res.json());
	let custom = (await localforage.getItem('customPresets')) || [];
	languages = languages.concat(presets, custom);
	for (const [index, language] of languages.entries()) {
		const option = document.createElement('option');
		option.text = language.name;
		option.value = index;
		languageList.add(option);
	}
}

async function main() {
	await initialize();
}
main();


